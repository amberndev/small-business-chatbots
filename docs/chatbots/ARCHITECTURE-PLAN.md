# ARCHITECTURE-PLAN — Case Ambern: AI Chatbots for Small Businesses

**Documento:** Plano de arquitetura definitivo (builder-ready)
**Projeto:** Case público de portfólio com três chatbots demonstrativos sobre um único motor configurável
**Data:** 2026-09-06
**Status:** Aprovado para implementação — nenhuma decisão estrutural resta em aberto

---

## 0. Premissas assumidas por ausência de repositório existente

O diretório `E:\Overclok\chatbot` é um greenfield vazio. Não há site, stack ou padrões pré-existentes da Ambern a reutilizar. As decisões abaixo foram tomadas pelo orquestrador e são **fixas** — o builder não deve reabri-las:

1. **Framework:** Next.js (App Router) + TypeScript estrito (`strict: true`) + Tailwind CSS.
2. **Backend:** exclusivamente em Next Route Handlers (`app/api/**`). Nenhum microserviço separado.
3. **LLM:** OpenRouter, chamado **somente no servidor**. Variáveis de ambiente (nomes apenas em `.env.example`, nunca valores): `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`.
4. **Modo demonstração determinístico (DEMO MODE):** ativado automaticamente quando `OPENROUTER_API_KEY` está ausente. Sinalizado de forma inequívoca na UI pelo componente `DemoModeBadge`. Respostas estáticas **nunca** são apresentadas como saída de IA.
5. **Persistência:** interface de repositório (`ChatRepository`) com dois adaptadores — PostgreSQL e in-memory (dev/testes). ORM: **Drizzle** (justificativa na §5.1). TTL curto + anonimização para demos públicas (§5.3).
6. **Testes:** Vitest (unit/integration) + Playwright (e2e, viewport mobile, `@axe-core/playwright` para a11y básica). Lint com ESLint; typecheck com `tsc --noEmit`.
7. **Git:** o builder executa `git init`, faz o commit inicial de scaffold e **imediatamente** cria a branch `feature/three-chatbot-portfolio-case`, onde todo o trabalho ocorre. Sem push ou deploy sem autorização explícita.
8. **Sem serviços pagos/fechados** (Voiceflow, Chatbase, Dialogflow etc.). Nenhuma chave em frontend ou Git.

---

## 1. Árvore de pastas completa

