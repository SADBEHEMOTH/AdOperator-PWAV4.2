from __future__ import annotations

import os
import re
import io
import json
import time
import uuid
import base64
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

import bcrypt
import jwt
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware

# --- Optional: Emergent Claude wrapper (se você usa EMERGENT_LLM_KEY) ---
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except Exception:  # pragma: no cover
    LlmChat = None
    UserMessage = None


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
GENERATED_DIR = ROOT_DIR / "generated"
GENERATED_DIR.mkdir(exist_ok=True)

MAX_IMAGE_SIZE = 20 * 1024 * 1024  # 20MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB

# --- Logging ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# --- MongoDB ---
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url or not db_name:
    raise RuntimeError("Env vars ausentes: MONGO_URL e/ou DB_NAME")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# --- JWT ---
JWT_SECRET = os.environ.get("JWT_SECRET", "adoperator_jwt_secret_2024_xK9mP2")
JWT_ALGORITHM = "HS256"

# --- LLM ---
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")  # Claude via emergentintegrations
# OPENAI_API_KEY: usado se você implementar OpenAI direto; aqui não é obrigatório.

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


# -----------------------------
# Pydantic Models
# -----------------------------
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


class CompetitorURLInput(BaseModel):
    url: str


class CreativeGenerationInput(BaseModel):
    analysis_id: str
    prompt: Optional[str] = ""
    provider: str  # "nano_banana" | "gpt_image" | "claude_text" | "sora_video"
    video_size: Optional[str] = "1280x720"
    video_duration: Optional[int] = 4
    hook_template: Optional[str] = ""
    parent_creative_id: Optional[str] = ""


class PushSubscriptionInput(BaseModel):
    endpoint: str
    keys: dict


class ComplianceCheckInput(BaseModel):
    text: str


class ImageAnalysisInput(BaseModel):
    image_urls: List[str]
    compare_with_analysis_id: Optional[str] = ""


# -----------------------------
# Compliance Checker
# -----------------------------
RISKY_TERMS = {
    "cura": "Use 'auxilia no tratamento' ou 'contribui para melhora'",
    "curar": "Use 'auxiliar no tratamento'",
    "elimina": "Use 'ajuda a reduzir' ou 'contribui para diminuir'",
    "remove": "Use 'auxilia na redução' ou 'contribui para minimizar'",
    "100%": "Evite porcentagens absolutas. Use 'alta eficácia'",
    "garantido": "Use 'resultados variam' / 'compromisso com qualidade'",
    "milagroso": "Evite. Use termos mais moderados",
    "sem efeitos colaterais": "Use 'bem tolerado' / 'perfil favorável'",
    "nunca mais": "Evite promessa absoluta",
    "para sempre": "Evite promessa absoluta",
}
HIGH_SEVERITY = {"cura", "curar", "100%", "milagroso", "sem efeitos colaterais", "nunca mais", "para sempre"}


def run_compliance_check(text: str) -> dict:
    text_lower = (text or "").lower()
    risks = []
    for term, suggestion in RISKY_TERMS.items():
        if term.lower() in text_lower:
            risks.append(
                {
                    "termo": term,
                    "sugestao": suggestion,
                    "severidade": "alta" if term in HIGH_SEVERITY else "media",
                }
            )
    score = max(0, 100 - len(risks) * 15)
    return {"riscos": risks, "score": score, "total_riscos": len(risks)}


# -----------------------------
# Auth helpers
# -----------------------------
def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
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


# -----------------------------
# Language instructions
# -----------------------------
LANGUAGE_INSTRUCTIONS = {
    "en": "\n\nIMPORTANT: Respond entirely in ENGLISH. All text values in the JSON must be in English.",
    "es": "\n\nIMPORTANTE: Responde completamente en ESPAÑOL. Todos los valores de texto en el JSON deben ser en español.",
    "pt": "",
}


# -----------------------------
# Claude helper (Emergent)
# -----------------------------
async def call_claude(system_message: str, user_text: str, session_id: str, lang: str = "pt"):
    if LlmChat is None or UserMessage is None:
        raise HTTPException(status_code=500, detail="Claude wrapper (emergentintegrations) não está disponível")

    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY não configurada")

    lang_instruction = LANGUAGE_INSTRUCTIONS.get(lang, "")
    full_system = system_message + lang_instruction

    chat = (
        LlmChat(api_key=EMERGENT_KEY, session_id=session_id, system_message=full_system)
        .with_model("anthropic", "claude-sonnet-4-5-20250929")
    )

    response = await chat.send_message(UserMessage(text=user_text))

    text = (response or "").strip()
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
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group())
        logger.error("Falha ao parsear JSON do Claude: %s", text[:400])
        raise HTTPException(status_code=500, detail="Erro ao processar resposta da IA")


