"use strict";

/** activity_logs — gameplay ingest point that drives the engine chain. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, BOOLEAN, DATE, JSONB, DECIMAL } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

    await qi.createTable("activity_logs", {
      id,
      user_id: { type: UUID, allowNull: false },
      type: { type: STRING(40), allowNull: false },
      game_id: { type: STRING(80) },
      amount: { type: DECIMAL(18, 2) },
      idempotency_key: { type: STRING(120), allowNull: false, unique: true },
      processed: { type: BOOLEAN, allowNull: false, defaultValue: false },
      meta: { type: JSONB, allowNull: false, defaultValue: {} },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await qi.addIndex("activity_logs", ["user_id", "created_at"]);
  },

  async down(qi) {
    await qi.dropTable("activity_logs");
  },
};
