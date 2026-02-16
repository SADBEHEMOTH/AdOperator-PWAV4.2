# AdOperator - PRD (Product Requirements Document)

## Problema Original
Criar uma aplicação web chamada "AdOperator" que transforma a descrição de um produto em hipóteses de anúncios, simula a reação do público e escolhe automaticamente o melhor anúncio antes que o usuário invista em tráfego.

## Arquitetura
- **Frontend:** React + Tailwind CSS + shadcn/ui
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **IA:** Claude Sonnet 4.5 (texto), GPT Image 1 (imagem), Nano Banana (imagem), Sora 2 (vídeo)
- **Autenticação:** JWT
- **i18n:** i18next (PT, EN, ES)
- **PWA:** Service Workers + Web App Manifest

## Funcionalidades Implementadas

### Core (Fluxo de 6 etapas)
- [x] Entrada do produto (nome, nicho, promessa, diferencial, preço, público)
- [x] Interpretação estratégica com IA (Claude 4.5)
- [x] Tabela de estratégia por perfil de público
- [x] Geração de múltiplos anúncios (hipóteses concorrentes)
- [x] Simulação de reações de público
- [x] Motor de decisão + anúncio vencedor
- [x] Página de resultado minimalista e acionável

### Dashboard
- [x] Painel vivo com análises recentes
- [x] Radar de Tendências (briefing semanal por IA)
- [x] Navegação por etapas no histórico (Estratégia, Anúncios, Simulação, Decisão)
- [x] Delete de análises

### Análise de Mercado/Concorrência
- [x] Comparação com mercado via IA
- [x] Análise de URLs de concorrentes
- [x] Suporte a URLs protegidas (Facebook, Instagram, etc.) - análise por IA
- [x] Suporte a links diretos de imagem

### Geração de Criativos
- [x] Geração de imagem (Nano Banana, GPT Image 1)
- [x] Briefing visual (Claude)
- [x] Geração de vídeo (Sora 2) - até 12s, múltiplos formatos
- [x] Campo de prompt personalizado
- [x] Dicas de criativos (VSL, UGC, Produto em Ação, Estático)
- [x] Galeria de criativos anteriores

### Exportação e Compartilhamento
- [x] Compartilhamento via link público
- [x] Exportação para PDF (jspdf + html2canvas)
- [x] Navegação por etapas individuais no resultado

### Infra
- [x] PWA instalável
- [x] Multi-idioma (PT, EN, ES)
- [x] Upload de mídia
- [x] Notificações push (registro de assinatura)

## Bugs Corrigidos (Fev 2026)
- [x] Análise de concorrente falha com URLs do Facebook (P0)
- [x] Botão "Gerar Criativo" com navegação incorreta (P0)
- [x] Tabela de estratégia não renderiza em mobile (P0)
- [x] Geração de exemplos de produto genérica (P1)
- [x] Análise de imagem não funciona em links diretos (P1)
- [x] Console warning LoginPage (LOW)

## Backlog
- [ ] Refatorar AnalysisFlow.js em componentes menores
- [ ] Análise visual com pHash em imagens de concorrentes
- [ ] Notificações push reais (VAPID keys)
- [ ] Geração de vídeo com hooks contextuais
