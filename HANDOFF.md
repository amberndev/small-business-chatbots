# HANDOFF — Small Business Chatbots (case Ambern)

Última atualização: **2026-09-06** (fim da sessão na máquina A, antes de trocar de máquina).
Leia este arquivo primeiro ao retomar o trabalho em outra máquina.

---

## 1. Onde estamos

Portfólio/case de três chatbots configuráveis para pequenos negócios (Dental, Home Services, Real Estate "Harbor Homes").

| Item | Valor |
| --- | --- |
| Repositório | `github.com/amberndev/small-business-chatbots` (público) |
| Branch | `feature/three-chatbot-portfolio-case` |
| Produção | https://chatbots.ambern.dev |
| VPS | `root@5.189.146.5` (DNS aponta para lá) |
| Runtime | Docker, container `chatbots-app`, porta interna 3000, `--restart unless-stopped`, rede `mailcowdockerized_mailcow-network` |
| Imagem ativa (último deploy) | `ambern-small-business-chatbots:contact3` |
| Rollback | container parado `chatbots-app-before-contact-form3` |
| Proxy/TLS | Nginx no host |
| Stack | Next.js App Router + TS + Tailwind + Vitest + Playwright |

> ⚠️ **Detalhe importante do deploy:** o Docker do VPS é instalado via Snap e **não enxerga `/var/www`**. As imagens foram construídas a partir de contextos em `/root/chatbots-*` (`/root/chatbots-calendar`, `/root/chatbots-properties`, `/root/chatbots-origin-fix`, …), com o fonte em `/var/www/small-business-chatbots` também atualizado. Detalhes completos e histórico de cada deploy em **`docs/deploy/RUNBOOK.md`**.

> ⚠️ Até este commit, **produção estava à frente do git**: as features de calendário, catálogo de imóveis e formulário de contato rodavam em produção mas só existiam como working tree na máquina A. Agora estão versionadas e no `origin`.

---

## 2. O que acabou de ser commitado (WIP desta sessão)

### Calendário de agendamento
- `components/chat/BookingCalendar.tsx` — calendário com navegação de mês, seleção de horário, edição de data/hora preservando os dados de contato, histórico acessível por teclado, layout responsivo.
- `lib/booking/availability.ts` — disponibilidade fictícia gerada no servidor para os próximos 45 dias em `Australia/Sydney`. Datas passadas, dias fechados e horários indisponíveis são rejeitados no servidor e revalidados na confirmação. **Não reserva nada de verdade.**
- Testes: `tests/unit/availability.test.ts`.

### Catálogo de imóveis (Harbor Homes / "Riverside Gardens")
- `content/properties.ts` — 6 imóveis fictícios (venda, aluguel, vendido, alugado), preços em **USD**, filtros por modo/status/preço/quartos, pins de mapa.
- `components/property/PropertyExplorer.tsx`, `components/property/PropertyFilm.tsx` — grade, filtros e vídeos MP4 de 4s (mudos, em loop, com poster JPG de fallback).
- `public/properties/` — 4 jpg + 4 mp4 (~2 MB total) + `CREDITS.md`. Tudo marcado como fictício/ilustrativo.
- Selecionar um imóvel disponível prepara uma solicitação de visita simulada no chatbot, com ID, endereço e preço no resumo. IDs vendidos/alugados/inexistentes são rejeitados no servidor.
- Testes: `tests/integration/property.test.ts`, `tests/e2e/properties.spec.ts`.

### Contato e conversão
- `components/ContactForm.tsx` — substituiu o bloco de estimativa em AUD. Envia para `vinicius@ambern.dev`; link de WhatsApp `+55 53 98106 2741` na seção e no rodapé.

### Infra / correções
- `APP_ORIGIN` (novo env, default `https://chatbots.ambern.dev`) — define a origem pública do browser para que as requisições HTTPS continuem válidas atrás do proxy HTTP interno. Ver `.env.example` e `lib/security/validation.ts`.
- Fix de scroll: "Request a demo viewing" agora rola direto para o chatbot depois que o estado do imóvel renderiza; painel inicial cabe sem scroll manual (desktop 612px / mobile 566px).
- `app/api/chat/route.ts`, `lib/engine/index.ts`, `lib/engine/agents.ts`, `lib/types.ts` atualizados para calendário + imóveis.
- Screenshots regeneradas em `public/screenshots/` (dental, home-services, real-estate).
- `docs/deploy/RUNBOOK.md` — 6 novas seções documentando cada deploy do dia com imagem, container de rollback e verificação.