```
chatbot/
├── .env.example
├── .eslintrc.json
├── .gitignore
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── app/
│   ├── layout.tsx                     # layout raiz (fonte, tokens, metadata)
│   ├── page.tsx                       # home mínima com link para o case
│   ├── globals.css                    # tokens CSS + camadas Tailwind
│   ├── api/
│   │   └── chat/
│   │       └── route.ts               # POST /api/chat (único endpoint do motor)
│   ├── (demos)/
│   │   └── demos/
│   │       ├── layout.tsx             # layout comum das demos (DisclaimerBanner fixo)
│   │       ├── dental-chatbot/
│   │       │   └── page.tsx
│   │       ├── real-estate-chatbot/
│   │       │   └── page.tsx
│   │       └── home-services-chatbot/
│   │           └── page.tsx
│   └── selected-work/
│       └── small-business-chatbots/
│           └── page.tsx               # página do case
├── components/
│   ├── chat/
│   │   ├── ChatWidget.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   ├── QuickReplies.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── SummaryCard.tsx
│   │   └── SuccessState.tsx
│   ├── ui/
│   │   ├── DisclaimerBanner.tsx
│   │   ├── DemoModeBadge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   └── Badge.tsx
│   └── case/
│       ├── CaseHero.tsx
│       ├── DemoCard.tsx
│       ├── ArchitectureSection.tsx
│       └── EstimateCard.tsx
├── content/
│   └── chatbots/
│       ├── index.ts                   # registry: chatbotId -> ChatbotConfig
│       ├── dental.ts                  # BrightSmile Dental
│       ├── real-estate.ts             # Harbor Homes
│       └── home-services.ts           # FixRight Home Services
├── lib/
│   ├── types.ts                       # CONTRATO COMPARTILHADO entre as 3 lanes (§9.2)
│   ├── engine/
│   │   ├── engine.ts                  # orquestrador: recebe turno, roda FSM + agentes
│   │   ├── state-machine.ts           # FSM tipada (estados, eventos, transições)
│   │   ├── agents/
│   │   │   ├── router-agent.ts
│   │   │   ├── faq-agent.ts
│   │   │   ├── lead-qualification-agent.ts
│   │   │   ├── booking-agent.ts
│   │   │   └── human-handoff-agent.ts
│   │   └── schemas.ts                 # schemas zod das saídas estruturadas do LLM
│   ├── llm/
│   │   ├── provider.ts                # interface LlmProvider
│   │   ├── openrouter.ts              # adaptador OpenRouter (server-only)
│   │   └── demo-provider.ts           # provedor determinístico (DEMO MODE)
│   ├── db/
│   │   ├── repository.ts              # interface ChatRepository
│   │   ├── schema.ts                  # schema Drizzle (tabelas §5.2)
│   │   ├── postgres-adapter.ts
│   │   ├── memory-adapter.ts
│   │   ├── retention.ts               # TTL + anonimização (§5.3)
│   │   └── index.ts                   # factory: escolhe adaptador por env
│   └── security/
│       ├── rate-limit.ts              # limitador IP+sessão (in-memory, janela deslizante)
│       ├── sanitize.ts                # sanitização de entrada/saída
│       ├── prompt-guard.ts            # heurísticas anti prompt-injection
│       └── errors.ts                  # códigos de erro seguros (§3.4)
├── content/                           # (já listado acima — lane C)
├── docs/
│   └── chatbots/
│       ├── ARCHITECTURE-PLAN.md       # este documento
│       ├── README.md                  # setup, env, execução local, testes
│       ├── ADDING-A-CHATBOT.md        # como adicionar 4º chatbot por config
│       ├── INTEGRATIONS.md            # trocar simulação por agendamento real, CRM, e-mail, WhatsApp
│       └── DATA-PROTECTION.md         # TTL, anonimização, demo vs. implantação real
├── public/
│   └── screenshots/                   # capturas reais pós-implementação (QA)
└── tests/
    ├── unit/
    │   ├── router-agent.test.ts
    │   ├── faq-agent.test.ts
    │   ├── state-machine.test.ts
    │   ├── prompt-guard.test.ts
    │   ├── sanitize.test.ts
    │   └── rate-limit.test.ts
    ├── integration/
    │   ├── chat-api.test.ts
    │   ├── kb-isolation.test.ts
    │   ├── lead-capture.test.ts
    │   ├── booking-flow.test.ts
    │   ├── handoff-flow.test.ts
    │   ├── provider-failure.test.ts
    │   └── demo-mode.test.ts
    └── e2e/
        ├── dental.spec.ts
        ├── real-estate.spec.ts
        ├── home-services.spec.ts
        ├── case-page.spec.ts
        ├── mobile.spec.ts
        └── a11y.spec.ts
```

---

## 2. O motor único (single engine)

### 2.1 Princípio central

Um único motor (`lib/engine/engine.ts`) processa todos os turnos de conversa. A diferenciação entre os três chatbots vem **exclusivamente** de `ChatbotConfig` (lane C). O motor não contém nenhum conhecimento de negócio hard-coded.

**Invariante de segurança:** o LLM **nunca executa** operação sensível. Ele apenas **propõe** intents e payloads estruturados; o servidor valida com zod e decide se age. Persistência de lead, booking e handoff acontece só após transição válida da FSM + validação zod + confirmação explícita do usuário.

### 2.2 Tipos de configuração por chatbot (`lib/types.ts`, consumidos pela lane C)

```ts
export type ChatbotId = "dental" | "real-estate" | "home-services";

export interface ChatbotConfig {
  id: ChatbotId;
  businessName: string;              // ex.: "BrightSmile Dental" (fictício)
  tagline: string;
  theme: ChatbotTheme;               // identidade visual (§6.3)
  systemPrompt: string;              // prompt base, inclui restrições (ex.: recusa médica)
  knowledgeBase: KnowledgeEntry[];   // FAQ isolada por chatbotId
  quickReplies: string[];            // sugestões iniciais
  leadFields: LeadFieldSpec[];       // campos de qualificação, ordem e validação
  bookingServices: string[];         // serviços agendáveis (demo)
  guardrails: GuardrailSpec;         // recusas obrigatórias (ex.: diagnóstico médico)
  demoScript: DemoScriptEntry[];     // respostas determinísticas do DEMO MODE
}

export interface KnowledgeEntry { topic: string; question: string; answer: string; keywords: string[]; }
export interface LeadFieldSpec { key: string; label: string; required: boolean; validate: "text" | "phone" | "email" | "number" | "enum"; options?: string[]; }
export interface GuardrailSpec { refusalTopics: string[]; refusalMessage: string; }
export interface DemoScriptEntry { match: RegExp | string; response: string; intent: Intent; }
```

