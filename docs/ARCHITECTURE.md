# Gamify Engage — Architecture

A production gamification platform: users register, are auto‑onboarded into a
gamification profile, earn **XP** by *participating* (not winning), level up,
climb **ranks**, complete **missions**, unlock **rewards/badges**, and compete
on real‑time **leaderboards** — with live **notifications**.

It deliberately mirrors the layering, naming and conventions of
`hamara-engage-backend` / `hamara-engage-frontend` and adds Redis + Socket.IO.

---

## 1. Tech stack

| Concern        | Choice |
|----------------|--------|
| Runtime        | Node.js 20 + TypeScript (strict, Node16 modules) |
| HTTP           | Express 4 |
| ORM / DB       | Sequelize 6 / PostgreSQL 15 |
| Cache / rank   | Redis 7 (`ioredis`) — leaderboard ZSETs, hot profile cache, rate‑limit buckets, refresh‑token allowlist |
| Realtime       | Socket.IO 4 (JWT handshake, per‑user rooms) |
| Auth           | JWT access (15m) + rotating refresh (7d) + RBAC |
| Validation     | Joi + `validate` middleware (422 envelope) |
| Events         | In‑process domain event bus (`EventEmitter`) — decouples engines |
| Docs           | swagger‑jsdoc + swagger‑ui at `/api/docs` |
| Security       | helmet, cors, express‑rate‑limit (Redis store), bcrypt, AES‑GCM password transport |
| Frontend       | React 18 + Vite + TS + Tailwind + react‑router v6 |

---

## 2. Layered request flow (unchanged from your standard)

```
HTTP request
  → route/*.routes.ts            URL + Swagger JSDoc
  → middleware                   rateLimit → auth → role → validate(Joi)
  → controller                   parse req, call service, format via responseHandler
  → service                      business logic, throws AppError
  → repository (BaseRepository)  data access (Sequelize)  + cache (Redis)
  → model                        Sequelize → PostgreSQL
                ↘ emits domain events → engines (xp/level/rank/mission/reward)
                                      → leaderboard (Redis) + notifications (Socket.IO)
```

Controllers keep the exact pattern from `auth.controller.ts`:
`try/catch` + `instanceof AppError` → `errorResponse`, else generic 500.

## 3. Event‑driven core (why)

XP, level, rank, missions and rewards are tightly chained
(*earn XP → maybe level up → maybe rank up → unlock rewards/missions →
notify → update leaderboard*). Hard‑wiring those calls inside one service
becomes unmaintainable. Instead, a single **domain event bus**
(`src/events/eventBus.ts`) carries typed events; each engine subscribes:

```
activity.recorded ─▶ XpEngine.award()
xp.awarded        ─▶ LevelEngine.evaluate()  + Leaderboard.add()  + MissionEngine.progress()
level.up          ─▶ RankEngine.evaluate()   + Notification.push()
rank.up           ─▶ RewardEngine.unlock()   + MissionEngine.unlock() + Notification.push()
mission.completed ─▶ XpEngine.award()        + RewardEngine.grant()  + Notification.push()
reward.granted    ─▶ Notification.push()
```

The bus is in‑process for now but the publisher/subscriber boundary is the
exact seam to swap for Redis Streams / BullMQ when horizontally scaling
(see `DEPLOYMENT.md`). Engine writes are wrapped in a single SQL transaction
per inbound activity to keep XP/level/rank atomic.

## 4. Folder structure (backend)

