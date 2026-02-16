from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
import base64
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
import httpx
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
GENERATED_DIR = ROOT_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT config
JWT_SECRET = "adoperator_jwt_secret_2024_xK9mP2"
JWT_ALGORITHM = "HS256"

# LLM config
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# --- Pydantic Models ---

class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ProductInput(BaseModel):
    nome: str
    nicho: str
    promessa_principal: str
    publico_alvo: Optional[str] = ""
    beneficios: Optional[str] = ""
    ingredientes_mecanismo: Optional[str] = ""
    tom: Optional[str] = ""

# --- Compliance Checker ---

RISKY_TERMS = {
    "cura": "Use 'auxilia no tratamento' ou 'contribui para melhora'",
    "curar": "Use 'auxiliar no tratamento'",
    "elimina": "Use 'ajuda a reduzir' ou 'contribui para diminuir'",
    "remove": "Use 'auxilia na reducao' ou 'contribui para minimizar'",
    "100%": "Evite porcentagens absolutas. Use 'alta eficacia'",
    "garantido": "Use 'resultados comprovados' ou 'alta satisfacao'",
    "garantia de resultado": "Use 'compromisso com qualidade'",
    "comprovado cientificamente": "Cite a fonte ou use 'baseado em estudos'",
    "medicos recomendam": "Cite a fonte ou use 'profissionais reconhecem'",
    "definitivo": "Use 'duradouro' ou 'de longo prazo'",
    "milagroso": "Evite. Use termos mais moderados",
    "revolucionario": "Use 'inovador' ou 'avancado'",
    "unico no mercado": "Use 'diferenciado' ou 'com tecnologia propria'",
    "sem efeitos colaterais": "Use 'bem tolerado' ou 'perfil de seguranca favoravel'",
    "aprovado pela anvisa": "Cite o registro se verdadeiro",
    "acabar com": "Use 'ajudar a reduzir' ou 'minimizar'",
    "destruir": "Use 'combater' ou 'enfrentar'",
    "nunca mais": "Evite promessas absolutas de permanencia",
    "para sempre": "Use 'de longo prazo' ou 'duradouro'",
}

HIGH_SEVERITY = {"cura", "curar", "100%", "garantido", "milagroso", "sem efeitos colaterais", "nunca mais", "para sempre"}

def run_compliance_check(text: str) -> dict:
    text_lower = text.lower()
    risks = []
    for term, suggestion in RISKY_TERMS.items():
        if term.lower() in text_lower:
            risks.append({
                "termo": term,
                "sugestao": suggestion,
                "severidade": "alta" if term in HIGH_SEVERITY else "media"
            })
    score = max(0, 100 - len(risks) * 15)
    return {"riscos": risks, "score": score, "total_riscos": len(risks)}

# --- Auth Helpers ---

def create_token(user_id: str, email: str):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

LANGUAGE_INSTRUCTIONS = {
    "en": "\n\nIMPORTANT: Respond entirely in ENGLISH. All text values in the JSON must be in English.",
    "es": "\n\nIMPORTANTE: Responde completamente en ESPAÑOL. Todos los valores de texto en el JSON deben ser en español.",
    "pt": "",
}

# --- AI Helper ---

async def call_claude(system_message: str, user_text: str, session_id: str, lang: str = "pt"):
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(lang, "")
    full_system = system_message + lang_instruction

    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=session_id,
        system_message=full_system
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    response = await chat.send_message(UserMessage(text=user_text))

    text = response.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r'\{[\s\S]*\}', text)
        if match:
            return json.loads(match.group())
        logger.error(f"Failed to parse JSON from Claude response: {text[:200]}")
        raise HTTPException(status_code=500, detail="Erro ao processar resposta da IA")

