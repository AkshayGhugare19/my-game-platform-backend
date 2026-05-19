# Database Schema

PostgreSQL 15, Sequelize 6. Conventions inherited from `hamara-engage-backend`:
UUID primary keys (`DataTypes.UUIDV4`), **snake_case** columns, `created_at` /
`updated_at` timestamps, `underscored: true`. Money/points are integers.

## Entity overview

```
users ──1:1── gamification_profiles
  │                 │
  │                 ├─< xp_history
  │                 ├─< user_missions >── missions
  │                 ├─< user_rewards   >── rewards
  │                 ├─< user_achievements >── achievements
  │                 └─< notifications
  └─< activity_logs
  └─< refresh_tokens
  └─< audit_logs

level_tiers   (config)   rank_tiers (config)   xp_rules (config)
leaderboards: Redis ZSETs (snapshotted to leaderboard_snapshots for history)
```

## Tables

### users
Account/auth only (gamification state is separated for clean scaling).

| column | type | notes |
|---|---|---|
| id | UUID PK | |
| first_name / last_name | varchar(100) | |
| username | varchar(100) unique null | |
| email | varchar(100) unique | `isEmail` |
| mobile | varchar(20) unique | |
| password | text | bcrypt(12) |
| role | enum(USER,ADMIN) | default USER |
| status | enum(ACTIVE,INACTIVE) | default ACTIVE |
| timezone, theme, two_factor_enabled | | parity with existing User |
| created_at / updated_at | timestamptz | |

`defaultScope` excludes `password`; `withPassword` scope opts in (your pattern).

### refresh_tokens
Rotating refresh tokens (hashed). Also mirrored into Redis allowlist for O(1) revoke.

| id UUID PK | user_id FK→users | token_hash (sha256, unique) | expires_at | revoked_at null | replaced_by null | user_agent | ip |

Indexes: `(user_id)`, `(token_hash)`, `(expires_at)`.

### gamification_profiles  (1:1 users — created at registration)
The hot row read on almost every gamified screen.

| column | type | notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK unique | |
| xp_total | bigint | lifetime XP, default 0 |
| xp_into_level | int | XP accumulated within current level |
| level | int | default 0 |
| rank_code | enum | BEGINNER…ELITE, default BEGINNER |
| current_streak | int | consecutive active days |
| longest_streak | int | |
| last_activity_at | timestamptz null | drives streak/daily bonus |
| coins | bigint | spendable reward currency, default 0 |
| status | enum(ACTIVE,SUSPENDED) | |
| created_at / updated_at | | |

Indexes: `unique(user_id)`, `(level)`, `(rank_code)`, `(xp_total desc)`.

### level_tiers  (config, seeded)
Scalable progression — engine reads tiers, no hardcoding.

| level int PK | min_xp bigint | title varchar | perks jsonb |

Seed: 0→0, 1→100, 2→300, 3→700, 4→1500, 5→3100 … (`xp = base*(2^n -1)`,
see `ENGINES.md` for the closed‑form scalable formula). A synthetic high tier
guarantees `findHighestQualifying` always resolves.

### rank_tiers  (config, seeded)

| code enum PK | name | min_level int | min_xp bigint | order int | icon | unlocks jsonb |

`BEGINNER, BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, ELITE`.

### xp_rules  (config, seeded)
Maps an **activity type** to XP. Participation‑based — never reads win/loss.

| id UUID PK | code unique (e.g. `GAME_PLAY`,`BET_PLACE`,`DAILY_LOGIN`,`STREAK_BONUS`) | xp_amount int | per varchar (`event`/`day`) | daily_cap int null | active bool |

### xp_history  (high volume — append only, partition candidate)

| id UUID PK | user_id FK | profile_id FK | source enum(ACTIVITY,MISSION,STREAK,DAILY,ADMIN) | rule_code | xp_amount int | balance_after bigint | idempotency_key varchar unique null | meta jsonb | created_at |

Indexes: `(user_id, created_at desc)`, `unique(idempotency_key)`,
partition by `created_at` monthly at scale.

### activity_logs  (ingestion point that drives XP — high volume)

| id UUID PK | user_id FK | type varchar (`GAME_PLAY`,`BET_PLACE`,`LOGIN`…) | game_id null | amount numeric null (bet size — *not* used for XP) | idempotency_key varchar unique | processed bool | meta jsonb | created_at |

