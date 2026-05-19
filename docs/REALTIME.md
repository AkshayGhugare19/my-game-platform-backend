# Realtime Event Flow (Socket.IO)

## Connection & auth

```
client: io(API_WS_URL, { auth: { token: accessToken } })
server: io.use((socket,next) => verify(token, JWT_ACCESS_SECRET))
        socket.join(`user:${userId}`)        // private room per user
        socket.join(`lb:global`)             // opt-in leaderboard room
```
Invalid/expired token ⇒ `next(new Error("unauthorized"))` → client must
refresh access token and reconnect.

## Multi-node scaling
`@socket.io/redis-adapter` over the same Redis (pub/sub) so emits fan out
across every API instance behind the load balancer. Without it, a user
connected to instance B would miss an event emitted on instance A.

## Server → client events

| Event | Payload | Source |
|---|---|---|
| `notification:new` | `{ id,type,title,body,data }` | every engine via NotificationService |
| `xp:awarded` | `{ amount, xpTotal, xpIntoLevel, nextLevelXp, progressPct }` | XpEngine |
| `level:up` | `{ from, to, perks }` | LevelEngine |
| `rank:up` | `{ from, to, unlocks }` | RankEngine (UI plays animation) |
| `mission:progress` | `{ missionId, progress, target, status }` | MissionEngine |
| `mission:completed` | `{ missionId, title, rewardXp }` | MissionEngine |
| `reward:granted` | `{ rewardId, name, type }` | RewardEngine |
| `streak:updated` | `{ current, longest }` | StreakEngine |
| `leaderboard:update` | `{ board, top:[...], me:{rank,score} }` | Leaderboard (throttled ~5s) |

## Client → server events
Read‑only; clients never mutate gamification state over sockets (only via
authenticated REST `/api/activity`). Allowed: `leaderboard:subscribe { board }`,
`presence:ping`.

## Emit helper (single seam)

```ts
// realtime/socket.ts
export const emitToUser = (userId, event, payload) =>
  io.to(`user:${userId}`).emit(event, payload);
export const emitLeaderboard = (board, payload) =>
  io.to(`lb:${board}`).emit("leaderboard:update", payload);
```
Engines never touch `io` directly — they call `NotificationService.push()`
which persists the row **and** `emitToUser`, so a notification survives an
offline user (delivered on next `GET /notifications`).

## Outbox ordering
Engine side‑effects emit **after** the DB transaction commits
(`tx.afterCommit`) so a client never sees `level:up` for a level that rolled
back. The same hook enqueues the persisted notification.

## End-to-end example (user plays a game)

```
1 POST /api/activity { type:"GAME_PLAY", idempotencyKey:"g-9921" }
2 ActivityService → bus "activity.recorded"
3 XpEngine +10 XP (+streak)  → tx commit
4 afterCommit: emit xp:awarded → user:{id}
5 LevelEngine: 100→ level 1   → emit level:up + notification:new
6 RankEngine: level 1 still BEGINNER (no change)
7 MissionEngine: "Play 5 games" 3/5 → emit mission:progress
8 Leaderboard ZADD → throttled emit leaderboard:update to lb:global
9 HTTP 200 returns the same summary synchronously for non-socket clients
```
Sockets are an enhancement; every result is also returned by the REST call so
the system is fully usable without a socket connection (progressive
enhancement / resilience).