# --- Auth Endpoints ---

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    token = create_token(user_id, data.email)
    return {"token": token, "user": {"id": user_id, "name": data.name, "email": data.email}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not bcrypt.checkpw(data.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {"id": user["id"], "name": user["name"], "email": user["email"]}

# --- Analysis CRUD ---

@api_router.post("/analyses")
async def create_analysis(product: ProductInput, user=Depends(get_current_user)):
    analysis_id = str(uuid.uuid4())
    doc = {
        "id": analysis_id,
        "user_id": user["id"],
        "product": product.model_dump(),
        "strategic_analysis": None,
        "ad_variations": None,
        "audience_simulation": None,
        "decision": None,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.analyses.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/analyses")
async def list_analyses(user=Depends(get_current_user)):
    analyses = await db.analyses.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return analyses

@api_router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]},
        {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    return analysis

# --- Compliance & Sharing Endpoints ---

class CompetitorURLInput(BaseModel):
    url: str

class CreativeGenerationInput(BaseModel):
    analysis_id: str
    prompt: Optional[str] = ""
    provider: str  # "nano_banana" | "gpt_image" | "claude_text" | "sora_video"
    video_size: Optional[str] = "1280x720"
    video_duration: Optional[int] = 4

class PushSubscriptionInput(BaseModel):
    endpoint: str
    keys: dict

class ComplianceCheckInput(BaseModel):
    text: str

@api_router.post("/compliance/check")
async def check_compliance_endpoint(data: ComplianceCheckInput):
    return run_compliance_check(data.text)

@api_router.delete("/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str, user=Depends(get_current_user)):
    result = await db.analyses.delete_one({"id": analysis_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    return {"success": True}

@api_router.patch("/analyses/{analysis_id}/product")
async def update_analysis_product(analysis_id: str, product: ProductInput, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"product": product.model_dump()}}
    )
    return {"success": True}

@api_router.post("/analyses/{analysis_id}/share")
async def share_analysis(analysis_id: str, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    public_token = analysis.get("public_token")
    if not public_token:
        public_token = str(uuid.uuid4())[:12]
        await db.analyses.update_one(
            {"id": analysis_id},
            {"$set": {"public_token": public_token}}
        )
    return {"public_token": public_token}

@api_router.get("/public/{token}")
async def get_public_analysis(token: str):
    analysis = await db.analyses.find_one({"public_token": token}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    analysis.pop("user_id", None)
    return analysis

# --- Web Scraping & Text Analysis Utilities ---

HOOK_PATTERNS = {
    "pergunta": ["?", "você sabe", "já pensou", "por que", "como"],
    "historia": ["eu", "minha", "descobri", "quando", "lembro", "história"],
    "lista": ["3 ", "5 ", "7 ", "10 ", "passo", "dica", "motivo"],
    "prova_social": ["milhares", "pessoas", "resultado", "depoimento", "cliente", "vendido"],
    "mecanismo": ["funciona", "método", "sistema", "tecnologia", "fórmula", "segredo"],
    "choque": ["pare", "cuidado", "perigo", "alerta", "nunca", "erro", "mentira"],
}

BLOCK_RISK_TERMS = [
    "cura", "curar", "100%", "garantido", "milagroso", "elimina",
    "sem efeitos colaterais", "nunca mais", "para sempre", "definitivo",
    "comprovado cientificamente", "médicos recomendam", "aprovado pela anvisa",
]

def classify_hook_type(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for hook_type, keywords in HOOK_PATTERNS.items():
        scores[hook_type] = sum(1 for k in keywords if k in text_lower)
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "direto"

def detect_block_risk(text: str) -> dict:
    text_lower = text.lower()
    found = [t for t in BLOCK_RISK_TERMS if t in text_lower]
    if len(found) >= 3:
        level = "alto"
    elif len(found) >= 1:
        level = "medio"
    else:
        level = "baixo"
    return {"level": level, "terms": found}

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'}

PROTECTED_DOMAINS = ['facebook.com', 'fb.com', 'instagram.com', 'tiktok.com', 'linkedin.com']

def is_image_url(url: str) -> bool:
    from urllib.parse import urlparse
    path = urlparse(url).path.lower()
    return any(path.endswith(ext) for ext in IMAGE_EXTENSIONS)

def is_protected_domain(url: str) -> bool:
    from urllib.parse import urlparse
    hostname = urlparse(url).hostname or ""
    return any(d in hostname for d in PROTECTED_DOMAINS)

async def scrape_url(url: str) -> dict:
    # If it's a direct image URL, return minimal data for AI analysis
    if is_image_url(url):
        return {
            "url": url,
            "title": "",
            "meta_description": "",
            "headings": [],
            "paragraphs": [],
            "buttons_ctas": [],
            "images": [{"src": url, "alt": ""}],
            "hook_type_detected": "direto",
            "block_risk": {"level": "desconhecido", "terms": []},
            "text_length": 0,
            "full_text_preview": "",
            "is_image_url": True,
        }

    # If it's a protected domain (Facebook, Instagram, etc.), use AI-based analysis
    if is_protected_domain(url):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(url)
        path_parts = parsed.path.strip("/").split("/")
        query = parse_qs(parsed.query)
        context_hints = []
        if "ads/library" in url or "ad_library" in url:
            context_hints.append("Facebook Ad Library")
        if query.get("id"):
            context_hints.append(f"Ad ID: {query['id'][0]}")
        if path_parts:
            context_hints.append(f"Path: {'/'.join(path_parts[:3])}")

        return {
            "url": url,
            "title": f"Anúncio em {parsed.hostname}",
            "meta_description": " | ".join(context_hints) if context_hints else f"Conteúdo protegido de {parsed.hostname}",
            "headings": [],
            "paragraphs": [f"URL de plataforma protegida ({parsed.hostname}). Conteúdo não pode ser raspado diretamente. Análise baseada nos metadados da URL e conhecimento do mercado."],
            "buttons_ctas": [],
            "images": [],
            "hook_type_detected": "direto",
            "block_risk": {"level": "desconhecido", "terms": []},
            "text_length": 0,
            "full_text_preview": f"URL protegida: {url}. " + " | ".join(context_hints),
            "is_protected": True,
        }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http_client:
            resp = await http_client.get(url, headers=headers)
            resp.raise_for_status()
    except Exception as e:
        logger.error(f"Scrape failed for {url}: {e}")
        raise HTTPException(status_code=400, detail=f"Não foi possível acessar a URL: {str(e)}")

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "iframe"]):
        tag.decompose()

    title = soup.title.string.strip() if soup.title and soup.title.string else ""
    meta_desc = ""
    meta_tag = soup.find("meta", attrs={"name": "description"})
    if meta_tag and meta_tag.get("content"):
        meta_desc = meta_tag["content"]

    headings = [h.get_text(strip=True) for h in soup.find_all(["h1", "h2", "h3"]) if h.get_text(strip=True)]
    paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 20]
    buttons = [b.get_text(strip=True) for b in soup.find_all(["button", "a"]) if b.get_text(strip=True) and len(b.get_text(strip=True)) < 80]

    images = []
    for img in soup.find_all("img", src=True)[:10]:
        src = img["src"]
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            from urllib.parse import urlparse
            parsed = urlparse(url)
            src = f"{parsed.scheme}://{parsed.netloc}{src}"
        images.append({"src": src, "alt": img.get("alt", "")})

    full_text = " ".join([title, meta_desc] + headings[:5] + paragraphs[:15])
    hook_type = classify_hook_type(full_text)
    block_risk = detect_block_risk(full_text)

    return {
        "url": url,
        "title": title,
        "meta_description": meta_desc,
        "headings": headings[:10],
        "paragraphs": paragraphs[:20],
        "buttons_ctas": [b for b in buttons if any(w in b.lower() for w in ["comprar", "saiba", "quero", "garanta", "agora", "teste", "grátis", "free", "clique", "acesse", "cadastr", "inscreva", "baixe"])][:8] or buttons[:5],
        "images": images,
        "hook_type_detected": hook_type,
        "block_risk": block_risk,
        "text_length": len(full_text),
        "full_text_preview": full_text[:3000],
    }

# --- AI Pipeline Endpoints ---

@api_router.post("/analyses/{analysis_id}/parse")
async def parse_strategy(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]

    system_msg = """Você é um estrategista de marketing direto e tráfego pago com 15 anos de experiência.
Analise o produto a seguir e retorne APENAS um JSON válido (sem markdown, sem explicação extra) com esta estrutura exata:
{
  "nivel_consciencia": "string - nível de consciência do público (inconsciente, consciente do problema, consciente da solução, consciente do produto, totalmente consciente)",
  "dor_central": "string - a dor principal que o público sente",
  "objecoes": ["string - lista de 3-5 objeções prováveis do público"],
  "angulo_venda": "string - o ângulo de venda mais forte para este produto",
  "big_idea": "string - a grande ideia que diferencia este produto",
  "mecanismo_percebido": "string - como o público percebe que o produto funciona"
}
Retorne SOMENTE o JSON, nada mais."""

    user_text = f"""Produto: {product['nome']}
Nicho: {product['nicho']}
Promessa principal: {product['promessa_principal']}"""
    if product.get('publico_alvo'):
        user_text += f"\nPúblico-alvo: {product['publico_alvo']}"
    if product.get('beneficios'):
        user_text += f"\nBenefícios: {product['beneficios']}"
    if product.get('ingredientes_mecanismo'):
        user_text += f"\nIngredientes/Mecanismo: {product['ingredientes_mecanismo']}"
    if product.get('tom'):
        user_text += f"\nTom desejado: {product['tom']}"

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"parse-{analysis_id}", lang)

    # Run compliance check on product text
    all_text = " ".join([v for v in product.values() if isinstance(v, str) and v])
    compliance = run_compliance_check(all_text)
    result["compliance"] = compliance

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"strategic_analysis": result, "status": "parsed"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/generate")
async def generate_ads(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]
    strategy = analysis.get("strategic_analysis")
    if not strategy:
        raise HTTPException(status_code=400, detail="Execute a análise estratégica primeiro")

    system_msg = """Você é um copywriter estrategista de performance para tráfego pago.
Crie 3 variações de anúncios ESTRUTURALMENTE DIFERENTES como um EXPERIMENTO CONTROLADO.

REGRA CRÍTICA DE DIVERSIDADE:
- Variação 1: HISTÓRIA PESSOAL — narrativa de descoberta, conexão emocional
- Variação 2: DESCOBERTA INESPERADA — dado surpreendente, quebra de padrão
- Variação 3: ATAQUE AO ERRO COMUM — provocação direta, confronto de crença

Se os 3 anúncios parecerem variações do mesmo texto com palavras diferentes, o experimento falha.

Retorne APENAS JSON válido (sem markdown):
{
  "nota_experimental": "Não avaliamos anúncios por estética, e sim por reação provável do público.",
  "anuncios": [
    {
      "numero": 1,
      "hipotese": "string curta (ex: Curiosidade, Identificação, Autoridade)",
      "objetivo": "string - o que tenta provocar no público (ex: gerar clique sem julgamento inicial)",
      "estrategia": "string - mecanismo psicológico (ex: abrir loop cognitivo)",
      "publico_indicado": "string - tipo de público ideal (ex: Público frio - Baixa consciência do problema)",
      "hook": "string - gancho de abertura impactante",
      "copy": "string - copy curta e persuasiva (3-5 frases)",
      "roteiro_ugc": "string - roteiro para vídeo UGC (5-8 passos)",
      "abordagem_estrutural": "string - História pessoal / Descoberta inesperada / Ataque ao erro comum",
      "pontos_fortes": ["2-3 pontos fortes concretos"],
      "pontos_fracos": ["1-2 pontos fracos honestos"],
      "metricas_preditivas": {
        "ctr_estimado": "string range (ex: 2.8-3.5%)",
        "nivel_curiosidade": "Baixo/Médio/Alto",
        "risco_bloqueio": "Baixo/Médio/Alto",
        "probabilidade_conversao": "Baixa/Média/Alta"
      }
    }
  ]
}
Retorne SOMENTE o JSON."""

    user_text = f"""PRODUTO:
Nome: {product['nome']}
Nicho: {product['nicho']}
Promessa: {product['promessa_principal']}"""
    if product.get('publico_alvo'):
        user_text += f"\nPúblico: {product['publico_alvo']}"
    if product.get('beneficios'):
        user_text += f"\nBenefícios: {product['beneficios']}"
    if product.get('ingredientes_mecanismo'):
        user_text += f"\nMecanismo: {product['ingredientes_mecanismo']}"
    user_text += f"""

ANÁLISE ESTRATÉGICA:
Nível de consciência: {strategy.get('nivel_consciencia', '')}
Dor central: {strategy.get('dor_central', '')}
Objeções: {json.dumps(strategy.get('objecoes', []), ensure_ascii=False)}
Ângulo de venda: {strategy.get('angulo_venda', '')}
Big idea: {strategy.get('big_idea', '')}
Mecanismo percebido: {strategy.get('mecanismo_percebido', '')}"""

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"generate-{analysis_id}", lang)

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"ad_variations": result, "status": "generated"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/simulate")
async def simulate_audience(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    ads = analysis.get("ad_variations")
    if not ads:
        raise HTTPException(status_code=400, detail="Gere os anúncios primeiro")

    system_msg = """Você simula COMPORTAMENTO HUMANO real de 4 perfis reagindo a anúncios.

Perfis:
1. Cético — questiona tudo, teve experiências ruins com promessas online
2. Interessado — busca soluções ativamente, aberto mas cauteloso
3. Impulsivo — age por emoção, decide em segundos
4. Desconfiado — já foi enganado, filtra tudo com ceticismo alto

REGRA CRÍTICA: Simule COMPORTAMENTO, não análise.
- Humanos reagem emocionalmente PRIMEIRO, depois justificam
- A decisão já foi tomada antes da "análise"
- DEVE haver CONFLITO entre perfis (nem todos concordam)
- Impulsivo e Cético devem DIVERGIR frequentemente
- Interessado deve HESITAR, não decidir rápido
- Métricas são CONSEQUÊNCIA da reação, não o centro

Para CADA anúncio, CADA perfil deve ter 4 CAMADAS de reação.
Retorne APENAS JSON válido (sem markdown):
{
  "simulacao": [
    {
      "anuncio_numero": 1,
      "reacoes": [
        {
          "perfil": "Cético",
          "reacao_emocional": "string - primeira reação instintiva, curta, humana (ex: 'parece propaganda comum, eu ignoraria')",
          "pensamento_2s": "string - o que pensa 2 segundos depois (ex: 'mas espera... nunca vi isso abordado assim')",
          "decisao_provavel": "string - ignorar / clicar / salvar / investigar",
          "o_que_faria_clicar": "string - o que faria ESTE perfil clicar (ex: 'precisaria ver prova visual')",
          "interesse": 45,
          "clareza": 60,
          "confianca": 30,
          "probabilidade_clique": 25
        }
      ]
    }
  ],
  "tendencia_geral": "string - padrão detectado (ex: 'anúncios baseados em curiosidade superam promessa direta neste nicho')",
  "conflitos_detectados": "string - onde perfis divergem (ex: 'impulsivo e cético divergem fortemente na variação A — sinal de copy polarizante')"
}
Retorne SOMENTE o JSON."""

    ads_text = json.dumps(ads, ensure_ascii=False)
    user_text = f"Analise os seguintes anúncios e simule as reações dos 4 perfis para cada um:\n\n{ads_text}"

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"simulate-{analysis_id}", lang)

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"audience_simulation": result, "status": "simulated"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/decide")
async def decide_winner(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    simulation = analysis.get("audience_simulation")
    ads = analysis.get("ad_variations")
    if not simulation or not ads:
        raise HTTPException(status_code=400, detail="Execute a simulação primeiro")

    system_msg = """Você é um motor de decisão que ASSUME RESPONSABILIDADE pela escolha.
Você NÃO apresenta comparativo. Você DECIDE e EXPLICA com causalidade humana.

REGRA: Veredito PRIMEIRO. Dados DEPOIS.
O usuário nunca deve precisar interpretar números para saber qual venceu.

Use CAUSALIDADE HUMANA:
ERRADO: "apresentou melhor equilíbrio entre métricas"
CERTO: "vence porque cria curiosidade antes da avaliação lógica — reduz rejeição inicial"

Retorne APENAS JSON válido (sem markdown):
{
  "veredito": {
    "anuncio_numero": 1,
    "pontuacao_final": 85.5,
    "frase_principal": "string - frase de impacto (ex: Maior chance de gerar clique inicial em público frio)",
    "explicacao_causal": "string - explicação com causalidade humana, NÃO relatório técnico",
    "hook": "hook completo do vencedor",
    "copy": "copy completa do vencedor",
    "roteiro_ugc": "roteiro UGC completo do vencedor"
  },
  "consequencias_outras": [
    {
      "anuncio_numero": 2,
      "consequencia": "string - o que acontece se usar este (ex: tende a aumentar o custo por clique)"
    }
  ],
  "investimento_recomendacao": "string - Se estivesse investindo R$2.000 hoje, usaria qual e por quê (responder com convicção)",
  "proximo_passo": {
    "acao": "string - próxima ação recomendada (ex: criar página baseada neste anúncio)",
    "motivo": "string - por que fazer isso (ex: manter consistência narrativa aumenta conversão)"
  },
  "melhorias_possiveis": ["string - 3 ações de melhoria concretas (ex: adaptar para público quente, reduzir promessa direta, testar prova visual)"],
  "fraquezas": ["string - 2-3 fraquezas honestas do vencedor"],
  "sugestao_melhoria": "string - melhoria específica prioritária",
  "estrutura_lp": {
    "headline": "string",
    "subheadline": "string",
    "secoes": ["string - 4-6 seções"]
  },
  "publico_compativel": "string - público ideal detalhado",
  "ranking": [
    {"anuncio_numero": 1, "pontuacao": 85.5}
  ]
}
Retorne SOMENTE o JSON."""

    user_text = f"""ANÚNCIOS:
{json.dumps(ads, ensure_ascii=False)}

SIMULAÇÃO DE PÚBLICO:
{json.dumps(simulation, ensure_ascii=False)}"""

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"decide-{analysis_id}", lang)

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"decision": result, "status": "completed"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/improve")
async def improve_analysis(analysis_id: str, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Analise nao encontrada")
    if not analysis.get("decision"):
        raise HTTPException(status_code=400, detail="Complete a analise primeiro")

    new_id = str(uuid.uuid4())
    doc = {
        "id": new_id,
        "user_id": user["id"],
        "product": analysis["product"],
        "strategic_analysis": None,
        "ad_variations": None,
        "audience_simulation": None,
        "decision": None,
        "status": "created",
        "parent_id": analysis_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.analyses.insert_one(doc)
    doc.pop("_id", None)
    return doc

# --- Market Comparison Endpoint ---

@api_router.post("/analyses/{analysis_id}/market-compare")
async def market_compare(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]
    strategy = analysis.get("strategic_analysis")
    decision = analysis.get("decision")
    ads = analysis.get("ad_variations")

    if not strategy:
        raise HTTPException(status_code=400, detail="Execute a análise estratégica primeiro")

    user_hook = ""
    user_copy = ""
    if decision:
        v = decision.get("veredito") or decision.get("vencedor") or {}
        user_hook = v.get("hook", "")
        user_copy = v.get("copy", "")
    elif ads and ads.get("anuncios"):
        user_hook = ads["anuncios"][0].get("hook", "")
        user_copy = ads["anuncios"][0].get("copy", "")

    system_msg = """Você é um analista de inteligência de mercado especializado em tráfego pago e anúncios digitais.
Sua tarefa é analisar o mercado do nicho do produto e gerar uma comparação realista com a estratégia do usuário.

Baseie-se no seu conhecimento sobre padrões reais de anúncios no mercado brasileiro de tráfego pago.

Retorne APENAS JSON válido (sem markdown):
{
  "anuncios_mercado": [
    {
      "titulo": "string - nome descritivo do padrão de anúncio",
      "texto_exemplo": "string - texto exemplo realista de anúncio do mercado",
      "tipo_hook": "pergunta | historia | lista | prova_social | mecanismo | choque",
      "status": "ativo",
      "persistencia_estimada": "string - ex: 30+ dias (indica que funciona)",
      "risco_bloqueio": "baixo | medio | alto",
      "promessa": "string - promessa central do anúncio",
      "cta": "string - call to action usado",
      "psicologia": "string - mecanismo psicológico principal"
    }
  ],
  "padroes_dominantes": [
    {
      "padrao": "string - nome do padrão",
      "frequencia": "string - ex: presente em 60% dos anúncios",
      "descricao": "string - como esse padrão funciona",
      "exemplo": "string - exemplo concreto"
    }
  ],
  "anuncios_persistentes": [
    {
      "descricao": "string - tipo de anúncio que permanece ativo por mais tempo",
      "duracao_estimada": "string - ex: 45+ dias",
      "motivo_persistencia": "string - por que continua rodando"
    }
  ],
  "comparativo_usuario": {
    "como_mercado_vende": "string - resumo de como o mercado vende neste nicho",
    "onde_usuario_difere": "string - principais diferenças da estratégia do usuário",
    "vantagem_competitiva": "string - onde o usuário tem vantagem sobre o mercado",
    "risco_generico": "string - onde o usuário pode parecer genérico",
    "recomendacao_pratica": "string - ação prática baseada na análise"
  },
  "hooks_por_tipo": {
    "pergunta": "number - porcentagem estimada",
    "historia": "number",
    "lista": "number",
    "prova_social": "number",
    "mecanismo": "number",
    "choque": "number"
  }
}
Retorne SOMENTE o JSON."""

    user_text = f"""PRODUTO DO USUÁRIO:
Nome: {product['nome']}
Nicho: {product['nicho']}
Promessa: {product['promessa_principal']}
Público-alvo: {product.get('publico_alvo', 'Não especificado')}

ESTRATÉGIA ATUAL DO USUÁRIO:
Nível de consciência: {strategy.get('nivel_consciencia', '')}
Dor central: {strategy.get('dor_central', '')}
Ângulo de venda: {strategy.get('angulo_venda', '')}
Big idea: {strategy.get('big_idea', '')}

ANÚNCIO ATUAL DO USUÁRIO:
Hook: {user_hook}
Copy: {user_copy}

Analise o mercado deste nicho e compare com a estratégia do usuário. Gere 5-7 exemplos de anúncios típicos do mercado."""

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"market-{analysis_id}", lang)

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"market_comparison": result}}
    )
    return result