### 2.3 Máquina de estados tipada (`lib/engine/state-machine.ts`)

FSM discriminada por união de tipos — sem biblioteca externa (XState é dispensável neste escopo; a FSM tem < 10 estados e transições explícitas são mais auditáveis):

```ts
export type ConversationState =
  | { kind: "idle" }
  | { kind: "faq" }
  | { kind: "lead_qualification"; collected: Partial<Record<string, string>>; nextFieldIndex: number }
  | { kind: "lead_confirmation"; collected: Record<string, string> }
  | { kind: "booking"; collected: Partial<BookingDraft> }
  | { kind: "booking_confirmation"; draft: BookingDraft }
  | { kind: "handoff_pending"; reason: string }
  | { kind: "completed"; outcome: "lead" | "booking" | "handoff" };

export type ConversationEvent =
  | { type: "USER_MESSAGE"; text: string }
  | { type: "INTENT_DETECTED"; intent: Intent }
  | { type: "FIELD_COLLECTED"; key: string; value: string }
  | { type: "USER_CONFIRMED" }
  | { type: "USER_REJECTED" }
  | { type: "RESET" };

export type Intent = "faq" | "lead" | "booking" | "handoff" | "out_of_scope" | "refusal_required";
```

A função `transition(state, event, config): ConversationState` é **pura e exaustiva** (switch com `never` check) — 100% testável sem LLM. O estado da conversa vive no servidor (tabela `sessions.state`, JSON validado por zod ao carregar), nunca é confiado ao cliente.

### 2.4 Agentes como módulos (`lib/engine/agents/`)

Cada agente é uma função pura async com a mesma assinatura: `(ctx: AgentContext) => Promise<AgentResult>`. Nenhum agente acessa o banco diretamente — retornam propostas; `engine.ts` decide.

| Agente | Responsabilidade | Saída estruturada (zod) |
|---|---|---|
| `RouterAgent` | Classifica a intenção do turno (`Intent`). Em DEMO MODE usa matching determinístico do `demoScript`. | `RouterOutputSchema: { intent, confidence }` |
| `FAQAgent` | Responde **somente** com base em `knowledgeBase` do chatbot ativo. Sem match confiável ⇒ responde que não sabe e oferece handoff. | `FaqOutputSchema: { answer, sourceTopic \| null, grounded: boolean }` |
| `LeadQualificationAgent` | Coleta `leadFields` gradualmente (um por turno), extrai valores da mensagem, pede confirmação antes de salvar. | `LeadExtractionSchema: { fieldKey, value \| null, needsClarification }` |
| `BookingAgent` | Coleta serviço, data e período. Registra **solicitação demonstrativa**; nunca promete disponibilidade real. | `BookingExtractionSchema: { service?, date?, period?, complete: boolean }` |
| `HumanHandoffAgent` | Detecta pedido de humano, registra motivo, informa o próximo passo (demo). | `HandoffOutputSchema: { reason, message }` |

### 2.5 Validação de saída estruturada (`lib/engine/schemas.ts`)

Toda resposta do LLM que alimente decisão do motor passa por `schema.safeParse()`. Falha de parse ⇒ retry único com instrução de correção; segunda falha ⇒ fallback seguro (mensagem genérica + oferta de handoff), **nunca** execução parcial. O texto livre do modelo jamais é interpolado em SQL, comandos ou transições — só os campos validados.

### 2.6 Fluxo de um turno

```
POST /api/chat
  → rate-limit (IP+sessão) → sanitize + limite de tamanho → prompt-guard
  → carrega sessão + estado FSM (repository)
  → RouterAgent classifica intent
  → transition(state, INTENT_DETECTED)
  → agente especialista do estado atual produz proposta (validada por zod)
  → engine aplica efeitos SOMENTE se FSM permitir (ex.: salvar lead exige estado lead_confirmation + USER_CONFIRMED)
  → persiste mensagens + novo estado → responde
```

---

## 3. Contrato da API `/api/chat`

Endpoint único: `POST /api/chat`. Sem GET, sem streaming na v1 (resposta completa por turno; simplifica validação zod da saída inteira).

