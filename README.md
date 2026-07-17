# UDesign AI

AI-powered interior design platform: upload a room photo, generate on-brand
design concepts with AI, and continue the conversation with a real designer
on WhatsApp — powered by an AI design consultant that never loses context.

## Stack

- **Next.js 15** (App Router, Server Components) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + **Framer Motion** — brand design system, dark mode
- **PostgreSQL** + **Prisma** — leads, sessions, conversations, analytics
- **Google Gemini** — the "Mira" AI design consultant, with tool-calling for
  lead qualification, consultation booking, and real image understanding
  (free tier, no card required). Room-image generation defaults to a free
  branded placeholder; set `DESIGN_IMAGE_PROVIDER=openai` for real AI renders
  once you're ready to pay for that piece
- **Meta WhatsApp Cloud API** — webhook-driven, signature-verified messaging
- **jose** — Edge-compatible JWT admin authentication

## Project structure

```
app/
  (marketing)/        Public site: home, /pricing, /studio, /consultation
  admin/               Admin CRM (protected): leads, conversations, analytics
  api/                 Route handlers (events, ai/chat, upload, designs,
                       consultations, whatsapp/webhook, admin/*)
components/
  marketing/           Landing page sections
  studio/              AI room design studio
  chat/                Website chat widget
  whatsapp/            Floating WhatsApp button
  admin/               CRM dashboard UI
  ui/                  Shared primitives (Button, Container, ...)
hooks/                 Client hooks (session tracking)
lib/                   Config, validation, auth, prompt, scoring rules
services/              Business logic / integrations (Gemini, WhatsApp,
                       storage, lead scoring, analytics aggregation)
prisma/                schema.prisma + seed script
types/                 Shared TypeScript types
middleware.ts          Visitor session cookie + admin route protection
```

## Getting started

```bash
cp .env.example .env    # fill in your own values
npm install
npm run db:migrate      # creates tables in DATABASE_URL
npm run db:seed         # creates the first admin user
npm run dev
```

Open http://localhost:3000 for the site, http://localhost:3000/admin/login
for the CRM (seeded admin credentials are printed by `db:seed`, default
`admin@udesignai.com` / `ChangeMe123!` unless overridden via
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

### Required environment variables

See `.env.example` for the full list and comments. At minimum for local dev:

- `DATABASE_URL` — Postgres connection string
- `GEMINI_API_KEY` — powers the "Mira" AI design consultant (chat, tool
  calling, image understanding). Free at https://aistudio.google.com/apikey
- `ADMIN_JWT_SECRET` — random string for signing admin sessions
- `NEXT_PUBLIC_WHATSAPP_NUMBER` — number the floating button deep-links to
- `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` — only required to
  receive/send real WhatsApp messages via the Cloud API webhook

## How the WhatsApp context handoff works

1. `middleware.ts` assigns every visitor an anonymous `udsn` session cookie.
2. As visitors browse, `hooks/use-session-tracking.ts` and `trackEvent()`
   calls log page views, style/room selections, uploads and generated
   designs to `/api/events`, tied to that session.
3. The floating WhatsApp button (`components/whatsapp/floating-whatsapp-button.tsx`)
   builds a pre-filled first message summarizing what the visitor did, with
   a trailing `[ref: <sessionToken>]` tag.
4. When that message arrives at `/api/whatsapp/webhook`, the ref tag links
   the WhatsApp conversation back to the browsing session/lead, and
   `services/context-builder.ts` reconstructs everything known so far
   (uploaded photo, chosen style/room, pricing/consultation views, budget,
   timeline...) into the AI's system prompt — so the assistant never asks
   for information it already has, on either channel.

## Database

```bash
npm run db:migrate         # dev migrations
npm run db:migrate:deploy  # deploy migrations (CI/production)
npm run db:studio          # Prisma Studio GUI
npm run db:seed            # seed the first admin user
```

## Deployment

The app builds to a standalone Next.js server (`next.config.ts` sets
`output: "standalone"`), so it runs identically via Docker, Railway, Render
or Vercel.

### Docker / Docker Compose

```bash
docker compose up --build
```

Spins up Postgres, runs `prisma migrate deploy` once via the `migrate`
service, then starts the app on `:3000`. Uploaded/generated images persist
in the `udesignai_uploads` volume (`STORAGE_DRIVER=local`, the default).

### Railway / Render

`railway.json` and `render.yaml` are included — both build from the same
`Dockerfile` and run `prisma migrate deploy` as a release/pre-deploy step.
Provision a Postgres instance on the platform and set the environment
variables from `.env.example`.

### Vercel

Vercel's filesystem is ephemeral, so set `STORAGE_DRIVER=s3` and the `S3_*`
variables (uploaded photos and AI-generated designs need durable storage).
Use a managed Postgres provider (Neon, Supabase, Railway) for `DATABASE_URL`
and run `npm run db:migrate:deploy` as part of your deploy step.

## WhatsApp Cloud API setup

1. Create a Meta App with the WhatsApp product enabled, and a permanent
   access token + phone number ID.
2. Set `WHATSAPP_CLOUD_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`.
3. Pick a `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and configure the webhook URL in
   the Meta dashboard as `https://<your-domain>/api/whatsapp/webhook` with
   that same verify token. Subscribe to the `messages` field.
4. Incoming messages are signature-verified against `WHATSAPP_APP_SECRET`
   before processing.
