"use strict";

/**
 * Sample bonuses with FIXED uuids so the ids can be pasted into GAMRU
 * rank/level "Bonus IDs" fields while testing. Re-seed just this file:
 *   npx sequelize-cli db:seed --seed 20260623000001-seed-bonuses.js
 */
const bonuses = [
  ["b0000001-0000-4000-8000-000000000001", "Welcome Bonus", "BONUS_CASH", 100, "BM", "Welcome bonus for new players"],
  ["b0000001-0000-4000-8000-000000000002", "Level Reward", "BONUS_CASH", 500, "RM", "Cash reward for reaching a level"],
  ["b0000001-0000-4000-8000-000000000003", "Rank Reward", "BONUS_CASH", 1000, "BM", "Bonus money for reaching a rank"],
].map(([id, bonus_name, bonus_type, amount, amount_type, description]) => ({
  id,
  bonus_name,
  bonus_type,
  amount,
  amount_type,
  status: "ACTIVE",
  description,
  created_at: new Date(),
  updated_at: new Date(),
}));

module.exports = {
  async up(qi) {
    await qi.bulkInsert("bonuses", bonuses);
  },

  async down(qi) {
    await qi.bulkDelete("bonuses", {
      id: bonuses.map((b) => b.id),
    });
  },
};
