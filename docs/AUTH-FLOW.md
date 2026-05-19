# Authentication & Authorization Flow

Extends your existing JWT pattern with **rotating refresh tokens** and a Redis
allowlist (the `refresh_token` column that exists but is unused in
`hamara-engage-backend` is now fully implemented).

## Tokens

| Token | TTL | Secret | Storage | Carries |
|---|---|---|---|---|
| Access | 15 min | `JWT_ACCESS_SECRET` | client memory / sessionStorage | `{ id, email, role }` |
| Refresh | 7 days | `JWT_REFRESH_SECRET` | httpOnly cookie *or* client store; **hash** persisted | `{ id, tokenId }` |

Refresh tokens are **rotated**: every `/refresh` issues a new refresh token,
revokes the old (`revoked_at`, `replaced_by`), and updates the Redis
allowlist `rt:allow:{tokenId}`. Reuse of a revoked token ⇒ treat as theft ⇒
revoke entire token family for that user (`AppError 401`).

## Registration → auto‑onboarding

```
POST /api/auth/register
  validate(registerSchema)                     // Joi 422
  tx:
    user = users.create({ ...bcrypt(pwd,12), role:USER, status:ACTIVE })
    gamification_profiles.create({
      user_id:user.id, xp_total:0, xp_into_level:0, level:0,
      rank_code:BEGINNER, current_streak:0, coins:0, status:ACTIVE })
    seedInitialUserMissions(user.id)            // DAILY/WEEKLY rows for current period
  emit user.registered  → Notification "Welcome", Leaderboard ZADD 0
  201 → user (no password)
```
Profile creation is in the **same transaction** as the user insert: a user can
never exist without a gamification profile.

## Login

```
POST /api/auth/login
  user = findByEmailWithPassword(email)        // withPassword scope (your pattern)
  if status==INACTIVE → 403
  bcrypt.compare(decryptPassword(body.password), user.password)   // AES-GCM transport
  accessToken  = sign({id,email,role}, ACCESS_SECRET, 15m)
  tokenId=uuid; refreshToken = sign({id,tokenId}, REFRESH_SECRET, 7d)
  refresh_tokens.create({ user_id, token_hash:sha256(refreshToken), expires_at, ip, ua })
  redis.set rt:allow:{tokenId} = userId  EX 7d
  200 → { accessToken, refreshToken, user }
```

## Refresh (rotation + reuse detection)

```
POST /api/auth/refresh { refreshToken }
  payload = verify(refreshToken, REFRESH_SECRET)         // else 401
  row = refresh_tokens.findOne({ token_hash:sha256(token) })
  if !row OR row.revoked_at:
       // reuse of an already-rotated/revoked token → compromise
       revokeAllForUser(payload.id); redis.del family; → 401 "Session revoked"
  if row.expires_at < now → 401
  rotate: row.revoked_at=now; newId; new pair; row.replaced_by=newId
          redis.del rt:allow:{old}; redis.set rt:allow:{new}
  200 → { accessToken, refreshToken }
```

## Logout
Revoke presented refresh token (db + `redis.del rt:allow:{tokenId}`).
`logout-all` revokes the whole family.

## Authorization (RBAC)

Unchanged middleware pattern:

```ts
router.get("/admin/x",
  auth,                       // verifies access JWT → req.user
  role("ADMIN"),              // your role.middleware
  validate(schema),
  handler);
```

- `auth.middleware` → 401 on missing/invalid/expired access token.
- `role.middleware(...roles)` → 403 if `req.user.role` not allowed.
- Resource‑ownership checks (e.g. user reading another user's XP) live in the
  service and throw `AppError(403)` — controllers stay thin.
- Account `status: SUSPENDED` on the gamification profile blocks earning but
  not auth (handled in engines, returns `AppError 403`).

## Socket.IO auth
Handshake `auth.token` (access JWT) verified in `io.use()` middleware; socket
joins room `user:{id}`. Invalid/expired ⇒ connection refused. See
`REALTIME.md`.

## Security extras
- Access tokens short (15m) limit blast radius; refresh rotation + reuse
  detection defeats replay.
- Passwords: AES‑256‑GCM in transit (`passwordCrypto`, same as existing) +
  bcrypt(12) at rest; never logged; excluded by `defaultScope`.
- Brute‑force: `rateLimit` on `/login`,`/register`,`/refresh` (Redis store).
- All auth mutations + admin actions → `audit_logs`.
