# Security Implementation Plan

| Area | Control |
|---|---|
| Transport | HTTPS/TLS terminated at LB; HSTS via `helmet` |
| Headers | `helmet()` (CSP, frameguard, noSniff, referrer-policy) |
| CORS | strict allowlist from `CORS_ORIGINS` env (not `*` in prod) |
| Passwords | AES‑256‑GCM in transit (`passwordCrypto`), bcrypt(12) at rest, `defaultScope` excludes column, never logged |
| Access token | 15 min, `JWT_ACCESS_SECRET`, payload minimal `{id,email,role}` |
| Refresh token | 7 d, hashed in DB + Redis allowlist, **rotated**, reuse ⇒ family revoke |
| RBAC | `auth` + `role()` middleware; ownership checks in services → `AppError 403` |
| Validation | Joi on body/query/params, `abortEarly:false`, 422 envelope; whitelists unknown keys |
| Rate limiting | `express-rate-limit` + Redis store: tight on `/login` `/register` `/refresh`, generous on reads; per‑user bucket on `/activity` to stop XP farming |
| Anti‑cheat | XP only from server‑verified activity; idempotency keys; daily caps; streak/bonus computed server‑side; clients cannot post XP/level/rank directly |
| Idempotency | unique `idempotency_key` + Redis guard → no double‑award on retries |
| SQL injection | Sequelize parameterised queries only; no string‑built SQL |
| Mass assignment | services pick explicit fields; models use typed creation attrs |
| Audit | `audit_logs` for auth events + all admin mutations (actor, ip, ua, before/after) |
| Secrets | `.env` (gitignored), validated at boot by `config/env.ts`; rotate `JWT_*`/`PASSWORD_SECRET`; never commit |
| PII | minimal; password/token columns scoped out; logs scrub tokens |
| DoS | body size limit, request timeout, connection pool caps, Redis‑backed rate limit, Socket.IO `maxHttpBufferSize` |
| Dependency | `npm audit` in CI, lockfile committed, Dependabot |
| Error leakage | global `errorHandler` returns generic 500; stack only in non‑prod logs |
| Headers/JWT | `alg` pinned (HS256), `iss`/`aud` claims verified, clock tolerance small |

## Threat model highlights

- **XP farming / replay** → idempotency keys, per‑user activity rate limit,
  daily caps, server‑side bonus math. Activity endpoint is the only XP entry.
- **Token theft / replay** → short access TTL + refresh rotation + reuse
  detection (revoke family) + Redis allowlist for instant server‑side logout.
- **Privilege escalation** → role claim signed in JWT; never trust client
  role; admin routes double‑gated (`auth`+`role`) and audited.
- **Leaderboard tampering** → Redis ZSET written only by XpEngine after a
  committed DB transaction; Postgres remains source of truth + rebuildable.
- **Account takeover via reset** → reset tokens single‑use, short TTL, hashed.

## Boot‑time guarantees (`config/env.ts`)
Process exits if any required secret/DB/Redis var is missing or weak
(`JWT_*` length, `PASSWORD_SECRET` set, prod ⇒ non‑default DB password,
`CORS_ORIGINS` not `*`). Fail fast > insecure default.

## Production checklist
- [ ] All `JWT_*`/`PASSWORD_SECRET` rotated, ≥ 32 random bytes
- [ ] `CORS_ORIGINS` = real domains, `NODE_ENV=production`
- [ ] DB least‑privilege user, SSL on (`DB_SSL=true` for managed PG)
- [ ] Redis AUTH/TLS, not internet‑exposed
- [ ] Rate limits load‑tested; WAF/LB in front
- [ ] Migrations run, no `sequelize.sync({force})` in prod
- [ ] Backups + PITR; audit log retention policy
- [ ] `npm audit` clean; container runs as non‑root