# -----------------------------
# Auth endpoints
# -----------------------------
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
        "created_at": datetime.now(timezone.utc).isoformat(),
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


# -----------------------------
# Analyses CRUD
# -----------------------------
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
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.analyses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/analyses")
async def list_analyses(user=Depends(get_current_user)):
    analyses = (
        await db.analyses.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(100)
    )
    return analyses


@api_router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    return analysis


@api_router.delete("/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str, user=Depends(get_current_user)):
    result = await db.analyses.delete_one({"id": analysis_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Análise não encontrada")
    return {"success": True}


@api_router.patch("/analyses/{analysis_id}/product")
async def update_analysis_product(analysis_id: str, product: ProductInput, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"product": product.model_dump()}})
    return {"success": True}


# -----------------------------
# Compliance endpoint
# -----------------------------
@api_router.post("/compliance/check")
async def check_compliance_endpoint(data: ComplianceCheckInput):
    return run_compliance_check(data.text)


# -----------------------------
# Share endpoints
# -----------------------------
@api_router.post("/analyses/{analysis_id}/share")
async def share_analysis(analysis_id: str, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    public_token = analysis.get("public_token")
    if not public_token:
        public_token = str(uuid.uuid4())[:12]
        await db.analyses.update_one({"id": analysis_id}, {"$set": {"public_token": public_token}})

    return {"public_token": public_token}


@api_router.get("/public/{token}")
async def get_public_analysis(token: str):
    analysis = await db.analyses.find_one({"public_token": token}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    analysis.pop("user_id", None)
    return analysis


# -----------------------------
# Web scraping utilities
# -----------------------------
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"}
PROTECTED_DOMAINS = ["facebook.com", "fb.com", "instagram.com", "tiktok.com", "linkedin.com"]

HOOK_PATTERNS = {
    "pergunta": ["?", "você sabe", "já pensou", "por que", "como"],
    "historia": ["eu", "minha", "descobri", "quando", "lembro", "história"],
    "lista": ["3 ", "5 ", "7 ", "10 ", "passo", "dica", "motivo"],
    "prova_social": ["milhares", "pessoas", "resultado", "depoimento", "cliente", "vendido"],
    "mecanismo": ["funciona", "método", "sistema", "tecnologia", "fórmula", "segredo"],
    "choque": ["pare", "cuidado", "perigo", "alerta", "nunca", "erro", "mentira"],
}

BLOCK_RISK_TERMS = [
    "cura",
    "curar",
    "100%",
    "garantido",
    "milagroso",
    "elimina",
    "sem efeitos colaterais",
    "nunca mais",
    "para sempre",
    "definitivo",
    "comprovado cientificamente",
    "médicos recomendam",
    "aprovado pela anvisa",
]


def classify_hook_type(text: str) -> str:
    text_lower = (text or "").lower()
    scores = {k: sum(1 for w in words if w in text_lower) for k, words in HOOK_PATTERNS.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "direto"


def detect_block_risk(text: str) -> dict:
    text_lower = (text or "").lower()
    found = [t for t in BLOCK_RISK_TERMS if t in text_lower]
    if len(found) >= 3:
        level = "alto"
    elif len(found) >= 1:
        level = "medio"
    else:
        level = "baixo"
    return {"level": level, "terms": found}


def is_image_url(url: str) -> bool:
    from urllib.parse import urlparse

    path = (urlparse(url).path or "").lower()
    return any(path.endswith(ext) for ext in IMAGE_EXTENSIONS)


def is_protected_domain(url: str) -> bool:
    from urllib.parse import urlparse

    hostname = urlparse(url).hostname or ""
    return any(d in hostname for d in PROTECTED_DOMAINS)


async def scrape_url(url: str) -> dict:
    # direct image
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

    # protected domain
    if is_protected_domain(url):
        from urllib.parse import urlparse, parse_qs

        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        hints = []
        if "ads/library" in url or "ad_library" in url:
            hints.append("Facebook Ad Library")
        if query.get("id"):
            hints.append(f"Ad ID: {query['id'][0]}")

        return {
            "url": url,
            "title": f"Anúncio em {parsed.hostname}",
            "meta_description": " | ".join(hints) if hints else f"Conteúdo protegido de {parsed.hostname}",
            "headings": [],
            "paragraphs": [
                f"URL de plataforma protegida ({parsed.hostname}). Conteúdo não pode ser raspado diretamente."
            ],
            "buttons_ctas": [],
            "images": [],
            "hook_type_detected": "direto",
            "block_risk": {"level": "desconhecido", "terms": []},
            "text_length": 0,
            "full_text_preview": f"URL protegida: {url}",
            "is_protected": True,
        }

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http_client:
            resp = await http_client.get(url, headers=headers)
            resp.raise_for_status()
    except Exception as e:
        logger.error("Scrape failed for %s: %s", url, e)
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
    buttons = [
        b.get_text(strip=True)
        for b in soup.find_all(["button", "a"])
        if b.get_text(strip=True) and len(b.get_text(strip=True)) < 80
    ]

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
    return {
        "url": url,
        "title": title,
        "meta_description": meta_desc,
        "headings": headings[:10],
        "paragraphs": paragraphs[:20],
        "buttons_ctas": buttons[:10],
        "images": images,
        "hook_type_detected": classify_hook_type(full_text),
        "block_risk": detect_block_risk(full_text),
        "text_length": len(full_text),
        "full_text_preview": full_text[:3000],
    }


# -----------------------------
# AI pipeline endpoints (parse/generate/simulate/decide/market)
# (mantém as rotas; prompts encurtados pra evitar nova corrupção)
# -----------------------------
@api_router.post("/analyses/{analysis_id}/parse")
async def parse_strategy(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]

    system_msg = (
        "Você é um estrategista de marketing direto e tráfego pago.\n"
        "Analise o produto e retorne APENAS JSON válido com:\n"
        "{nivel_consciencia, dor_central, objecoes, angulo_venda, big_idea, mecanismo_percebido}."
    )

    user_text = (
        f"Produto: {product['nome']}\n"
        f"Nicho: {product['nicho']}\n"
        f"Promessa principal: {product['promessa_principal']}\n"
        f"Público-alvo: {product.get('publico_alvo','')}\n"
        f"Benefícios: {product.get('beneficios','')}\n"
        f"Mecanismo: {product.get('ingredientes_mecanismo','')}\n"
        f"Tom: {product.get('tom','')}\n"
    )

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"parse-{analysis_id}", lang)

    all_text = " ".join([v for v in product.values() if isinstance(v, str) and v])
    result["compliance"] = run_compliance_check(all_text)

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"strategic_analysis": result, "status": "parsed"}})
    return result