### 3.1 Request

```ts
// zod: ChatRequestSchema
{
  chatbotId: "dental" | "real-estate" | "home-services",  // enum fechado
  sessionId: string | null,   // uuid v4; null no primeiro turno (servidor cria)
  message: string,            // 1..1000 caracteres após trim
  consentAcknowledged: boolean // true obrigatório a partir do primeiro turno
}
```

### 3.2 Response (200)

```ts
{
  sessionId: string,
  reply: { role: "assistant", text: string },
  stateKind: string,                 // kind da FSM (para a UI renderizar SummaryCard/SuccessState)
  quickReplies: string[],            // sugestões contextuais
  summary?: Record<string, string>,  // presente em *_confirmation (alimenta SummaryCard)
  outcome?: "lead" | "booking" | "handoff", // presente em completed (alimenta SuccessState)
  demoMode: boolean                  // true quando sem OPENROUTER_API_KEY (alimenta DemoModeBadge)
}
```

### 3.3 Regras de proteção

| Proteção | Especificação |
|---|---|
| **Rate limiting** | Janela deslizante in-memory: 20 req/min por IP **e** 15 req/min por sessionId (o mais restritivo vence). Excedido ⇒ 429 + `Retry-After`. Implementação em `lib/security/rate-limit.ts`; documentar que em produção multi-instância seria Redis/Upstash. |
| **Tamanho de mensagem** | 1–1000 chars pós-trim (zod). Vazia ⇒ 400 `EMPTY_MESSAGE`; excedente ⇒ 400 `MESSAGE_TOO_LONG`. Corpo HTTP > 16 KB ⇒ 413. |
| **Prompt injection** | (a) delimitação: mensagem do usuário sempre embrulhada em bloco marcado como dado não confiável no prompt; (b) `prompt-guard.ts` com heurísticas (padrões "ignore previous instructions", "system prompt", tentativa de mudar persona) ⇒ resposta neutra sem passar ao LLM; (c) system prompt reforça que instruções do usuário nunca sobrescrevem regras; (d) saída validada por zod — injeção bem-sucedida não consegue executar nada porque o LLM só propõe. |
| **Isolamento de KB** | O motor só carrega `config.knowledgeBase` do `chatbotId` do request; nenhum caminho de código concatena bases. `sessionId` é vinculado ao `chatbotId` na criação — request com par divergente ⇒ 403 `SESSION_CHATBOT_MISMATCH`. Teste dedicado (`kb-isolation.test.ts`). |
| **Sanitização** | Entrada: trim, normalização unicode, strip de controle. Saída: renderização como texto puro no cliente (nunca `dangerouslySetInnerHTML`). |
| **Consent** | `consentAcknowledged !== true` ⇒ 400 `CONSENT_REQUIRED`. Persistido na sessão. |
| **Logging** | Sem conteúdo de mensagens em logs; apenas ids, timestamps, códigos de erro e latência. |

### 3.4 Códigos de erro seguros (nunca vazam stack/detalhes internos)

```
400 INVALID_REQUEST | EMPTY_MESSAGE | MESSAGE_TOO_LONG | CONSENT_REQUIRED | UNKNOWN_CHATBOT
403 SESSION_CHATBOT_MISMATCH
404 SESSION_NOT_FOUND
413 PAYLOAD_TOO_LARGE
429 RATE_LIMITED           (+ Retry-After)
502 PROVIDER_ERROR          (falha/timeout do OpenRouter; timeout de 20s; mensagem genérica)
500 INTERNAL_ERROR
```

Formato: `{ error: { code: string, message: string } }` — `message` sempre genérica e amigável.

---

## 4. Persistência

### 4.1 Decisão: Drizzle ORM (vs. pg + SQL cru)

**Escolha: Drizzle.** Justificativa:

1. **Type-safety ponta a ponta:** o schema Drizzle gera tipos TS que alimentam diretamente `lib/types.ts` — coerente com a exigência de FSM e contratos tipados; SQL cru exigiria manter tipos manualmente sincronizados (fonte clássica de drift).
2. **Migrações versionadas** (`drizzle-kit`) entram no Git — essencial num case público que terceiros vão clonar e rodar.
3. **Custo próximo de zero:** Drizzle é uma camada fina (SQL-like, sem query builder mágico nem runtime pesado como Prisma engine), adequada ao volume trivial de uma demo.
4. **O adaptador in-memory não depende do ORM:** implementa a interface `ChatRepository` com `Map`s — Drizzle fica confinado a `postgres-adapter.ts` + `schema.ts`.

