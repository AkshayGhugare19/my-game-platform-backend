"use strict";

/**
 * Adds prize-distribution columns to user_tournaments. When a tournament ends,
 * the top-3 players are credited a share of the prize pool (50/30/20); these
 * columns record that payout so it happens exactly once.
 */
module.exports = {
  async up(qi, Sequelize) {
    const table = await qi.describeTable("user_tournaments");

    if (!table.prize_awarded) {
      await qi.addColumn("user_tournaments", "prize_awarded", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!table.prize_amount) {
      await qi.addColumn("user_tournaments", "prize_amount", {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  async down(qi) {
    const table = await qi.describeTable("user_tournaments");
    if (table.prize_amount) await qi.removeColumn("user_tournaments", "prize_amount");
    if (table.prize_awarded) await qi.removeColumn("user_tournaments", "prize_awarded");
  },
};
