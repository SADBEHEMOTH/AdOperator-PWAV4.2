from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import httpx
from bs4 import BeautifulSoup

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# --- AI Helper ---

async def call_claude(system_message: str, user_text: str, session_id: str):
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=session_id,
        system_message=system_message
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

# --- AI Pipeline Endpoints ---

@api_router.post("/analyses/{analysis_id}/parse")
async def parse_strategy(analysis_id: str, user=Depends(get_current_user)):
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

    result = await call_claude(system_msg, user_text, f"parse-{analysis_id}")

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
async def generate_ads(analysis_id: str, user=Depends(get_current_user)):
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

    result = await call_claude(system_msg, user_text, f"generate-{analysis_id}")

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"ad_variations": result, "status": "generated"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/simulate")
async def simulate_audience(analysis_id: str, user=Depends(get_current_user)):
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

    result = await call_claude(system_msg, user_text, f"simulate-{analysis_id}")

    await db.analyses.update_one(
        {"id": analysis_id},
        {"$set": {"audience_simulation": result, "status": "simulated"}}
    )
    return result

@api_router.post("/analyses/{analysis_id}/decide")
async def decide_winner(analysis_id: str, user=Depends(get_current_user)):
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

    result = await call_claude(system_msg, user_text, f"decide-{analysis_id}")

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