# --- Competitor Analysis Endpoint ---

@api_router.post("/competitor/analyze")
async def analyze_competitor(data: CompetitorURLInput, request: Request, user=Depends(get_current_user)):
    scraped = await scrape_url(data.url)

    is_img = scraped.get("is_image_url", False)
    is_protected = scraped.get("is_protected", False)

    if is_img:
        system_msg = """Você é um analista estratégico de anúncios digitais.
O usuário forneceu uma URL direta para uma imagem de anúncio de um concorrente. Com base no URL e no contexto do mercado, gere uma análise estratégica baseada no que esse tipo de criativo visual provavelmente comunica.

Retorne APENAS JSON válido (sem markdown):
{
  "analise": {
    "tipo_abertura": "string - tipo provável de abertura visual",
    "promessa": "string - promessa provável baseada no formato visual",
    "mecanismo": "string - mecanismo provável",
    "prova": "string - tipo de prova provável",
    "cta": "string - CTA provável",
    "psicologia_utilizada": "string - técnicas visuais prováveis",
    "risco_bloqueio": "baixo | medio | alto",
    "formato_visual": "imagem estática"
  },
  "interpretacao": {
    "o_que_tenta_fazer": "string",
    "por_que_pode_funcionar": "string",
    "onde_perde_forca": "string",
    "como_superar": "string"
  },
  "dados_coletados": {
    "titulo_pagina": "Imagem de anúncio",
    "hook_principal": "string - gancho visual provável",
    "tipo_hook": "direto",
    "ctas_encontrados": [],
    "elementos_persuasao": ["string"],
    "palavras_chave": ["string"]
  }
}
Retorne SOMENTE o JSON."""
        content_text = f"URL da imagem de anúncio do concorrente: {data.url}\nAnalise o que esse tipo de criativo visual provavelmente comunica no mercado de anúncios digitais."

    elif is_protected:
        system_msg = """Você é um analista estratégico de anúncios digitais.
O usuário forneceu uma URL de uma plataforma protegida (como Facebook Ads Library, Instagram, etc.) que não pode ser raspada diretamente.
Com base na URL, nos metadados disponíveis e no seu conhecimento sobre padrões de anúncios nessas plataformas, gere a melhor análise estratégica possível.

Retorne APENAS JSON válido (sem markdown):
{
  "analise": {
    "tipo_abertura": "string",
    "promessa": "string",
    "mecanismo": "string",
    "prova": "string",
    "cta": "string",
    "psicologia_utilizada": "string",
    "risco_bloqueio": "baixo | medio | alto",
    "formato_visual": "string"
  },
  "interpretacao": {
    "o_que_tenta_fazer": "string",
    "por_que_pode_funcionar": "string",
    "onde_perde_forca": "string",
    "como_superar": "string"
  },
  "dados_coletados": {
    "titulo_pagina": "string",
    "hook_principal": "string",
    "tipo_hook": "pergunta | historia | lista | prova_social | mecanismo | choque",
    "ctas_encontrados": ["strings"],
    "elementos_persuasao": ["strings"],
    "palavras_chave": ["strings"]
  }
}
Retorne SOMENTE o JSON."""
        content_text = f"""URL protegida: {scraped['url']}
Plataforma: {scraped['title']}
Contexto: {scraped['meta_description']}
Informações disponíveis: {scraped['full_text_preview']}

Faça a melhor análise possível com base nos metadados da URL e seu conhecimento sobre anúncios nessa plataforma."""

    else:
        system_msg = """Você é um analista estratégico de anúncios digitais.
Analise o conteúdo desta página/anúncio de um concorrente e extraia uma análise estratégica completa.

Retorne APENAS JSON válido (sem markdown):
{
  "analise": {
    "tipo_abertura": "string - como o anúncio/página abre (pergunta, história, choque, dados, etc.)",
    "promessa": "string - promessa central feita ao visitante",
    "mecanismo": "string - como o produto/serviço afirma funcionar",
    "prova": "string - que tipo de prova social ou evidência é usada",
    "cta": "string - call to action principal",
    "psicologia_utilizada": "string - técnicas psicológicas identificadas (escassez, autoridade, etc.)",
    "risco_bloqueio": "baixo | medio | alto",
    "formato_visual": "string - descrição do formato visual (vídeo, imagem, texto longo, etc.)"
  },
  "interpretacao": {
    "o_que_tenta_fazer": "string - objetivo real do anúncio/página",
    "por_que_pode_funcionar": "string - pontos fortes da abordagem",
    "onde_perde_forca": "string - fraquezas identificadas",
    "como_superar": "string - estratégia para criar algo superior"
  },
  "dados_coletados": {
    "titulo_pagina": "string",
    "hook_principal": "string - gancho principal identificado",
    "tipo_hook": "pergunta | historia | lista | prova_social | mecanismo | choque",
    "ctas_encontrados": ["strings"],
    "elementos_persuasao": ["strings - elementos de persuasão encontrados"],
    "palavras_chave": ["strings - 5-10 palavras-chave do conteúdo"]
  }
}
Retorne SOMENTE o JSON."""

        content_text = f"""URL: {scraped['url']}
Título: {scraped['title']}
Meta Description: {scraped['meta_description']}

HEADINGS:
{chr(10).join(scraped['headings'][:8])}

CONTEÚDO PRINCIPAL:
{chr(10).join(scraped['paragraphs'][:15])}

CTAs/BOTÕES ENCONTRADOS:
{', '.join(scraped['buttons_ctas'][:10])}

TIPO DE HOOK DETECTADO (automático): {scraped['hook_type_detected']}
RISCO DE BLOQUEIO (automático): {scraped['block_risk']['level']} - termos: {', '.join(scraped['block_risk']['terms'][:5])}"""

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, content_text, f"competitor-{uuid.uuid4()}", lang)

    source_type = "image" if is_img else ("protected" if is_protected else "webpage")
    result["scraping_data"] = {
        "url": scraped["url"],
        "hook_type_auto": scraped["hook_type_detected"],
        "block_risk_auto": scraped["block_risk"],
        "images_found": len(scraped["images"]),
        "source_type": source_type,
    }

    comp_id = str(uuid.uuid4())
    doc = {
        "id": comp_id,
        "user_id": user["id"],
        "url": data.url,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.competitor_analyses.insert_one(doc)

    return {"id": comp_id, **result}

@api_router.get("/competitor/analyses")
async def list_competitor_analyses(user=Depends(get_current_user)):
    items = await db.competitor_analyses.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items

# --- Radar de Tendências Endpoint ---

@api_router.post("/radar/generate")
async def generate_radar(request: Request, user=Depends(get_current_user)):
    analyses = await db.analyses.find(
        {"user_id": user["id"], "status": "completed"}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    if not analyses:
        raise HTTPException(status_code=400, detail="Você precisa de pelo menos uma análise concluída para gerar o radar")

    niches = list(set(a["product"]["nicho"] for a in analyses if a.get("product", {}).get("nicho")))
    products = [a["product"]["nome"] for a in analyses[:5]]
    strategies = []
    for a in analyses[:5]:
        s = a.get("strategic_analysis", {})
        d = a.get("decision", {})
        v = d.get("veredito") or d.get("vencedor") or {}
        strategies.append({
            "produto": a["product"]["nome"],
            "nicho": a["product"]["nicho"],
            "angulo": s.get("angulo_venda", ""),
            "big_idea": s.get("big_idea", ""),
            "hook_vencedor": v.get("hook", ""),
            "fraquezas": d.get("fraquezas", []),
        })

    market_data = []
    for a in analyses[:3]:
        mc = a.get("market_comparison")
        if mc:
            market_data.append(mc.get("comparativo_usuario", {}))

    lang = request.headers.get("x-language", "pt")

    system_msg = """Você é um consultor estratégico de tráfego pago que gera briefings semanais de tendências.
Analise os dados acumulados do usuário (análises, estratégias, nichos) e gere um radar de tendências.

Retorne APENAS JSON válido (sem markdown):
{
  "resumo": "string - resumo executivo em 2-3 frases do estado atual do mercado do usuário",
  "mudancas_mercado": [
    {
      "mudanca": "string - o que mudou ou está mudando",
      "impacto": "positivo | negativo | neutro",
      "recomendacao": "string - o que fazer a respeito"
    }
  ],
  "padroes_emergentes": [
    {
      "padrao": "string - padrão identificado",
      "relevancia": "alta | media | baixa",
      "descricao": "string - por que isso importa"
    }
  ],
  "recomendacoes": [
    {
      "acao": "string - ação recomendada",
      "prioridade": "urgente | importante | opcional",
      "motivo": "string - por que fazer isso agora"
    }
  ],
  "pontuacao_saude": {
    "score": 75,
    "label": "string - ex: Bom / Excelente / Precisa de atenção",
    "detalhe": "string - explicação breve"
  }
}
Retorne SOMENTE o JSON."""

    user_text = f"""DADOS ACUMULADOS DO USUÁRIO:

Nichos: {', '.join(niches)}
Produtos analisados: {', '.join(products)}

ESTRATÉGIAS USADAS:
{json.dumps(strategies, ensure_ascii=False)}

DADOS DE MERCADO COLETADOS:
{json.dumps(market_data, ensure_ascii=False) if market_data else 'Nenhum dado de mercado coletado ainda.'}

Gere um briefing semanal com tendências, mudanças e recomendações práticas."""

    result = await call_claude(system_msg, user_text, f"radar-{user['id']}", lang)

    radar_id = str(uuid.uuid4())
    doc = {
        "id": radar_id,
        "user_id": user["id"],
        "result": result,
        "niches": niches,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.radars.insert_one(doc)

    return {"id": radar_id, **result, "created_at": doc["created_at"]}

@api_router.get("/radar/latest")
async def get_latest_radar(user=Depends(get_current_user)):
    radar = await db.radars.find_one(
        {"user_id": user["id"]}, {"_id": 0},
        sort=[("created_at", -1)]
    )
    if not radar:
        return None
    return {"id": radar["id"], **radar.get("result", {}), "created_at": radar["created_at"]}

# --- Strategy Operational Table ---

@api_router.post("/analyses/{analysis_id}/strategy-table")
async def generate_strategy_table(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    if not analysis.get("strategic_analysis"):
        raise HTTPException(status_code=400, detail="Execute a análise estratégica primeiro")

    product = analysis["product"]
    strategy = analysis["strategic_analysis"]

    system_msg = """Você é um estrategista de anúncios digitais. Gere uma tabela comparativa detalhada para cada perfil de público.

Retorne APENAS JSON válido (sem markdown):
{
  "perfis": [
    {
      "nome": "Cético",
      "emoji": "string",
      "abordagem": "string - como abordar esse perfil",
      "motivacao": "string - o que motiva esse perfil a comprar",
      "roteiro": "string - roteiro resumido de 3-4 passos para converter",
      "pontos_fortes": ["string - 2-3 pontos fortes da abordagem"],
      "pontos_fracos": ["string - 2-3 pontos fracos / riscos"],
      "hook_recomendado": "string - tipo de hook ideal para esse perfil",
      "tom_ideal": "string - tom de comunicação recomendado"
    }
  ],
  "recomendacao_geral": "string - qual perfil priorizar e por quê"
}
Gere 4 perfis: Cético, Interessado, Impulsivo, Desconfiado.
Retorne SOMENTE o JSON."""

    user_text = f"""PRODUTO: {product['nome']}
NICHO: {product['nicho']}
PROMESSA: {product['promessa_principal']}
PÚBLICO: {product.get('publico_alvo', '')}
ESTRATÉGIA:
- Nível de consciência: {strategy.get('nivel_consciencia', '')}
- Dor central: {strategy.get('dor_central', '')}
- Ângulo de venda: {strategy.get('angulo_venda', '')}
- Big Idea: {strategy.get('big_idea', '')}
- Mecanismo: {strategy.get('mecanismo_percebido', '')}"""

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"strategy-table-{analysis_id}", lang)

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"strategy_table": result}}
    )
    return result

