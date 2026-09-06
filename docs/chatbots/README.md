# Ambern chatbot demos

This project is a public portfolio demonstration of one configurable conversation engine serving three fictional businesses. It is not a client deployment; use made-up details only.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Without `OPENROUTER_API_KEY`, the app runs deterministic, clearly labelled Demo Mode. With a key, the server asks OpenRouter only to classify a question against the active business knowledge base; the server retains all workflow and confirmation decisions.

Run checks with `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`. E2E tests use a mobile viewport, axe checks, and create verification screenshots in `public/screenshots/`.

## Adding a chatbot

Create a typed `ChatbotConfig` in `content/chatbots/`, add it to the registry and closed `ChatbotId` union, then add a demo route that passes only `ChatbotClientConfig` to `ChatWidget`. Keep knowledge bases isolated by configuration and add route, flow, and accessibility tests.

## Production integrations

`ChatRepository` has in-memory and PostgreSQL adapters. Run `lib/db/migrations/0001_chatbots.sql` against PostgreSQL and provide `DATABASE_URL`; expired rows are pruned on access and should also be removed by an hourly production scheduler. Replace `BookingAgent`'s simulated `record` call with a separately authenticated calendar or CRM adapter after adding consent, retries, audit logging, and provider webhooks. Email, WhatsApp, CRM and calendar integrations are intentionally absent from this portfolio demo.

The database schema stores consent and anonymised request fields, with a 24-hour TTL. Logs contain session identifiers and roles only, never message text or submitted values.