> Outcome (win/loss/payout) may be stored in `meta` for analytics but the XP
> engine **must not** read it. XP depends only on participation.

### missions

| id UUID PK | code unique | title | description | type enum(DAILY,WEEKLY,SPECIAL,REFERRAL) | metric enum(GAMES_PLAYED,XP_EARNED,LOGIN_DAYS,REFERRALS,BETS_PLACED) | target int | reward_xp int | reward_coins int | reward_id FK→rewards null | required_rank enum null | starts_at / ends_at null | active bool |

### user_missions  (per‑user progress)

| id UUID PK | user_id FK | mission_id FK | progress int default 0 | target int (snapshot) | status enum(LOCKED,IN_PROGRESS,COMPLETED,CLAIMED,EXPIRED) | period_key varchar (e.g. `2026-W21` for weekly reset) | completed_at null | created_at/updated_at |

Unique `(user_id, mission_id, period_key)` → daily/weekly reset = new row.

### rewards  (catalog)

| id UUID PK | code unique | name | type enum(COINS,COUPON,BONUS_POINTS,UNLOCKABLE,BADGE,FEATURE_ACCESS) | value jsonb (e.g. `{coins:500}` / `{coupon:"X10"}`) | required_rank enum null | required_level int null | stock int null | expires_in_days int null | active bool |

### user_rewards  (ledger — granted/claimed/expired)

| id UUID PK | user_id FK | reward_id FK | source enum(RANK,MISSION,LEVEL,ADMIN,SHOP) | status enum(GRANTED,CLAIMED,EXPIRED,REVOKED) | granted_at | claimed_at null | expires_at null | meta jsonb |

Indexes: `(user_id, status)`, `(expires_at)` (expiry sweeper).

### achievements / user_achievements
Badges unlocked by milestones (first game, level 10, rank GOLD…).
`achievements(id,code,name,icon,criteria jsonb)`,
`user_achievements(id,user_id,achievement_id,unlocked_at)` unique `(user_id,achievement_id)`.

### notifications

| id UUID PK | user_id FK | type enum(LEVEL_UP,RANK_UP,REWARD_UNLOCKED,MISSION_COMPLETED,STREAK,SYSTEM) | title | body | data jsonb | read_at null | created_at |

Index `(user_id, read_at, created_at desc)`.

### audit_logs

| id UUID PK | actor_id FK→users null | action varchar | entity varchar | entity_id varchar | ip | user_agent | before jsonb | after jsonb | created_at |

### leaderboard_snapshots
Periodic persistence of Redis ZSETs for history/analytics.

| id UUID PK | board enum(GLOBAL,WEEKLY,MONTHLY) | period_key | rankings jsonb | captured_at |

## Redis keys

| key | type | purpose |
|---|---|---|
| `lb:global` | ZSET member=userId score=xp_total | global leaderboard |
| `lb:weekly:{YYYY-Www}` | ZSET | weekly (TTL ~10d) |
| `lb:monthly:{YYYY-MM}` | ZSET | monthly (TTL ~40d) |
| `lb:friends:{userId}` | computed via ZUNIONSTORE on demand | friends board |
| `profile:{userId}` | string(JSON) TTL 60s | hot profile cache (write‑through) |
| `rt:allow:{tokenId}` | string TTL=refresh exp | refresh-token allowlist |
| `rl:{ip|userId}:{route}` | counter | rate-limit buckets |
| `idem:{key}` | string TTL 24h | activity idempotency guard |

## Indexing summary (performance)
- `gamification_profiles(user_id)` unique, `(xp_total desc)`, `(rank_code)`
- `xp_history(user_id, created_at desc)`, unique `idempotency_key`
- `activity_logs(user_id, created_at desc)`, unique `idempotency_key`, `(processed)`
- `user_missions` unique `(user_id, mission_id, period_key)`, `(status)`
- `user_rewards(user_id, status)`, `(expires_at)`
- `notifications(user_id, read_at, created_at desc)`
- `refresh_tokens(token_hash)`, `(user_id)`

High‑volume append tables (`xp_history`, `activity_logs`) are monthly
range‑partition candidates; archived partitions detach to cold storage.
