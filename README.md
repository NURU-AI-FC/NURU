# NURU

NURU is an AI financial copilot for Zenith Bank customers, built for Zecathon 6.0 on the track
"Turning Customer Financial Data into Actionable Insights". It reads a customer's linked accounts and
explains where the money goes, what is coming up and how to save more, in English, Yorùbá, Igbo and Hausa.

## Try it

| | |
|---|---|
| Customer | `judge@nuru.app` / `Zecathon-2026` |
| Bank staff (console admin) | `staff@nuru.app` / `Zecathon-2026`, or code only at `/console/login` |
| NURU HQ owner | `ceo@nuru.app` / `Zecathon-2026` (Bolaji Jimoh), or code only at `/hq/login` |
| NURU HQ operations | `ops@nuru.app` / `Zecathon-2026` |
| One time code | `000000` (demo mode) |
| Transaction PIN | the customer creates one on their first transfer |

All data is sandbox data: twelve months of seeded transactions across Zenith, OPay (Mono sandbox) and Kuda,
plus a business account for Kemi Foods Ltd. No real money moves.

## What is inside

```
apps/web        React + Vite + TypeScript web app (light, dark and system themes, 4 languages)
services/api    Go API: auth, accounts, analytics, transfers, business tools, encrypted chat
services/ai     Python FastAPI: finance-only guard, Claude answers, number check, template fallback
design          Generator for the Figma file (every screen in light and dark)
```

**Features:** daily, weekly, monthly and yearly analytics; a three month comparison; a 30 day balance forecast;
spending heat map; insights on overspending and subscriptions; Ask NURU chat with voice input and read aloud;
transfers from inside the chat ("send ₦25,000 to Tunde") with a PIN created on the first transfer and a face check enrolled once and matched on every transfer, pausing after 3 failed checks; live currency conversion; loans with interest and repayment dates;
investments and pension; business payroll with PAYE and pension, cash runway, advertising spend, funding and
investor meetings; reminders; a bank staff console with anonymised insights and an AI safety log.

**Security:** Argon2id passwords and PINs, OTP on every sign in, rate limits, passkeys, face recognition on every transfer (a 128 number template computed in the browser, encrypted per user, never a photo),
BVN or NIN check that keeps only the last 4 digits, AES-256-GCM chat encryption with a key per user, account
numbers masked before anything reaches the model.

**AI guardrails:** an input check that allows money questions only and catches prompt injection (including
look-alike characters), a locked system prompt, the model sees only a masked snapshot of numbers we computed,
an output check that rejects answers with naira figures that are not in the data, and a security log of every
blocked attempt. Claude (`claude-opus-5-5`) runs with server-side fallbacks enabled, so a declined request is
retried on Anthropic's recommended fallback model inside the same call. Without an `ANTHROPIC_API_KEY` the
service answers from templates, so the demo always works.

## Run it locally

```bash
docker compose up --build
```

Open http://localhost:3000. To use Claude, put `ANTHROPIC_API_KEY=...` in a `.env` file next to
`docker-compose.yml` first.

Without Docker: run Postgres, then

```bash
cd services/api && DATABASE_URL=postgres://nuru:nuru@localhost:5432/nuru?sslmode=disable \
  JWT_SECRET=dev-secret-dev-secret DATA_KEY=$(openssl rand -hex 32) go run ./cmd/api
cd services/ai && pip install -r requirements.txt && uvicorn main:app --port 8000
cd apps/web && npm install && npm run dev
```

## Do we need Hermes, n8n or Docker?

- **Docker:** optional. It is the one command way to run everything; the hosted demo does not need it on your machine.
- **n8n:** no. Reminders live in the API.
- **Hermes:** no. It is React Native's JavaScript engine and only matters for the mobile app, where Expo turns it on.

## Environment

| Service | Variable | Notes |
|---|---|---|
| api | `DATABASE_URL` | Postgres connection string |
| api | `JWT_SECRET` | at least 16 characters |
| api | `DATA_KEY` | 64 hex characters, encrypts chats |
| api | `AI_URL` | where `services/ai` runs |
| api | `WEB_ORIGINS` | comma separated allowed origins |
| api | `DEMO_MODE` | `true` creates the demo accounts and uses code 000000 |
| api | `UPTIMEROBOT_API_KEY` | optional, 30 day uptime on NURU HQ's platform health |
| api | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | optional, unresolved errors on NURU HQ |
| api | `RESEND_API_KEY` | optional, marks email sending as connected on NURU HQ (sending itself is not wired yet) |
| api | `REDIS_URL` | optional, Upstash `rediss://` URL. Keeps NURU HQ request metrics across restarts, sign-in rate limits across instances, and caches HQ and console totals for 45 seconds. Empty or unreachable: all of it runs in memory as before |
| dbcopy | `SUPABASE_DB_URL` | only for the one-off move to Supabase, see below |
| api, ai | `RAILWAY_GIT_COMMIT_SHA`, `RAILWAY_GIT_COMMIT_MESSAGE` | set by Railway, shown as the latest release on NURU HQ |
| ai | `ANTHROPIC_API_KEY` | optional, enables Claude answers |
| ai | `KNOWLEDGE_DB_URL` | optional, Postgres with pgvector (Supabase). When its `knowledge_chunks` table has rows, Claude answers get the closest guides. Best as a read only role |
| web | `VITE_API_URL` | API address at build time, empty to use the `/api` proxy |

## Moving to Supabase and Upstash

Everything below is ready in the code and switches on when the variables are set; with none of them set NURU runs exactly as it does on Railway today.

**Postgres to Supabase.** Migration `020` turns on pgvector and adds `knowledge_chunks` (384 dimension embeddings, HNSW index) where the extension exists; on Railway's Postgres it does nothing. To move the data:

1. In Supabase, copy the connection string from Connect, using the direct connection or the session pooler (port 5432). The transaction pooler (6543) does not suit COPY or the API's prepared statements. Keep `sslmode=require`.
2. Stop writes for a few minutes: scale the Railway API service to zero, or leave it up only if you accept losing what is written during the copy.
3. Copy:
   ```bash
   cd services/api
   DATABASE_URL='<railway url>' SUPABASE_DB_URL='<supabase url>' go run ./cmd/dbcopy
   ```
   It runs the migrations on Supabase, then in one transaction empties and fills every table in foreign key order, sets the sequences, and prints source and target row counts side by side. It exits non-zero if any count differs. Running it again is safe; if Supabase already has users it asks for `-overwrite`. `-dry-run` shows the plan only.
4. Set the API's `DATABASE_URL` to the Supabase value and redeploy. Check sign in and NURU HQ.
5. Keep the Railway Postgres service as the backup. Do not delete it until Supabase has run for a while; to roll back, point `DATABASE_URL` at Railway again.

**Knowledge for answers.** Set `KNOWLEDGE_DB_URL` on the AI service, then load guides (markdown or text):
```bash
cd services/ai && KNOWLEDGE_DB_URL='<supabase url>' python knowledge.py ingest docs/guides/*.md
```
Embeddings are made locally by feature hashing (no model download, no paid API). It matches shared words and word pieces rather than meaning; swapping in a 384 dimension sentence model is one function in `knowledge.py`, followed by a fresh ingest.

**Redis on Upstash.** Create a Redis database, copy its `rediss://` TCP URL into the API's `REDIS_URL` and redeploy. The API logs `cache: using redis` on start. If Redis goes away it logs once and carries on in memory, retrying every 30 seconds.

## Team

See [docs/TEAM.md](docs/TEAM.md).
