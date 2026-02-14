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
- Product input form with all 7 fields + tone selector
- 5-step analysis pipeline with Claude Sonnet 4.5
- Strategic analysis display with all 6 strategy dimensions
- 3 ad variations with hook, copy, UGC script per variation
- 4-profile audience simulation with scores (0-100)
- Decision engine with weighted scoring, ranking, and LP structure
- Dashboard with history, status badges, and analysis navigation
- Dark minimalist UI (Manrope/Inter/JetBrains Mono fonts)
- Stepper component for progress tracking
- Resume incomplete analyses

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✓

### P1 (High)
- Export analysis results as PDF
- Copy ad text to clipboard with one click
- A/B testing tracking integration

### P2 (Medium)
- Team collaboration features
- Template library for common niches
- Version history for analyses
- Analytics dashboard for conversion tracking

## Next Tasks
- Add copy-to-clipboard for winning ad
- Add PDF export of full analysis
- Add delete analysis functionality
- Consider A/B testing integration
