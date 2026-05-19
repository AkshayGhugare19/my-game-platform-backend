# Gamification Engines

All engines are pure-ish services invoked by the **event bus**
(`events/registerHandlers.ts`). One inbound activity = one DB transaction so
XP→level→rank stay atomic. Every engine is **idempotent** via
`idempotency_key` so retried/duplicated activity never double‑awards.

## 0. Trigger chain

```
POST /api/activity
  → ActivityService.record()                         (insert activity_log, idem guard)
  → bus.emit("activity.recorded")
      → XpEngine.award()                              (xp_rules lookup, daily cap, streak)
          → bus.emit("xp.awarded")
              → LevelEngine.evaluate()  ─ may emit "level.up"
              → MissionEngine.progress()              (metric counters)
              → Leaderboard.add(userId, xpTotal)
      → "level.up" → RankEngine.evaluate() ─ may emit "rank.up"
      → "rank.up"  → RewardEngine.unlockByRank() + MissionEngine.unlockByRank()
      → "mission.completed" → XpEngine.award(MISSION) + RewardEngine.grant()
      → every step → NotificationService.push() + socket emit
```

## 1. XP Engine — *participation, never outcome*

Rules: `xp_rules(code, xp_amount, per, daily_cap)`. The engine **never reads**
win/loss/payout — only that an activity happened.

```
award(userId, ruleCode, { idempotencyKey, meta }):
  if idem(idempotencyKey) seen           → return cached result   // idempotent
  rule = xpRules.get(ruleCode); if !rule.active → 0
  awardedToday = sum(xp_history where rule_code, user, day=today)
  amount = rule.daily_cap
             ? max(0, min(rule.xp_amount, rule.daily_cap - awardedToday))
             : rule.xp_amount
  + streakBonus(profile)        // see §4
  + dailyBonus(profile)         // first activity of the day
  tx:
    profile.xp_total      += amount
    profile.xp_into_level += amount
    xp_history.insert({ source, rule_code, xp_amount, balance_after, idempotency_key })
  emit xp.awarded { userId, amount, xpTotal }
```

Sources: `ACTIVITY` (game/bet), `DAILY` (login bonus), `STREAK`, `MISSION`,
`ADMIN` (manual grant, audited).

## 2. Level Engine — scalable thresholds

Config table `level_tiers(level, min_xp)`. **Scalable closed‑form** seed so we
never hand‑maintain hundreds of rows:

```
minXp(L) = round( BASE * (GROWTH^L - 1) / (GROWTH - 1) )
  BASE = 100, GROWTH = 1.6
  L0=0  L1=100  L2=260  L3=516  L4=926  L5=1582 ...   (monotonic, unbounded)
```
A seeder generates tiers 0..200; the engine simply does:

```
evaluate(profile):
  newLevel = max L where level_tiers.min_xp <= profile.xp_total
  if newLevel > profile.level:
     profile.level = newLevel
     profile.xp_into_level = xp_total - tier(newLevel).min_xp
     emit level.up { userId, from, to, perks }
```
`nextLevelXp` / `progressPct` are derived for the UI from neighbouring tiers.

## 3. Rank Engine

`rank_tiers(code, min_level, min_xp, order)` for
`BEGINNER<BRONZE<SILVER<GOLD<PLATINUM<DIAMOND<ELITE`.

```
evaluate(profile):
  rank = highest tier where min_level<=level AND min_xp<=xp_total
  if rank.order > current.order:
     profile.rank_code = rank.code
     emit rank.up { userId, from, to, unlocks }
```
`rank.up` fan‑out: RewardEngine.unlockByRank, MissionEngine.unlockByRank,
AchievementEngine.check, Notification + socket `rank:up` (UI plays animation).

## 4. Streak & daily bonus

```
onActivity(profile, now):
  d = daysBetween(profile.last_activity_at, now)
  if d == 0: same day → no streak change
  elif d == 1: current_streak++  (longest = max)
  else: current_streak = 1
  profile.last_activity_at = now
streakBonus  = min(current_streak, 7) * 5     // capped
dailyBonus   = first activity of UTC day ? 20 : 0   (rule DAILY_LOGIN)
```
Streak milestones (7/30/100) → achievement + notification.

## 5. Mission Engine

Metrics counted from authoritative sources (no trust in client):
`GAMES_PLAYED, BETS_PLACED, XP_EARNED, LOGIN_DAYS, REFERRALS`.

```
progress(userId, metric, delta):
  for each active mission m where m.metric==metric and rankAllows:
     um = getOrCreateUserMission(userId, m, periodKey(m.type))   // DAILY→date, WEEKLY→ISO week
     if um.status in (COMPLETED,CLAIMED,EXPIRED): continue
     um.progress = min(um.progress+delta, um.target)
     if um.progress >= um.target:
        um.status = COMPLETED; emit mission.completed { userId, missionId }
claim(userId, missionId):           // user-initiated, idempotent
  require um.status==COMPLETED
  XpEngine.award(MISSION, m.reward_xp); credit coins; RewardEngine.grant(m.reward_id)
  um.status = CLAIMED
```
`period_key` makes daily/weekly missions auto‑reset (new row per period). A
cron sweeper marks past‑period `IN_PROGRESS` rows `EXPIRED`.

## 6. Reward Engine

```
unlockByRank(userId, rankCode):
  for reward in rewards where required_rank==rankCode and active:
     if !exists user_rewards(userId,reward): create GRANTED (+expires_at = now+expires_in_days)
     emit reward.granted
grant(userId, rewardId, source):     // mission/level/admin
  create user_rewards GRANTED (stock-- if limited; AppError 409 if out of stock)
claim(userId, userRewardId):
  require status==GRANTED and not expired
  switch reward.type:
     COINS|BONUS_POINTS → profile.coins += value.coins
     COUPON             → issue coupon code (meta)
     BADGE              → AchievementEngine.unlock
     UNLOCKABLE|FEATURE → set entitlement flag
  status=CLAIMED, claimed_at=now
expirySweep (cron 1/h): user_rewards GRANTED & expires_at<now → EXPIRED + notify
```
All reward mutations audited; coin balance changes also written to `xp_history`‑style ledger semantics for traceability.

## 7. Leaderboard logic (Redis)

Source of truth = Postgres `xp_total`; Redis ZSETs are the fast index.

```
on xp.awarded:
  ZADD lb:global            xpTotal userId
  ZADD lb:weekly:{isoWeek}  xpTotal userId   (EXPIRE ~10d)
  ZADD lb:monthly:{yyyymm}  xpTotal userId   (EXPIRE ~40d)
GET /leaderboard/global?limit,offset:
  ZREVRANGE WITHSCORES + ZREVRANK(me)  → always include caller's own position
friends: ZUNIONSTORE tmp from caller's follow set → ZREVRANGE
```
Hourly cron snapshots top‑N to `leaderboard_snapshots` for history; weekly/
monthly keys expire naturally so resets are free. Cold‑start/rebuild job
streams `gamification_profiles` → `ZADD` to repopulate Redis.

## 8. Idempotency & atomicity (production correctness)

- Client sends `idempotencyKey` per activity; `activity_logs.idempotency_key`
  is `UNIQUE` and a Redis `idem:{key}` (24h TTL) short‑circuits hot retries.
- XP/level/rank mutations run in one `sequelize.transaction` with
  `SELECT … FOR UPDATE` on the profile row to avoid lost updates under
  concurrency.
- Engine emissions happen **after** commit (outbox‑style) so notifications
  never describe a state that rolled back.
