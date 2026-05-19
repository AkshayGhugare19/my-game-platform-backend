"use strict";

/** level_tiers — XP→level ladder config. */
module.exports = {
  async up(qi, Sequelize) {
    const { INTEGER, BIGINT, STRING, JSONB, DATE } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("level_tiers", {
      level: { type: INTEGER, primaryKey: true },
      min_xp: { type: BIGINT, allowNull: false },
      title: { type: STRING(80), allowNull: false, defaultValue: "" },
      perks: { type: JSONB, allowNull: false, defaultValue: {} },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("level_tiers");
  },
};
