# API Design

Base URL: `/api`. Envelope (your `responseHandler`):

```jsonc
// success
{ "success": true,  "message": "...", "data": <T>,      "timestamp": "ISO" }
// error
{ "success": false, "message": "...", "errors": <any>,   "timestamp": "ISO" }
// validation (422, from validate middleware)
{ "success": false, "message": "Validation failed", "errors": { "field": "msg" } }
```

Auth header: `Authorization: Bearer <accessToken>`. Pagination params
`?page&limit` → `{ data:[], pagination:{ total,page,limit,totalPages } }`.

## Auth — `/api/auth`
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/register` | first_name,last_name,email,mobile,password | creates user **+ gamification profile** (onboarding), returns user |
| POST | `/login` | email,password(AES‑GCM) | → `{ accessToken, refreshToken, user }` |
| POST | `/refresh` | refreshToken | rotates refresh, returns new pair |
| POST | `/logout` | refreshToken | revokes (db + Redis allowlist) |
| POST | `/reset-password` | email,token,new_password | |
| GET  | `/me` | — | auth; current user + profile snapshot |

## Profile — `/api/profile`  (auth)
| GET | `/` | my full gamification profile (xp, level, rank, streak, next thresholds, progress %) |
| GET | `/:userId` | public profile (admin or self) |
| GET | `/xp/history?page&limit` | paginated XP ledger |
| GET | `/game-history?page&limit` | activity log |

## Activity (XP ingest) — `/api/activity`  (auth)
| POST | `/` | `{ type, gameId?, amount?, idempotencyKey }` → records activity, **emits `activity.recorded`**, returns `{ xpAwarded, profile, levelUp?, rankUp?, missionsProgressed[], rewardsUnlocked[] }` |
> The single funnel that drives the whole engine chain. Idempotent.

## XP / Level / Rank config — `/api/xp`, `/api/levels`, `/api/ranks`
- `GET /api/levels` / `GET /api/ranks` — public progression maps (UI uses for bars)
- Admin CRUD: `POST/PUT/DELETE /api/xp/rules`, `/api/levels`, `/api/ranks` (role ADMIN)
- `POST /api/xp/admin/grant` `{ userId, amount, reason }` — manual grant (ADMIN, audited)

## Missions — `/api/missions`  (auth)
| GET | `/` | my missions grouped by type with progress/status |
| GET | `/catalog` | active mission catalog |
| POST | `/:id/claim` | claim COMPLETED mission → XP+reward, status CLAIMED |
| Admin | `POST/PUT/DELETE /` | mission CRUD |

## Rewards — `/api/rewards`  (auth)
| GET | `/` | my reward ledger (`?status=GRANTED`) |
| GET | `/catalog` | shop/unlockable catalog |
| POST | `/:id/claim` | claim a GRANTED reward (coins credited / coupon issued) |
| POST | `/shop/:rewardId/redeem` | spend coins to redeem |
| Admin | `POST/PUT/DELETE /catalog` + `POST /grant` |

## Leaderboard — `/api/leaderboard`  (auth)
| GET | `/global?limit&offset` | Redis ZSET, includes my rank even if off‑page |
| GET | `/weekly` / `/monthly` | period boards |
| GET | `/friends` | friends board (ZUNIONSTORE of follow list) |
| GET | `/me` | `{ global, weekly, monthly }` my positions |

## Notifications — `/api/notifications`  (auth)
| GET | `/?page&limit&unread=true` | list |
| GET | `/unread-count` | badge |
| PATCH | `/:id/read` / `PATCH /read-all` | mark read |
> Also pushed live over Socket.IO (`REALTIME.md`).

## Achievements — `/api/achievements`  (auth)
`GET /` (mine), `GET /catalog`, admin CRUD.

## Users / Audit (ADMIN) — `/api/users`, `/api/audit`
Standard paginated CRUD + audit‑log read, matching your existing patterns.

## Status codes
`200` ok · `201` created · `401` unauth/expired token · `403` role/locked ·
`404` not found · `409` duplicate (email/mobile) · `422` validation ·
`429` rate limited · `500` server.

## Standard middleware chain example
```ts
router.post(
  "/",
  rateLimit("activity", { windowMs: 60_000, max: 120 }),
  auth,
  validate(recordActivitySchema),
  recordActivity
);
```

A full machine‑readable contract is generated at `/api/docs` (OpenAPI via
swagger‑jsdoc on each `route/*.routes.ts`, identical to your existing setup).
See `examples/` request/response samples embedded in route JSDoc.
