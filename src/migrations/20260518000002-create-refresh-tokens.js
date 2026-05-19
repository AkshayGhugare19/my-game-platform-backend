"use strict";

/** refresh_tokens — rotating refresh-token store. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, DATE } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("refresh_tokens", {
      id,
      user_id: { type: UUID, allowNull: false },
      token_id: { type: UUID, allowNull: false, unique: true },
      token_hash: { type: STRING(64), allowNull: false, unique: true },
      expires_at: { type: DATE, allowNull: false },
      revoked_at: { type: DATE },
      replaced_by: { type: UUID },
      user_agent: { type: STRING(255) },
      ip: { type: STRING(64) },
      ...ts,
    });
    await qi.addIndex("refresh_tokens", ["user_id"]);
  },

  async down(qi) {
    await qi.dropTable("refresh_tokens");
  },
};