```
gamify-engage-backend/
├── docs/                              # these documents
├── src/
│   ├── app.ts                         # express wiring (helmet, cors, routes, swagger, errors)
│   ├── server.ts                      # bootstrap: db + redis + http + socket.io
│   │
│   ├── config/
│   │   ├── env.ts                     # typed, validated process.env (fail fast)
│   │   ├── db.ts                      # Sequelize instance (matches hamara db.ts)
│   │   ├── redis.ts                   # ioredis singleton
│   │   ├── associations.ts            # initAssociations()
│   │   ├── swagger.ts                 # swagger-jsdoc spec
│   │   └── syncDb.ts
│   │
│   ├── core/
│   │   └── models/base.repository.ts  # generic CRUD (your pattern) + cache helpers
│   │
│   ├── events/
│   │   ├── eventBus.ts                # typed EventEmitter
│   │   ├── events.ts                  # event name + payload contracts
│   │   └── registerHandlers.ts        # wires engines to bus once at boot
│   │
│   ├── realtime/
│   │   └── socket.ts                  # Socket.IO server, JWT handshake, emit helpers
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.ts         # access-JWT verify → req.user
│   │   ├── role.middleware.ts         # RBAC gate
│   │   ├── validate.middleware.ts     # Joi → 422
│   │   ├── rateLimit.middleware.ts    # express-rate-limit + Redis store
│   │   ├── audit.middleware.ts        # writes AuditLog for mutating routes
│   │   └── error.middleware.ts        # global handler
│   │
│   ├── modules/                       # one folder per feature (controller/service/model)
│   │   ├── auth/                      # register(+onboard), login, refresh, logout, reset
│   │   ├── user/                      # account
│   │   ├── (profile/ REMOVED — GamificationProfile model/table deleted; xp/level/rank/streak/coins no longer persisted)
│   │   ├── xp/                        # XpRule + XpHistory; XpEngine is now a no-op stub (no profile store)
│   │   ├── level/                     # LevelTier config only (LevelEngine removed — was profile-typed)
│   │   ├── rank/                      # RankTier config only (RankEngine removed — was profile-typed)
│   │   ├── mission/                   # Mission + UserMission + MissionEngine
│   │   ├── reward/                    # Reward + UserReward + RewardEngine (claim/expiry)
│   │   ├── achievement/              # Achievement/Badge + UserAchievement
│   │   ├── activity/                  # ActivityLog (ingest point that drives XP)
│   │   ├── leaderboard/              # Redis ZSET service (global/weekly/monthly/friends)
│   │   ├── notification/            # Notification model + realtime push
│   │   └── audit/                    # AuditLog read API
│   │
│   ├── route/                         # express routers + Swagger JSDoc
│   ├── validations/                   # Joi schemas per module
│   ├── seeders/                       # level tiers, rank tiers, xp rules, missions, rewards, admin
│   ├── migrations/                    # sequelize-cli migrations
│   ├── templates/                     # mail html
│   ├── types/                         # express.d.ts, request.type.ts, domain types
│   └── utils/                         # AppError, responseHandler, tokens, passwordCrypto, logger
├── .env.example
├── docker-compose.yml                 # postgres + redis (+ api)
├── package.json
└── tsconfig.json
```

Frontend structure mirrors `hamara-engage-frontend` exactly (see
`FRONTEND` section in `README.md`), with feature folders:
`auth, dashboard, profile, missions, rewards, leaderboard, rank, xp,
gameHistory, notifications`.

## 5. Module anatomy (every feature follows this)

```
modules/<feature>/
├── controller/<feature>.controller.ts   # thin: req → service → responseHandler
├── service/<feature>.service.ts          # business rules, throws AppError
└── model/
    ├── <feature>.model.ts                # Sequelize model (UUID pk, snake_case)
    └── <feature>.repository.ts           # `export default new XRepository()` extends BaseRepository
route/<feature>.routes.ts                 # mounts + Swagger + middleware chain
validations/<feature>.validation.ts       # Joi
```

Engines (`xp/level/rank/mission/reward`) live in the service layer of their
module and are invoked by `events/registerHandlers.ts`, never directly from
controllers — controllers only ingest *activity*.

## 6. Scalability seams

- **Read‑heavy profile/leaderboard** → Redis cache + ZSET, Postgres is source of truth.
- **Event bus** is the single integration point to move to a queue (BullMQ/Redis Streams) for multi‑instance.
- **Stateless API** (JWT + Redis refresh allowlist) → horizontal scale behind LB; Socket.IO uses Redis adapter for multi‑node fan‑out.
- **Indexing & partitioning** of high‑volume tables (`xp_history`, `activity_logs`) — see `DATABASE-SCHEMA.md`.
- **Engines are idempotent** per `(user, source, idempotency_key)` so retried activity never double‑awards XP.

See sibling docs: `DATABASE-SCHEMA.md`, `API-DESIGN.md`, `ENGINES.md`,
`AUTH-FLOW.md`, `REALTIME.md`, `SECURITY.md`, `DEPLOYMENT.md`.