### 4.2 Schema de dados (`lib/db/schema.ts`)

```
sessions
  id uuid PK · chatbot_id text NOT NULL · state jsonb NOT NULL (FSM serializada)
  consent_acknowledged boolean NOT NULL DEFAULT false
  created_at timestamptz · updated_at timestamptz · expires_at timestamptz

messages
  id uuid PK · session_id uuid FK→sessions · chatbot_id text NOT NULL
  role text CHECK (role IN ('user','assistant')) · content text
  created_at timestamptz

leads
  id uuid PK · session_id uuid FK · chatbot_id text NOT NULL
  fields jsonb NOT NULL (pares campo→valor validados)
  confirmed_at timestamptz · created_at timestamptz · anonymized boolean DEFAULT false

booking_requests
  id uuid PK · session_id uuid FK · chatbot_id text NOT NULL
  service text · preferred_date text · preferred_period text
  status text DEFAULT 'demo_requested' · created_at timestamptz · anonymized boolean DEFAULT false

handoff_requests
  id uuid PK · session_id uuid FK · chatbot_id text NOT NULL
  reason text · created_at timestamptz · anonymized boolean DEFAULT false
```

Todas as tabelas carregam `chatbot_id` para consultas isoladas por demo. Índices: `messages(session_id)`, `sessions(expires_at)`.

### 4.3 Retenção e anonimização (decisão documentada)

- **TTL curto:** `sessions.expires_at = created_at + 24h`. Job de limpeza (`lib/db/retention.ts`, invocado on-request com throttle — sem cron externo): sessões expiradas têm `messages` **apagadas** e `leads`/`booking_requests`/`handoff_requests` **anonimizados** (valores substituídos por `"[redacted]"`, flag `anonymized = true`), preservando apenas contagens para a página do case.
- **Racional:** demos públicas não devem reter dados pessoais; visitantes são instruídos (DisclaimerBanner) a não inserir dados reais, e mesmo assim o sistema expira tudo em ≤ 24h. Esta decisão é replicada em `docs/chatbots/DATA-PROTECTION.md`.
- **Sem dados sensíveis por design:** nenhum campo de qualificação pede documento, endereço exato ou dado de saúde.

---

## 5. Rotas de página

| Rota | Conteúdo |
|---|---|
| `/demos/dental-chatbot` | Demo BrightSmile Dental: hero com identidade própria, descrição do negócio fictício, `ChatWidget`, `DisclaimerBanner`, link de volta ao case |
| `/demos/real-estate-chatbot` | Demo Harbor Homes (idem, tema próprio) |
| `/demos/home-services-chatbot` | Demo FixRight Home Services (idem, tema próprio) |
| `/selected-work/small-business-chatbots` | Página do case (§7) |
| `/` | Home mínima com link para o case (evita 404 na raiz) |

As três páginas de demo são o **mesmo template** parametrizado por `ChatbotConfig` — reforça a narrativa "um motor, três negócios".

---

## 6. Design system mínimo Ambern

### 6.1 Tokens (CSS variables em `globals.css`, mapeadas no `tailwind.config.ts`)

```
--ambern-bg: #0B0D12          --ambern-surface: #151823
--ambern-text: #F4F6FB        --ambern-text-muted: #9AA3B5
--ambern-accent: #6C8CFF      --ambern-border: #262B3A
--radius-widget: 16px         --radius-bubble: 12px
--shadow-widget: 0 8px 32px rgb(0 0 0 / .35)
--space-1..-6: 4/8/12/16/24/32px
```

### 6.2 Tipografia

- **Display/headings:** Inter (via `next/font`), pesos 600/700.
- **Body/chat:** Inter 400/500, `16px` base, `line-height 1.6`.
- **Mono (badges técnicos):** JetBrains Mono 400.

### 6.3 Identidade visual por chatbot (campo `theme` do config)

```ts
export interface ChatbotTheme {
  primary: string; primarySoft: string; accent: string;
  avatarEmoji: string; headerGradient: string;
}
```

