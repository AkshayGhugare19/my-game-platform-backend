# Gamify Engage

Production gamification platform inspired by Hamara Engage. Users register,
are **auto-onboarded** into a gamification profile, earn **XP by
participating** (never by winning), **level up**, climb **ranks**, complete
**missions**, unlock **rewards/badges**, compete on real-time
**leaderboards**, and receive live **notifications**.

Built to the exact architecture & coding standards of `hamara-engage-backend`
/ `hamara-engage-frontend` (route → middleware → controller → service →
repository → Sequelize model; `successResponse/errorResponse` envelope;
`AppError`; `BaseRepository`; JWT + RBAC; React 18 + Vite + Tailwind +
`apiService` + `AuthContext`), plus **Socket.IO** for realtime. Kept
deliberately simple: **PostgreSQL only, no Redis**.

```
c:\sdlc\sdlcengage\
  gamify-engage-backend\    Express + TS + Sequelize/PostgreSQL + Socket.IO
  gamify-engage-frontend\   React 18 + Vite + TS + Tailwind
```

## Documentation (`docs/`)
| Doc | Covers |
|---|---|
| ARCHITECTURE.md | system design, layering, event-driven core, folders |
| DATABASE-SCHEMA.md | all tables & indexes |
| API-DESIGN.md | every endpoint + envelope + middleware chain |
| ENGINES.md | XP / Level / Rank / Mission / Reward / Leaderboard logic |
| AUTH-FLOW.md | register+onboard, login, refresh rotation, RBAC |
| REALTIME.md | Socket.IO event flow, multi-node scaling |
| SECURITY.md | threat model + controls + prod checklist |
| DEPLOYMENT.md | scalable topology, CI/CD, Docker, cron |

## Run locally

> Simple stack — only **PostgreSQL** is required (no Redis). Ensure a local
> Postgres is running and a `gamify_engage` database exists.

```powershell
cd c:\sdlc\sdlcengage\gamify-engage-backend
copy .env.example .env
npm install
npm run db:migrate
npm run db:seed          # level/rank tiers, xp rules, missions, rewards, admin
npm run dev              # http://localhost:5001  ·  /api/docs
```

### Frontend
```powershell
cd c:\sdlc\sdlcengage\gamify-engage-frontend
copy .env.example .env
npm install
npm run dev              # http://localhost:5174
```

Seeded admin: `admin@test.com` / `123456`. Register a new user to see
auto-onboarding, then use the Dashboard **Play a game** button to watch
XP → level → rank → missions → rewards → leaderboard → notifications fire
end-to-end (REST response + live Socket.IO events).

## Deliverables → where
| Deliverable | Location |
|---|---|
| Architecture / DB schema / API / engine / auth / realtime / security / deploy | `docs/` |
| Backend folder structure | `src/` (see ARCHITECTURE.md §4) |
| Frontend folder structure | `gamify-engage-frontend/src/` |
| Auth + refresh + RBAC | `modules/auth`, `utils/tokens.ts`, `middlewares/` |
| XP / Level / Rank / Mission / Reward engines | `modules/{xp,level,rank,mission,reward}/service/*.engine.ts` |
| Event-driven chain | `events/` + `events/registerHandlers.ts` |
| Leaderboard (Postgres-backed) | `modules/leaderboard/service` |
| Realtime | `realtime/socket.ts` |
| Example APIs & models | `route/*.routes.ts` (Swagger), `modules/**/model` |
| Migrations & seeders | `src/migrations`, `src/seeders` |
| Deployment | `Dockerfile`, `docs/DEPLOYMENT.md` |

## Scope note
Per the agreed plan: full design docs + complete module scaffold + a fully
working **vertical slice** (auth→onboard→XP→level→rank→missions→rewards→
leaderboard→realtime→notifications). Admin CRUD for some config entities is
intentionally minimal but consistent — extend each by adding a
`controller/service` next to its existing model/repository following the same
pattern.
