# AdOperator - PRD (Product Requirements Document)

## Problem Statement
Web application "AdOperator" - a decision engine that transforms product descriptions into ad hypotheses and automatically chooses the best one before investing in traffic. The system interprets strategically, generates multiple ads, simulates audience reactions, and picks the winner.

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key (emergentintegrations)
- **Auth**: JWT-based (register/login)

## User Personas
1. **Digital Marketers (BR)**: Run paid traffic campaigns, need optimized ad copy
2. **Media Buyers**: Want data-driven ad decisions before spending budget
3. **Entrepreneurs**: Building products, need professional ad analysis

## Core Requirements
1. Product Input Form (nome, nicho, publico_alvo, promessa, beneficios, mecanismo, tom)
2. Strategic Parser (consciousness level, pain, objections, angle, big idea, mechanism)
3. Ad Variations Generator (3 hooks, 3 copies, 3 UGC scripts)
4. Audience Simulator (4 profiles: Skeptical, Interested, Impulsive, Suspicious)
5. Decision Engine (weighted scoring, winner selection, explanation)
6. Final Result (winning ad, LP structure, compatible audience)
7. User Authentication (JWT login/register)
8. History of past analyses
9. Market Comparison (niche analysis, dominant patterns, competitor differences)
10. Competitor Analysis (URL scraping, strategic extraction)

## What's Been Implemented

### Core Features (Feb 2026)
- Full JWT authentication (register, login, token validation)
- Two input modes: Quick (3 fields) and Complete (7 fields) with tab switcher
- Clickable chips + Auto-fill example + Time indicator (~45s)
- Compliance checker: Risky terms detection with rewrite suggestions
- Experiment-format ad cards with predictive metrics
- 4-layer audience simulation with conflict detection
- Verdict-first decision engine with causal explanation
- Loop system: Melhorar/Nova variacao/improvement chips
- Live dashboard panel with active product state
- Copy to clipboard, Share via public link, PDF export, Delete analysis
- Dark minimalist UI (Manrope/Inter/JetBrains Mono)

### PASSO 1 - Market & Competitor Analysis (Feb 16, 2026)
- **Enhanced Dashboard**: Live panel shows "Produto Ativo" with strategy, biggest weakness, recommended next action, and 3 action buttons: "Melhorar anúncio", "Comparar com mercado", "Analisar concorrente"
- **Market Comparison** (/analysis/:id/market): AI-powered niche market analysis showing hook distribution, dominant patterns, persistent ads, and user vs market comparison with competitive advantage
- **Competitor Analysis** (/competitor): URL scraping + AI analysis extracting: tipo de abertura, promessa, mecanismo, prova, CTA, psicologia, risco de bloqueio, formato visual. Shows interpretation: what it does, why it works, where it loses strength, how to beat it. CTA: "CRIAR VERSÃO SUPERIOR"
- **Backend utilities**: Hook type classification (pergunta/historia/lista/prova_social/mecanismo/choque), block risk detection, web scraping with BeautifulSoup4

## Key Routes
- `/` - Dashboard (live panel + history)
- `/login` - Auth
- `/analysis/new` - New analysis flow
- `/analysis/:id` - Result page
- `/analysis/:id/market` - Market comparison
- `/competitor` - Competitor URL analysis
- `/public/:token` - Public shared result

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/analyses` - Create analysis
- `POST /api/analyses/:id/parse` - Strategic parser
- `POST /api/analyses/:id/generate` - Generate ad variations
- `POST /api/analyses/:id/simulate` - Audience simulation
- `POST /api/analyses/:id/decide` - Decision engine
- `POST /api/analyses/:id/improve` - Create improvement iteration
- `POST /api/analyses/:id/market-compare` - Market comparison
- `POST /api/competitor/analyze` - Analyze competitor URL
- `GET /api/competitor/analyses` - List past competitor analyses

## Prioritized Backlog

### P0 (Remaining PASSO 1 tasks)
- **Etapa Estratégia Operacional**: Tabela comparativa por perfil de público (abordagem, motivação, roteiro, pontos fortes/fracos)
- **Solicitar Mídia**: Upload de imagem/vídeo do produto após estratégia
- **Geração de Criativos**: Gerar fotos e hooks de vídeo (Nano Banana, GPT Image 1 + 1 more)
- **Fluxo Final Acionável**: Todo fluxo termina com ação, nunca "voltar ao início"

### P1 (PASSO 2 - PWA)
- manifest.json configuration
- Service worker (stale-while-revalidate for assets, network-first for APIs)
- Install prompt ("Add to Home Screen")
- Offline loading with warning message

### P2 (Future)
- AI-enhanced compliance rewrite suggestions
- A/B testing tracking integration
- Multi-language ad generation (EN/ES)
- Team collaboration features
- Template library for common niches
