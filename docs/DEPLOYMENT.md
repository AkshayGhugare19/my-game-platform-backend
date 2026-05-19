# Scalable Deployment Strategy

## Topology

```
                 ┌──────────── CDN (static SPA: Vite build) ───────────┐
client ──HTTPS──▶ Load Balancer / WAF
                    │  (sticky not required: JWT stateless;
                    │   Socket.IO uses Redis adapter)
                    ▼
        ┌───────────────────────────┐   N stateless API replicas
        │  gamify-engage-backend     │   (Express + Socket.IO)
        └───────────────────────────┘
              │            │            │
              ▼            ▼            ▼
        PostgreSQL     Redis        (BullMQ workers — optional)
        (primary +     (cache,       async engine / cron:
         read replica) ZSET, pub/sub  expiry sweep, snapshots,
         + PITR)       refresh allow) mission resets
```

## Why it scales
- **Stateless API** (JWT + Redis refresh allowlist) → add replicas freely; LB
  needs no session affinity.
- **Socket.IO Redis adapter** → events fan out across all replicas.
- **Redis ZSET leaderboards** → O(log N) ranking, Postgres untouched on reads;
  cold‑rebuild job repopulates from `gamification_profiles`.
- **Event bus seam** → swap in‑process `EventEmitter` for **BullMQ/Redis
  Streams** to run engines in dedicated workers when activity volume grows;
  no controller/service changes (publish/subscribe contract is stable).
- **DB**: read replica for leaderboard/profile reads; monthly range
  **partitioning** of `xp_history` & `activity_logs`; connection pooling
  (PgBouncer) in front.

## Environments
`local` (docker-compose) → `staging` → `production`. Config only via env
(12‑factor); `config/env.ts` validates at boot.

## CI/CD
1. `npm ci` → `lint` → `tsc --noEmit` → tests
2. `npm audit --production`
3. Build Docker image (multi‑stage, non‑root, `dist/`)
4. Run `sequelize-cli db:migrate` as a pre‑deploy job (never `sync({force})`)
5. Rolling deploy; `/api/health` (DB+Redis ping) gates readiness
6. Seed configs idempotently (`db:seed`) — level/rank tiers, xp rules, missions

## docker-compose (local — shipped)
`postgres:15`, `redis:7`, `api` (dev). One command brings the full stack up.

## Dockerfile (prod, multi-stage)
```
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./ ; RUN npm ci
COPY . . ; RUN npm run build
FROM node:20-alpine
WORKDIR /app ; ENV NODE_ENV=production
COPY package*.json ./ ; RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node","dist/server.js"]
```

## Scaling cron / background work
- **Reward expiry sweep** (hourly) — `user_rewards GRANTED & expired → EXPIRED`
- **Mission period reset/expire** (00:00 UTC) — stale `IN_PROGRESS → EXPIRED`
- **Leaderboard snapshot** (hourly) — top‑N → `leaderboard_snapshots`
- **Refresh-token GC** (daily) — purge expired rows
Run as BullMQ repeatable jobs in worker dynos (single‑run guarded by Redis
lock) so multiple API replicas don't double‑execute.

## Observability
- Structured JSON logs (`utils/logger`), request id correlation
- `/api/health` (liveness) + `/api/health/ready` (DB+Redis)
- Metrics: p95 latency, XP events/s, socket connections, Redis hit‑rate
- Alerts: engine error rate, DB pool saturation, Redis memory, 5xx rate

## Capacity levers (in order)
1. Add API replicas (stateless)  2. Redis read scaling / cluster
3. PG read replica + PgBouncer   4. Move engines to BullMQ workers
5. Partition + archive high‑volume tables  6. Shard by tenant (multi‑brand)