@api_router.post("/analyses/{analysis_id}/generate")
async def generate_ads(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]
    strategy = analysis.get("strategic_analysis")
    if not strategy:
        raise HTTPException(status_code=400, detail="Execute a análise estratégica primeiro")

    system_msg = (
        "Você é um copywriter de performance. Gere 3 anúncios estruturalmente diferentes.\n"
        "Retorne APENAS JSON válido com uma lista 'anuncios'."
    )

    user_text = (
        f"Produto: {product['nome']}\n"
        f"Nicho: {product['nicho']}\n"
        f"Promessa: {product['promessa_principal']}\n"
        f"Estratégia: {json.dumps(strategy, ensure_ascii=False)}\n"
    )

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"generate-{analysis_id}", lang)

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"ad_variations": result, "status": "generated"}})
    return result


@api_router.post("/analyses/{analysis_id}/simulate")
async def simulate_audience(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    ads = analysis.get("ad_variations")
    if not ads:
        raise HTTPException(status_code=400, detail="Gere os anúncios primeiro")

    system_msg = (
        "Você simula comportamento humano de 4 perfis reagindo a anúncios.\n"
        "Retorne APENAS JSON válido."
    )
    user_text = f"Anúncios: {json.dumps(ads, ensure_ascii=False)}"

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"simulate-{analysis_id}", lang)

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"audience_simulation": result, "status": "simulated"}})
    return result


@api_router.post("/analyses/{analysis_id}/decide")
async def decide_winner(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    simulation = analysis.get("audience_simulation")
    ads = analysis.get("ad_variations")
    if not simulation or not ads:
        raise HTTPException(status_code=400, detail="Execute a simulação primeiro")

    system_msg = "Você decide o vencedor e explica. Retorne APENAS JSON válido."
    user_text = f"ANÚNCIOS: {json.dumps(ads, ensure_ascii=False)}\nSIMULAÇÃO: {json.dumps(simulation, ensure_ascii=False)}"

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"decide-{analysis_id}", lang)

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"decision": result, "status": "completed"}})
    return result