| Chatbot | Primária | Personalidade visual |
|---|---|---|
| BrightSmile Dental | `#0EA5A4` (teal clínico) | Limpo, claro, arredondado; avatar 🦷 |
| Harbor Homes | `#1E3A8A` (navy) + `#C9A227` (dourado) | Sóbrio, premium; avatar 🏠 |
| FixRight Home Services | `#EA580C` (laranja utilitário) | Direto, robusto; avatar 🔧 |

O tema é aplicado via CSS variables com escopo no wrapper da demo — os componentes de chat são theme-agnostic.

### 6.4 Componentes obrigatórios (`components/`)

| Componente | Contrato |
|---|---|
| `ChatWidget` | Container completo: header temático, `MessageList`, `TypingIndicator`, `QuickReplies`, `ChatInput`, botão de reiniciar conversa, histórico em memória da sessão. Props: `{ config: ChatbotClientConfig }` |
| `QuickReplies` | Chips clicáveis; enviam o texto como mensagem. Props: `{ options: string[], onSelect }` |
| `TypingIndicator` | Três pontos animados enquanto aguarda `/api/chat` |
| `SummaryCard` | Renderiza `response.summary` (pares campo→valor) + botões Confirmar/Corrigir antes de persistir lead/booking |
| `SuccessState` | Estado final pós-captura (`response.outcome`): confirmação visual + próximo passo + reiniciar |
| `DisclaimerBanner` | Texto permanente do disclaimer (§7), fixo em todas as demos, não dispensável |
| `DemoModeBadge` | Badge visível quando `response.demoMode === true`: "Demo mode — respostas roteirizadas, sem IA ao vivo". Nunca omitido em demo mode |

Acessibilidade mínima: chat como `role="log"` + `aria-live="polite"`, foco gerenciado no input, contraste AA, alvos de toque ≥ 44px, navegação por teclado completa.

---

## 7. Página do case — conteúdo obrigatório

Rota `/selected-work/small-business-chatbots`, título: **"AI Chatbots for Small Businesses"**.

Seções, na ordem:

1. **Hero** com título e resumo do problema comercial (pequenas empresas perdem leads fora do horário comercial).
2. **Solução Ambern:** um motor configurável, três negócios fictícios.
3. **Três cards de demo** (`DemoCard`) com botão "Try the demo" para cada rota.
4. **Tecnologias:** Next.js, TypeScript, Tailwind, OpenRouter (server-side), Drizzle/PostgreSQL, Vitest, Playwright.
5. **Arquitetura compartilhada + explicação dos agentes** (Router/FAQ/Lead/Booking/Handoff) — diagrama simples.
6. **Fluxos:** captura de leads, agendamento demonstrativo, transferência humana.
7. **Segurança e privacidade:** chaves só no servidor, validação, rate limiting, TTL de 24h, anonimização.
8. **Limitações das demonstrações:** agendamento simulado, sem integração real de calendário/CRM.
9. **Screenshots reais** (adicionados pelo QA após implementação, `public/screenshots/`).
10. **Testes executados** (resumo da matriz §8).
11. **Estimativas comerciais** (`EstimateCard`), rotuladas literalmente como estimativas:
    - "Typical implementation estimate: **AUD $750–$1,500**"
    - "Typical delivery estimate: **7–10 business days**"
    - Acompanhadas da nota: valores são estimativas para uma implantação semelhante; **não** representam montantes pagos por clientes.
12. **CTA** para contato com a Ambern.

**Regras editoriais invioláveis:**
- Nenhum cliente, depoimento, métrica, resultado, custo passado ou data passada inventados.
- Deixar explícito que são demonstrações de portfólio, não trabalhos de clientes.
- Disclaimer permanente, texto **exato**, presente na página do case e em todas as demos:

> **"Portfolio demonstration created by Ambern. This is not a client deployment. Please do not enter real or sensitive personal information."**

---

## 8. Matriz de testes (brief §13 → arquivos concretos)