### Verificação registrada no runbook (último ciclo)
73 testes unit/integration + 12 E2E desktop/mobile passando; typecheck e build de produção OK; lint com 4 avisos não bloqueantes de `next/image`. Verificação pública em Chromium: label USD, vídeo `/properties/willow.mp4`, scroll até o assistente, sem overflow horizontal em 375px, as 4 rotas públicas em HTTP 200.

### Limpeza (2026-09-07)
- Arquivos de 0 byte de redirecionamento de shell quebrado (`'`, `8192`) apagados — eram só locais, nunca chegaram ao git.
- `.codex/` continua fora do git de propósito (config local do Codex CLI).

---

## 3. Bugs abertos — `TASK/items/` (lane `content-claims`)

Todos são lacunas entre o que o **contrato do case** exige e o que a página pública entrega.

| ID | Severidade | Resumo |
| --- | --- | --- |
| **F-301** | major | A página do case não tem screenshots reais — a seção "04 / VERIFICATION" só tem texto. As únicas `<img>` do HTML são o logo Ambern. O contrato §12 pede screenshots. (Já existem PNGs em `public/screenshots/` — falta usá-los na página.) |
| **F-302** | major | Nenhum resultado de teste executado na página: ela descreve áreas de cobertura e remete a um "delivery report" que não está na página nem é linkado. |
| **F-303** | major | Falta o link para o código público, mesmo o repositório sendo público (curl anônimo → 200). Nenhuma menção a "github" na página; a única ocorrência no projeto é o `docs/deploy/RUNBOOK.md:8`. |
| **F-304** | minor | `docs/chatbots/README.md` não tem seção de arquitetura e não linka o `ARCHITECTURE-PLAN.md` (que existe, mas é um plano pré-implementação). |
| **F-305** | minor | `docs/chatbots/README.md:23` só diz que CRM/e-mail/calendário/WhatsApp estão "intencionalmente ausentes"; o contrato §14 pede **como conectar** cada um (qual adapter/interface implementar, onde ficam webhooks e credenciais). |

Arquivo-fonte da página do case: `app/selected-work/small-business-chatbots/page.tsx`.

---

## 4. Próximos passos sugeridos (ordem)

1. **F-301 + F-302 + F-303 juntos** — são a mesma seção ("04 / VERIFICATION"): inserir os screenshots de `public/screenshots/`, publicar os resultados de teste executados (73 unit/integration + 12 E2E) e adicionar o link do repositório GitHub.
2. **F-304 / F-305** — reescrever `docs/chatbots/README.md` com seção de arquitetura (engine, agents, fluxo de request) + instruções reais de integração.
3. Rebuild da imagem e redeploy seguindo `docs/deploy/RUNBOOK.md` (build em `/root/chatbots-<tag>`, novo container, manter o anterior parado para rollback, validar nginx, checar as 4 rotas em 200).
4. Considerar merge de `feature/three-chatbot-portfolio-case` em `main` quando as F-30x fecharem.

---

## 5. Como retomar na outra máquina

```bash
git clone --branch feature/three-chatbot-portfolio-case \
  https://github.com/amberndev/small-business-chatbots.git
cd small-business-chatbots
npm ci
cp .env.example .env.local     # preencher; sem OPENROUTER_API_KEY o app roda em demoMode
npm run dev
```

Envs aceitas pelo servidor: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`, `DATABASE_URL`, `APP_ORIGIN`. **Nenhum valor secreto está no git** — copiar da máquina A ou do gerenciador de segredos.

Verificação local:
```bash
npm run test          # Vitest (unit + integration)
npx playwright test   # E2E
npm run build         # build de produção
```

Contexto adicional: `README.md`, `docs/deploy/RUNBOOK.md`, `docs/chatbots/README.md`, `AGENTS.md`.
