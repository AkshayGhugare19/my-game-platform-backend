"use strict";

/** rank_tiers — rank ladder config. */
module.exports = {
  async up(qi, Sequelize) {
    const { STRING, INTEGER, BIGINT, JSONB, DATE, ENUM } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("rank_tiers", {
      code: {
        type: ENUM("BEGINNER", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "ELITE"),
        primaryKey: true,
      },
      name: { type: STRING(50), allowNull: false },
      min_level: { type: INTEGER, allowNull: false },
      min_xp: { type: BIGINT, allowNull: false },
      order: { type: INTEGER, allowNull: false },
      icon: { type: STRING(120), allowNull: false, defaultValue: "" },
      unlocks: { type: JSONB, allowNull: false, defaultValue: {} },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("rank_tiers");
  },
};