| Item do brief | Arquivo(s) | Tipo |
|---|---|---|
| Roteamento de intenções | `tests/unit/router-agent.test.ts` | unit |
| Respostas de FAQ | `tests/unit/faq-agent.test.ts` | unit |
| Perguntas fora do escopo | `tests/unit/faq-agent.test.ts` (casos `grounded:false`) | unit |
| Isolamento das três bases | `tests/integration/kb-isolation.test.ts` | integration |
| Captura e confirmação de leads | `tests/integration/lead-capture.test.ts` + `tests/unit/state-machine.test.ts` | int + unit |
| Solicitação de agendamento | `tests/integration/booking-flow.test.ts` | integration |
| Transferência humana | `tests/integration/handoff-flow.test.ts` | integration |
| Recusa de aconselhamento médico | `tests/integration/chat-api.test.ts` (guardrails dental) | integration |
| Tentativas de prompt injection | `tests/unit/prompt-guard.test.ts` + caso e2e em `dental.spec.ts` | unit + e2e |
| Mensagens vazias/excessivas | `tests/integration/chat-api.test.ts` (400s) | integration |
| Falha/timeout do provedor | `tests/integration/provider-failure.test.ts` (mock 502/timeout) | integration |
| Ausência de env var | `tests/integration/demo-mode.test.ts` (demo mode + badge flag) | integration |
| Rate limiting | `tests/unit/rate-limit.test.ts` + caso 429 em `chat-api.test.ts` | unit + int |
| Renderização mobile | `tests/e2e/mobile.spec.ts` (viewport 375×667, os 3 widgets) | e2e |
| Acessibilidade básica | `tests/e2e/a11y.spec.ts` (axe nas 4 rotas) | e2e |
| Build de produção | `next build` no pipeline de conclusão (não é arquivo de teste) | build |

Integração usa **sempre** o `memory-adapter` + `demo-provider` (determinístico, sem rede). Gate de conclusão: `lint` + `tsc --noEmit` + `vitest run` + `playwright test` + `next build`, todos verdes.

---

## 9. FILE-OWNERSHIP MAP — 3 lanes paralelas + QA

### 9.1 Divisão sem sobreposição

| Lane | Dono de (exclusivo) |
|---|---|
| **A — Chat Engine** | `lib/engine/**`, `lib/llm/**`, `lib/db/**`, `lib/security/**`, `app/api/**`, `.env.example`, `drizzle.config.ts` |
| **B — Frontend/UX** | `app/(demos)/**`, `app/selected-work/**`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `components/**`, `tailwind.config.ts` (tokens) |
| **C — Knowledge/Flows** | `content/chatbots/*.ts` — bases de conhecimento fictícias, FAQs, campos de qualificação, system prompts, quick replies e demo scripts dos 3 negócios |
| **QA (bloco final)** | `tests/**`, `docs/chatbots/README.md` + `ADDING-A-CHATBOT.md` + `INTEGRATIONS.md` + `DATA-PROTECTION.md`, `public/screenshots/**` |

`lib/types.ts` é escrito **primeiro, uma única vez**, a partir das interfaces deste documento (§2.2, §2.3, §3.1–3.2, §6.3) — depois disso é **read-only** para as três lanes; qualquer mudança de contrato passa pelo coordenador. Arquivos de scaffold (`package.json`, configs) pertencem ao commit inicial do coordenador, antes das lanes.

### 9.2 Interfaces compartilhadas (`lib/types.ts`) — o contrato que desacopla as lanes

```ts
// Identidade e config (produzido por C, consumido por A e B)
ChatbotId, ChatbotConfig, ChatbotTheme, KnowledgeEntry, LeadFieldSpec,
GuardrailSpec, DemoScriptEntry

// FSM e engine (produzido por A, consumido por testes)
ConversationState, ConversationEvent, Intent, BookingDraft

// Contrato HTTP (produzido por A, consumido por B)
ChatRequest, ChatResponse, ChatErrorCode, ChatErrorResponse

// Subconjunto seguro para o cliente (consumido por B; sem systemPrompt/KB)
ChatbotClientConfig  // { id, businessName, tagline, theme, quickReplies }
```

Com isso: **B** constrói o widget contra `ChatRequest`/`ChatResponse` mockando fetch; **C** escreve configs contra `ChatbotConfig` sem tocar no motor; **A** desenvolve o motor testando com um config fixture mínimo — nenhuma lane espera outra.

### 9.3 Sequência de build

```
0. Coordenador: git init → scaffold (Next+TS+Tailwind+configs) → commit inicial
   → branch feature/three-chatbot-portfolio-case → escreve lib/types.ts
1. Lanes A, B, C em PARALELO (arquivos disjuntos, contrato congelado)
2. Integração: B troca mocks pelo /api/chat real; C registrado no registry
3. QA: testes, screenshots reais, docs, lint+typecheck+vitest+playwright+build
```

---

*Documento produzido pela Ambern para uso interno de implementação. As demonstrações descritas são fictícias e destinadas exclusivamente a portfólio.*
