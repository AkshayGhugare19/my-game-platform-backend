"use strict";

const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");

/** Scalable closed-form level curve: minXp(L) = BASE*(G^L - 1)/(G - 1). */
const BASE = 100;
const G = 1.6;
const levelTiers = (() => {
  const rows = [];
  for (let L = 0; L <= 200; L++) {
    const minXp = L === 0 ? 0 : Math.round((BASE * (Math.pow(G, L) - 1)) / (G - 1));
    rows.push({
      level: L,
      min_xp: minXp,
      title: `Level ${L}`,
      perks: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
  return rows;
})();

const rankTiers = [
  ["BEGINNER", "Beginner", 0, 0, 1],
  ["BRONZE", "Bronze", 3, 500, 2],
  ["SILVER", "Silver", 8, 3000, 3],
  ["GOLD", "Gold", 15, 12000, 4],
  ["PLATINUM", "Platinum", 25, 40000, 5],
  ["DIAMOND", "Diamond", 40, 120000, 6],
  ["ELITE", "Elite", 60, 350000, 7],
].map(([code, name, min_level, min_xp, order]) => ({
  code,
  name,
  min_level,
  min_xp,
  order,
  icon: "",
  unlocks: JSON.stringify({}),
  created_at: new Date(),
  updated_at: new Date(),
}));

const xpRules = [
  ["GAME_PLAY", "XP for playing a game (participation only)", 10, 500],
  ["BET_PLACE", "XP for placing a bet (participation only)", 8, 400],
  ["DAILY_LOGIN", "Daily first-activity bonus", 20, 20],
].map(([code, description, xp_amount, daily_cap]) => ({
  id: randomUUID(),
  code,
  description,
  xp_amount,
  per: "event",
  daily_cap,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
}));

const missions = [
  ["DAILY_PLAY_5", "Play 5 games", "DAILY", "GAMES_PLAYED", 5, 50, 20],
  ["WEEKLY_XP_1000", "Earn 1000 XP this week", "WEEKLY", "XP_EARNED", 1000, 200, 100],
  ["SPECIAL_LOGIN_7", "Login 7 days", "SPECIAL", "LOGIN_DAYS", 7, 300, 150],
  ["REFERRAL_INVITE_3", "Invite 3 friends", "REFERRAL", "REFERRALS", 3, 500, 250],
].map(([code, title, type, metric, target, reward_xp, reward_coins]) => ({
  id: randomUUID(),
  code,
  title,
  description: title,
  type,
  metric,
  target,
  reward_xp,
  reward_coins,
  reward_id: null,
  required_rank: null,
  starts_at: null,
  ends_at: null,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
}));

const rewards = [
  ["BRONZE_WELCOME", "Bronze Welcome Coupon", "COUPON", { coupon: "BRONZE10" }, "BRONZE", null],
  ["SILVER_COINS", "Silver Coin Pack", "COINS", { coins: 1000 }, "SILVER", null],
  ["GOLD_BADGE", "Gold Badge", "BADGE", { badge: "gold" }, "GOLD", null],
].map(([code, name, type, value, required_rank, required_level]) => ({
  id: randomUUID(),
  code,
  name,
  type,
  value: JSON.stringify(value),
  required_rank,
  required_level,
  cost_coins: null,
  stock: null,
  expires_in_days: 30,
  active: true,
  created_at: new Date(),
  updated_at: new Date(),
}));

module.exports = {
  async up(qi) {
    await qi.bulkInsert("level_tiers", levelTiers);
    await qi.bulkInsert("rank_tiers", rankTiers);
    await qi.bulkInsert("xp_rules", xpRules);
    await qi.bulkInsert("missions", missions);
    await qi.bulkInsert("rewards", rewards);

    const adminId = randomUUID();
    await qi.bulkInsert("users", [
      {
        id: adminId,
        first_name: "Admin",
        last_name: "User",
        username: "admin",
        email: "admin@test.com",
        mobile: "9999999999",
        password: bcrypt.hashSync("123456", 12),
        role: "ADMIN",
        status: "ACTIVE",
        timezone: "UTC",
        two_factor_enabled: false,
        theme: "dark",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(qi) {
    await qi.bulkDelete("users", { email: "admin@test.com" }, {});
    await qi.bulkDelete("rewards", null, {});
    await qi.bulkDelete("missions", null, {});
    await qi.bulkDelete("xp_rules", null, {});
    await qi.bulkDelete("rank_tiers", null, {});
    await qi.bulkDelete("level_tiers", null, {});
  },
};
