# AdOperator - PRD (Product Requirements Document)

## Problem Statement
Web application "AdOperator" - a decision engine that transforms product descriptions into ad hypotheses and automatically chooses the best one before investing in traffic.

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Auth**: JWT-based
- **PWA**: manifest.json + service-worker.js (stale-while-revalidate)

## Core Requirements
1. Product Input Form (nome, nicho, publico_alvo, promessa, beneficios, mecanismo, tom)
2. Strategic Parser (consciousness level, pain, objections, angle, big idea, mechanism)
3. Ad Variations Generator (3 hooks, 3 copies, 3 UGC scripts)
4. Audience Simulator (4 profiles: Skeptical, Interested, Impulsive, Suspicious)
5. Decision Engine (weighted scoring, winner selection, explanation)
6. Market Comparison (niche patterns, hook distribution, competitive advantage)
7. Competitor Analysis (URL scraping + AI extraction)
8. Multi-language support (PT/EN/ES)
9. Radar de Tendências (AI-generated weekly niche briefing)
10. PWA (installable, offline-ready)

## What's Been Implemented

### Core Features (Feb 2026)
- Full JWT authentication (register, login, token validation)
- Two input modes: Quick (3 fields) and Complete (7 fields)
- 6-step analysis flow with experiment-format ad cards
- 4-layer audience simulation with conflict detection
- Verdict-first decision engine with causal explanation
- Live dashboard panel with active product state
- Copy/Share/Export functionality

### PASSO 1 - Market & Competitor Analysis (Feb 16, 2026)
- Enhanced Dashboard with "Produto Ativo" live panel + 3 action buttons
- Market Comparison page (/analysis/:id/market)
- Competitor Analysis page (/competitor) with URL scraping
- Backend hook classification, block risk detection, web scraping utilities

### PASSO 2 - i18n + PWA + Radar (Feb 16, 2026)
- **Multi-language (PT/EN/ES)**: LanguageContext with comprehensive translations, LanguageSelector component on all pages, x-language header sent to backend, AI responds in selected language
- **PWA**: manifest.json, service-worker.js (stale-while-revalidate for assets, network-first for API), offline fallback page, app icons (192px + 512px)
- **Radar de Tendências**: POST /api/radar/generate (AI briefing from accumulated analyses), GET /api/radar/latest, Dashboard card with health score, market changes, emerging patterns, recommendations

## Key Routes
- `/` - Dashboard (live panel + radar + history)
- `/login` - Auth (with language selector)
- `/analysis/new` - Analysis flow
- `/analysis/:id` - Result page
- `/analysis/:id/market` - Market comparison
- `/competitor` - Competitor URL analysis
- `/public/:token` - Public shared result

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/analyses` → `parse` → `generate` → `simulate` → `decide` → `improve`
- `POST /api/analyses/:id/market-compare`
- `POST /api/competitor/analyze`, `GET /api/competitor/analyses`
- `POST /api/radar/generate`, `GET /api/radar/latest`

## Prioritized Backlog

### P0 (Remaining PASSO 1 tasks)
- **Etapa Estratégia Operacional**: Tabela comparativa por perfil de público
- **Solicitar Mídia**: Upload de imagem/vídeo do produto
- **Geração de Criativos**: Gerar fotos e hooks de vídeo (Nano Banana + GPT Image 1 + 1 more)
- **Fluxo Final Acionável**: Todo fluxo termina com ação

### P2 (Future)
- AI-enhanced compliance rewrite suggestions
- A/B testing tracking integration
- Template library for common niches
- Team collaboration features
