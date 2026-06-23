"use strict";

/**
 * Split the wallet into Real Money (RM) and Bonus Money (BM). `balance` stays
 * the TOTAL (invariant: balance = real_money + bonus_money). Existing balances
 * are treated as real money on backfill.
 */
module.exports = {
  async up(qi, Sequelize) {
    const cols = await qi.describeTable("wallets");
    if (!cols.real_money) {
      await qi.addColumn("wallets", "real_money", {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!cols.bonus_money) {
      await qi.addColumn("wallets", "bonus_money", {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      });
    }
    // Backfill: pre-existing balance is real money so the invariant holds.
    await qi.sequelize.query(
      "UPDATE wallets SET real_money = balance WHERE real_money = 0 AND balance <> 0"
    );
  },

  async down(qi) {
    const cols = await qi.describeTable("wallets");
    if (cols.real_money) await qi.removeColumn("wallets", "real_money");
    if (cols.bonus_money) await qi.removeColumn("wallets", "bonus_money");
  },
};
