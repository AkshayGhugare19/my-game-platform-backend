"use strict";

/**
 * `user_tournaments` is now a read-through CACHE / audit mirror of GAMRU, which
 * owns tournament scoring, ranking and prize settlement. Add the fields GAMRU
 * now computes so the mirror can display them without recomputing:
 *   - rank           : last leaderboard rank GAMRU reported
 *   - status         : REGISTERED | RANKED | WON | CLAIMED
 *   - claimed_at      : when the player claimed the prize (GAMRU ledger)
 *   - last_synced_at  : when this row was last mirrored from GAMRU
 *
 * `prize_awarded` / `prize_amount` already exist (from 0019); their meaning
 * shifts from "wallet credited locally" to "GAMRU marked this player a winner"
 * — no longer a local wallet settlement.
 */
module.exports = {
  async up(qi, Sequelize) {
    await qi.addColumn("user_tournaments", "rank", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await qi.addColumn("user_tournaments", "status", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await qi.addColumn("user_tournaments", "claimed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await qi.addColumn("user_tournaments", "last_synced_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(qi) {
    await qi.removeColumn("user_tournaments", "last_synced_at");
    await qi.removeColumn("user_tournaments", "claimed_at");
    await qi.removeColumn("user_tournaments", "status");
    await qi.removeColumn("user_tournaments", "rank");
  },
};
