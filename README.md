# Warden

Свой трекер задач. Монорепо: `apps/web` (React 19 + Vite + Tailwind 4), `apps/api` (Hono на Node),
`packages/db` (Drizzle + Postgres), `packages/shared` (общие типы и zod-схемы).

## Локально

```bash
npm install
cp .env.example .env          # DATABASE_URL, API_PORT
npm run db:migrate            # накатить миграции
npm run dev:api               # http://127.0.0.1:3100
npm run dev:web               # http://127.0.0.1:5200, /api проксируется в API
```

Postgres на Маке — `brew install postgresql@17`, роль и база `warden/warden`. На сервере — `docker compose up -d db`.
