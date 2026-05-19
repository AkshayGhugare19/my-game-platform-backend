"use strict";

/** xp_history — append-only XP ledger. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, BIGINT, JSONB, DATE, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

    await qi.createTable("xp_history", {
      id,
      user_id: { type: UUID, allowNull: false },
      source: { type: ENUM("ACTIVITY", "MISSION", "STREAK", "DAILY", "ADMIN"), allowNull: false },
      rule_code: { type: STRING(60) },
      xp_amount: { type: INTEGER, allowNull: false },
      balance_after: { type: BIGINT, allowNull: false },
      idempotency_key: { type: STRING(120), unique: true },
      meta: { type: JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await qi.addIndex("xp_history", ["user_id", "created_at"]);
  },

  async down(qi) {
    await qi.dropTable("xp_history");
  },
};
