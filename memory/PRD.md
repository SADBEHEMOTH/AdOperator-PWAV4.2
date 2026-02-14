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

## What's Been Implemented (Feb 2026)
- Full JWT authentication (register, login, token validation)
- **Two input modes**: Quick (3 fields) and Complete (7 fields) with tab switcher
- **Clickable chips** under promessa field + tone chips for quick selection
- **Auto-fill** "Gerar exemplo" button + **Time indicator** (~45s)
- **Compliance checker**: Risky terms detection with rewrite suggestions + score
- **Experiment-format ad cards**: Hypothesis, target audience, strengths/weaknesses, predictive metrics (CTR, curiosity, block risk)
- **Structurally diverse ads**: Personal story / Unexpected discovery / Attack on common mistake
- **4-layer audience simulation**: Emotional reaction, 2s thought, probable decision, "what would make them click" + conflict detection + general trend
- **Verdict-first decision**: Big headline, causal explanation, consequences of wrong choices, R$2000 recommendation
- **Loop system**: Melhorar/Nova variacao/improvement chips, improve endpoint
- **Live dashboard panel**: Current state, alerts, recommendations
- **Staged loading**: Progressive feedback messages during AI processing
- Copy to clipboard, Share via public link, PDF export, Delete analysis
- Dark minimalist UI (Manrope/Inter/JetBrains Mono)

## Prioritized Backlog
### P0 (Critical)
- All core features implemented

### P1 (High)
- AI-enhanced compliance rewrite suggestions (auto-suggest safer alternatives)
- A/B testing tracking integration
- Multi-language ad generation

### P2 (Medium)
- Team collaboration features
- Template library for common niches
- Version history for analyses
- Analytics dashboard for conversion tracking
- Webhook integration for external platforms

## Next Tasks
- Integrate compliance scorer with AI rewrite suggestions
- Add multi-language support (EN/ES)
- Consider A/B testing tracking module
- Team workspace with shared analyses
