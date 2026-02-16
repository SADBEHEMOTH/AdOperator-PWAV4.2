# AdOperator - PRD (Product Requirements Document)

## Problem Statement
Web application "AdOperator" - a decision engine that transforms product descriptions into ad hypotheses and automatically chooses the best one before investing in traffic.

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui (port 3000)
- **Backend**: FastAPI + Python (port 8001)
- **Database**: MongoDB
- **AI**: Claude Sonnet 4.5 via Emergent LLM Key
- **Image Gen**: Nano Banana (Gemini), GPT Image 1 (OpenAI)
- **Auth**: JWT-based
- **PWA**: manifest.json + service-worker.js + push notifications

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
- Backend hook classification, block risk detection, web scraping

### PASSO 2 - i18n + PWA + Radar (Feb 16, 2026)
- Multi-language (PT/EN/ES) with LanguageContext
- PWA: manifest.json, service-worker.js, offline fallback, icons
- Radar de Tendências: AI briefing from accumulated analyses

### PASSO 3 - Strategy Table + Media + Creatives + Push (Feb 16, 2026)
- **Strategy Operational Table**: Comparative table per audience profile (Cético, Interessado, Impulsivo, Desconfiado) with abordagem, motivação, roteiro, pontos fortes/fracos
- **Media Upload**: Image (20MB) and video (100MB) upload with file serving
- **Creative Generation**: 3 providers - Nano Banana (Gemini), GPT Image 1 (OpenAI), Claude Text (visual briefing)
- **Actionable Flow Endings**: Decision step ends with 5 actions: Use ad, Improve, Generate Creative, Compare Market, Analyze Competitor
- **Push Notifications**: Service worker with push events, subscription endpoint, notification prompt on dashboard

## Key Routes
- `/` - Dashboard (live panel + radar + history + push prompt)
- `/login` - Auth
- `/analysis/new` - Analysis flow (with strategy table + media upload)
- `/analysis/:id` - Result page
- `/analysis/:id/market` - Market comparison
- `/analysis/:id/creative` - Creative generation (3 providers)
- `/competitor` - Competitor URL analysis
- `/public/:token` - Public shared result

## Key API Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/analyses` → `parse` → `generate` → `simulate` → `decide` → `improve`
- `POST /api/analyses/:id/strategy-table`
- `POST /api/analyses/:id/market-compare`
- `POST /api/media/upload`, `GET /api/media/:id`, `GET /api/media/user/list`
- `POST /api/creatives/generate`, `GET /api/creatives/file/:id`, `GET /api/creatives/list/:id`
- `POST /api/competitor/analyze`, `GET /api/competitor/analyses`
- `POST /api/radar/generate`, `GET /api/radar/latest`
- `POST /api/push/subscribe`

## Prioritized Backlog

### P2 (Future)
- AI-enhanced compliance rewrite suggestions
- A/B testing tracking integration
- Template library for common niches
- Team collaboration features
- Real push notification delivery (needs VAPID keys)
- Video generation with hooks