@api_router.post("/analyses/{analysis_id}/market-compare")
async def market_compare(analysis_id: str, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": analysis_id, "user_id": user["id"]}, {"_id": 0})
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
    elif ads and isinstance(ads, dict) and ads.get("anuncios"):
        user_hook = ads["anuncios"][0].get("hook", "")
        user_copy = ads["anuncios"][0].get("copy", "")

    system_msg = "Você analisa o mercado do nicho e compara com a estratégia do usuário. Retorne APENAS JSON válido."
    user_text = (
        f"Produto: {product['nome']} | Nicho: {product['nicho']} | Promessa: {product['promessa_principal']}\n"
        f"Estratégia: {json.dumps(strategy, ensure_ascii=False)}\n"
        f"Hook atual: {user_hook}\nCopy atual: {user_copy}\n"
    )

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, user_text, f"market-{analysis_id}", lang)

    await db.analyses.update_one({"id": analysis_id}, {"$set": {"market_comparison": result}})
    return result


# -----------------------------
# Competitor analysis endpoints
# -----------------------------
@api_router.post("/competitor/analyze")
async def analyze_competitor(data: CompetitorURLInput, request: Request, user=Depends(get_current_user)):
    scraped = await scrape_url(data.url)
    is_img = scraped.get("is_image_url", False)
    is_protected = scraped.get("is_protected", False)

    if is_img:
        system_msg = "Analise estrategicamente um criativo (imagem) de concorrente. Retorne APENAS JSON."
        content_text = f"URL da imagem: {data.url}"
    elif is_protected:
        system_msg = "Analise estrategicamente um anúncio em plataforma protegida usando metadados. Retorne APENAS JSON."
        content_text = f"URL protegida: {scraped['url']}\nContexto: {scraped.get('meta_description','')}"
    else:
        system_msg = "Analise estrategicamente o conteúdo da página/anúncio do concorrente. Retorne APENAS JSON."
        content_text = (
            f"URL: {scraped['url']}\nTítulo: {scraped['title']}\n"
            f"Meta: {scraped['meta_description']}\n"
            f"Texto: {scraped['full_text_preview']}"
        )

    lang = request.headers.get("x-language", "pt")
    result = await call_claude(system_msg, content_text, f"competitor-{uuid.uuid4()}", lang)

    result["scraping_data"] = {
        "url": scraped["url"],
        "hook_type_auto": scraped.get("hook_type_detected", "direto"),
        "block_risk_auto": scraped.get("block_risk", {"level": "desconhecido", "terms": []}),
        "images_found": len(scraped.get("images", [])),
        "source_type": "image" if is_img else ("protected" if is_protected else "webpage"),
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
    items = (
        await db.competitor_analyses.find({"user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(50)
    )
    return items


# -----------------------------
# Media upload
# -----------------------------
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
    items = await db.media.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return items


# -----------------------------
# Prompt builder (mantém seu molde)
# -----------------------------
HOOK_TEMPLATES = {
    "vsl": "Estilo VSL: gancho forte nos primeiros 3s, problema, solução, urgência, CTA.",
    "ugc": "Estilo UGC: câmera frontal, depoimento espontâneo, tom conversacional.",
    "before_after": "Estilo Before/After: contraste visual antes e depois com transição clara.",
    "depoimento": "Estilo Depoimento: história real, emocional no início, confiante no final.",
    "problema_solucao": "Estilo Problema-Solução: dor intensa, pausa, solução, demonstração, CTA.",
}


def build_contextual_prompt(
    product: dict,
    decision: dict,
    strategy: dict,
    hook_template: str,
    custom_prompt: str,
    provider: str,
) -> str:
    v = (decision or {}).get("veredito") or (decision or {}).get("vencedor") or {}
    hook = v.get("hook", "")
    roteiro = v.get("roteiro_ugc", "")

    nicho = product.get("nicho", "")
    nome = product.get("nome", "")
    promessa = product.get("promessa_principal", "")
    publico = product.get("publico_alvo", "")

    big_idea = (strategy or {}).get("big_idea", "")
    angulo = (strategy or {}).get("angulo_venda", "")
    dor = (strategy or {}).get("dor_central", "")

    base = custom_prompt.strip() if custom_prompt else (
        f"Vídeo publicitário profissional para '{nome}'" if provider == "sora_video"
        else f"Criativo publicitário profissional para '{nome}'"
    )

    template_text = HOOK_TEMPLATES.get(hook_template or "", "")
    if template_text:
        base += f"\n\nDireção criativa: {template_text}"

    context_parts = []
    if nicho:
        context_parts.append(f"Nicho: {nicho}")
    if promessa:
        context_parts.append(f"Promessa principal: {promessa}")
    if publico:
        context_parts.append(f"Público-alvo: {publico}")
    if hook:
        context_parts.append(f"Hook vencedor: {hook}")
    if dor:
        context_parts.append(f"Dor central: {dor}")
    if big_idea:
        context_parts.append(f"Big Idea: {big_idea}")
    if angulo:
        context_parts.append(f"Ângulo de venda: {angulo}")

    if context_parts:
        base += "\n\nContexto estratégico:\n" + "\n".join(context_parts)

    if roteiro and provider == "sora_video" and not custom_prompt:
        base += f"\n\nRoteiro UGC de referência (resumo): {roteiro[:300]}"

    return base


# -----------------------------
# Creative generation
# (mantém a rota e o molde do prompt)
# -----------------------------
@api_router.post("/creatives/generate")
async def generate_creative(data: CreativeGenerationInput, request: Request, user=Depends(get_current_user)):
    analysis = await db.analyses.find_one({"id": data.analysis_id, "user_id": user["id"]}, {"_id": 0})
    if not analysis:
        raise HTTPException(status_code=404, detail="Análise não encontrada")

    product = analysis["product"]
    decision = analysis.get("decision") or {}
    strategy = analysis.get("strategic_analysis") or {}

    base_prompt = build_contextual_prompt(
        product, decision, strategy,
        data.hook_template or "",
        data.prompt or "",
        data.provider,
    )

    # versioning
    version = 1
    version_group = data.analysis_id
    if data.parent_creative_id:
        parent = await db.creatives.find_one({"id": data.parent_creative_id}, {"_id": 0})
        if parent:
            version_group = parent.get("version_group", data.analysis_id)
            version = parent.get("version", 1) + 1
    else:
        existing_count = await db.creatives.count_documents({
            "analysis_id": data.analysis_id,
            "provider": data.provider,
            "user_id": user["id"],
        })
        version = existing_count + 1

    lang = request.headers.get("x-language", "pt")
    creative_id = str(uuid.uuid4())

    result: Dict[str, Any] = {}

    if data.provider in ("nano_banana", "gpt_image"):
        # Aqui você pode plugar OpenAI images depois.
        # Por enquanto, mantém a rota viva com erro claro (evita crash e “quebra deploy”).
        raise HTTPException(
            status_code=501,
            detail="Geração de imagem (nano_banana/gpt_image) não está plugada nesta versão limpa. "
                   "Me diga qual SDK você quer usar (OpenAI direto ou Emergent) e eu te passo o bloco exato."
        )

    elif data.provider == "claude_text":
        system_msg = (
            "Você é um diretor de arte de performance. Gere um briefing de criativo.\n"
            "Retorne APENAS JSON válido com: conceito_visual, composicao, paleta_cores, tipografia, elementos_visuais..."
        )
        result_data = await call_claude(system_msg, base_prompt, f"creative-claude-{creative_id}", lang)
        result = {
            "id": creative_id,
            "provider": "claude_text",
            "briefing": result_data,
            "prompt_used": base_prompt,
        }

    elif data.provider == "sora_video":
        # Mantém exatamente seu molde contextual:
        video_size = data.video_size if data.video_size in ["1280x720", "1792x1024", "1024x1792", "1024x1024"] else "1280x720"
        video_duration = data.video_duration if data.video_duration in [4, 8, 12] else 4

        video_prompt = data.prompt or build_contextual_prompt(product, decision, strategy, data.hook_template or "", "", "sora_video")

        raise HTTPException(
            status_code=501,
            detail="Sora (sora_video) não está plugado nesta versão limpa. "
                   "Se você estiver usando Emergent OpenAIVideoGeneration, eu te passo o bloco pronto."
        )
    else:
        raise HTTPException(status_code=400, detail="Provider inválido")

    doc = {
        "id": str(uuid.uuid4()),
        "analysis_id": data.analysis_id,
        "user_id": user["id"],
        "provider": data.provider,
        "version": version,
        "version_group": version_group,
        "hook_template": data.hook_template or None,
        "parent_creative_id": data.parent_creative_id or None,
        "result": result,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.creatives.insert_one(doc)

    return result


@api_router.get("/creatives/file/{creative_id}")
async def get_creative_file(creative_id: str):
    filepath_png = GENERATED_DIR / f"{creative_id}.png"
    if filepath_png.exists():
        return FileResponse(filepath_png, media_type="image/png")

    filepath_mp4 = GENERATED_DIR / f"{creative_id}.mp4"
    if filepath_mp4.exists():
        return FileResponse(filepath_mp4, media_type="video/mp4")

    raise HTTPException(status_code=404, detail="Arquivo não encontrado")


@api_router.get("/creatives/list/{analysis_id}")
async def list_creatives(analysis_id: str, user=Depends(get_current_user)):
    items = (
        await db.creatives.find({"analysis_id": analysis_id, "user_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(50)
    )
    results = []
    for item in items:
        r = item.get("result", {})
        r["version"] = item.get("version", 1)
        r["hook_template"] = item.get("hook_template")
        r["parent_creative_id"] = item.get("parent_creative_id")
        r["created_at"] = item.get("created_at", "")
        results.append(r)
    return results


# -----------------------------
# pHash visual analysis
# -----------------------------
async def compute_phash_from_url(image_url: str) -> Optional[str]:
    import imagehash
    from PIL import Image

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as http_client:
            resp = await http_client.get(
                image_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
            )
            resp.raise_for_status()
            content_type = resp.headers.get("content-type", "")
            if "image" not in content_type and not any(image_url.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".gif", ".webp"]):
                return None
            img = Image.open(io.BytesIO(resp.content))
            return str(imagehash.phash(img))
    except Exception as e:
        logger.warning("pHash failed for %s: %s", image_url, e)
        return None


def hamming_distance(hash1: str, hash2: str) -> int:
    import imagehash
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    return h1 - h2


@api_router.post("/competitor/image-analysis")
async def analyze_competitor_images(data: ImageAnalysisInput, user=Depends(get_current_user)):
    results = []
    input_hashes = []

    for url in data.image_urls[:10]:
        phash = await compute_phash_from_url(url)
        input_hashes.append({"url": url, "phash": phash})
        results.append({"url": url, "phash": phash, "status": "ok" if phash else "failed"})

    comparisons = []
    if data.compare_with_analysis_id:
        user_creatives = await db.creatives.find(
            {"analysis_id": data.compare_with_analysis_id, "user_id": user["id"]},
            {"_id": 0},
        ).to_list(50)

        import imagehash
        from PIL import Image

        for creative in user_creatives:
            creative_result = creative.get("result", {})
            creative_id = creative_result.get("id", "")
            if not creative_id:
                continue

            creative_path = GENERATED_DIR / f"{creative_id}.png"
            if not creative_path.exists():
                continue

            try:
                img = Image.open(creative_path)
                creative_hash = str(imagehash.phash(img))
            except Exception:
                continue

            for inp in input_hashes:
                if not inp["phash"]:
                    continue
                dist = hamming_distance(inp["phash"], creative_hash)
                similarity = max(0, 100 - (dist * 100 / 64))
                comparisons.append(
                    {
                        "competitor_url": inp["url"],
                        "creative_id": creative_id,
                        "creative_provider": creative_result.get("provider", ""),
                        "creative_version": creative.get("version", 1),
                        "distance": dist,
                        "similarity_percent": round(similarity, 1),
                        "is_similar": dist < 15,
                    }
                )

    cross_comparisons = []
    valid_hashes = [h for h in input_hashes if h["phash"]]
    for i in range(len(valid_hashes)):
        for j in range(i + 1, len(valid_hashes)):
            dist = hamming_distance(valid_hashes[i]["phash"], valid_hashes[j]["phash"])
            similarity = max(0, 100 - (dist * 100 / 64))
            cross_comparisons.append(
                {
                    "image_a": valid_hashes[i]["url"],
                    "image_b": valid_hashes[j]["url"],
                    "distance": dist,
                    "similarity_percent": round(similarity, 1),
                    "is_similar": dist < 15,
                }
            )

    return {
        "images": results,
        "creative_comparisons": comparisons,
        "cross_comparisons": cross_comparisons,
        "summary": {
            "total_images": len(data.image_urls),
            "hashed_successfully": len(valid_hashes),
            "similar_to_creatives": len([c for c in comparisons if c["is_similar"]]),
            "similar_cross": len([c for c in cross_comparisons if c["is_similar"]]),
        },
    }


# -----------------------------
# Push subscription
# -----------------------------
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
        upsert=True,
    )
    return {"status": "subscribed"}


# -----------------------------
# App setup
# -----------------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()