# --- Media Upload ---

@api_router.post("/media/upload")
async def upload_media(file: UploadFile = File(...), user=Depends(get_current_user)):
    content_type = file.content_type or ""
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")

    if not is_image and not is_video:
        raise HTTPException(status_code=400, detail="Apenas imagens e vídeos são aceitos")

    max_size = MAX_IMAGE_SIZE if is_image else MAX_VIDEO_SIZE
    contents = await file.read()

    if len(contents) > max_size:
        limit_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Arquivo excede o limite de {limit_mb}MB")

    ext = Path(file.filename or "file").suffix or (".jpg" if is_image else ".mp4")
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    media_doc = {
        "id": file_id,
        "user_id": user["id"],
        "filename": filename,
        "original_name": file.filename,
        "content_type": content_type,
        "size": len(contents),
        "type": "image" if is_image else "video",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.media.insert_one(media_doc)

    return {"id": file_id, "filename": filename, "type": media_doc["type"], "size": len(contents)}

@api_router.get("/media/{file_id}")
async def get_media(file_id: str):
    media = await db.media.find_one({"id": file_id}, {"_id": 0})
    if not media:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    filepath = UPLOAD_DIR / media["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no disco")
    return FileResponse(filepath, media_type=media["content_type"])

@api_router.get("/media/user/list")
async def list_user_media(user=Depends(get_current_user)):
    items = await db.media.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return items

# --- Creative Generation ---

@api_router.post("/creatives/generate")
async def generate_creative(data: CreativeGenerationInput, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one(
        {"id": data.analysis_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]
    decision = analysis.get("decision") or {}
    v = decision.get("veredito") or decision.get("vencedor") or {}

    base_prompt = data.prompt or f"Anúncio profissional para '{product['nome']}' no nicho de {product['nicho']}. Promessa: {product['promessa_principal']}. Hook: {v.get('hook', '')}. Estilo: anúncio de tráfego pago, moderno, clean."

    lang = request.headers.get("x-language", "pt")
    creative_id = str(uuid.uuid4())

    if data.provider == "nano_banana":
        try:
            chat = LlmChat(
                api_key=EMERGENT_KEY,
                session_id=f"creative-nb-{creative_id}",
                system_message="You are a professional ad creative designer."
            )
            chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])

            msg = UserMessage(text=f"Create a professional ad creative image: {base_prompt}. Style: modern, clean, high-contrast, suitable for social media ads. Do NOT include any text in the image.")
            text_resp, images = await chat.send_message_multimodal_response(msg)

            if not images:
                raise HTTPException(status_code=500, detail="Nenhuma imagem gerada")

            image_bytes = base64.b64decode(images[0]["data"])
            filename = f"{creative_id}.png"
            filepath = GENERATED_DIR / filename
            with open(filepath, "wb") as f:
                f.write(image_bytes)

            result = {
                "id": creative_id,
                "provider": "nano_banana",
                "image_url": f"/api/creatives/file/{creative_id}",
                "text_response": text_resp,
                "prompt_used": base_prompt,
            }
        except Exception as e:
            logger.error(f"Nano Banana error: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao gerar com Nano Banana: {str(e)}")

    elif data.provider == "gpt_image":
        try:
            image_gen = OpenAIImageGeneration(api_key=EMERGENT_KEY)
            imgs = await image_gen.generate_images(
                prompt=f"Professional ad creative: {base_prompt}. Modern, clean, high-contrast design for social media advertising. No text overlay.",
                model="gpt-image-1",
                number_of_images=1
            )
            if not imgs:
                raise HTTPException(status_code=500, detail="Nenhuma imagem gerada")

            filename = f"{creative_id}.png"
            filepath = GENERATED_DIR / filename
            with open(filepath, "wb") as f:
                f.write(imgs[0])

            result = {
                "id": creative_id,
                "provider": "gpt_image",
                "image_url": f"/api/creatives/file/{creative_id}",
                "prompt_used": base_prompt,
            }
        except Exception as e:
            logger.error(f"GPT Image error: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao gerar com GPT Image: {str(e)}")

    elif data.provider == "claude_text":
        system_msg = """Você é um diretor criativo de anúncios. Gere um briefing visual detalhado para criação de anúncio.

Retorne APENAS JSON válido (sem markdown):
{
  "conceito_visual": "string - descrição do conceito visual do anúncio",
  "composicao": "string - como os elementos devem ser posicionados",
  "paleta_cores": ["string - 3-5 cores sugeridas com hex"],
  "tipografia": "string - estilo de fonte recomendado",
  "elementos_visuais": ["string - 3-5 elementos visuais obrigatórios"],
  "variacao_stories": "string - adaptação para formato stories",
  "variacao_feed": "string - adaptação para formato feed quadrado",
  "headline_visual": "string - texto para sobrepor na imagem",
  "cta_visual": "string - texto do botão CTA",
  "referencias_estilo": "string - referências de estilo visual"
}
Retorne SOMENTE o JSON."""

        result_data = await call_claude(system_msg, base_prompt, f"creative-claude-{creative_id}", lang)
        result = {
            "id": creative_id,
            "provider": "claude_text",
            "briefing": result_data,
            "prompt_used": base_prompt,
        }
    else:
        raise HTTPException(status_code=400, detail="Provider inválido")

    doc = {
        "id": creative_id,
        "user_id": user["id"],
        "analysis_id": data.analysis_id,
        "provider": data.provider,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.creatives.insert_one(doc)

    return result

@api_router.get("/creatives/file/{creative_id}")
async def get_creative_file(creative_id: str):
    filepath = GENERATED_DIR / f"{creative_id}.png"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Criativo não encontrado")
    return FileResponse(filepath, media_type="image/png")

@api_router.get("/creatives/list/{analysis_id}")
async def list_creatives(analysis_id: str, user=Depends(get_current_user)):
    items = await db.creatives.find(
        {"analysis_id": analysis_id, "user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return [item.get("result", item) for item in items]

# --- Push Subscription ---

@api_router.post("/push/subscribe")
async def subscribe_push(data: PushSubscriptionInput, user=Depends(get_current_user)):
    await db.push_subscriptions.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "endpoint": data.endpoint,
            "keys": data.keys,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True
    )
    return {"status": "subscribed"}

# --- App Setup ---

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
