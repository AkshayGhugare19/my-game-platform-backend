"use strict";

/** audit_logs — mutating-route audit trail. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, STRING, DATE, JSONB } = Sequelize;

    await qi.createTable("audit_logs", {
      id: { type: UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      actor_id: { type: UUID },
      action: { type: STRING(80), allowNull: false },
      entity: { type: STRING(80), allowNull: false },
      entity_id: { type: STRING(80), allowNull: false, defaultValue: "" },
      ip: { type: STRING(64) },
      user_agent: { type: STRING(255) },
      before: { type: JSONB },
      after: { type: JSONB },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await qi.addIndex("audit_logs", ["actor_id", "created_at"]);
  },

  async down(qi) {
    await qi.dropTable("audit_logs");
  },
};
