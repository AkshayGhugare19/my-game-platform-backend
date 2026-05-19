"use strict";

/** rewards — reward catalog. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, BOOLEAN, DATE, JSONB, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("rewards", {
      id,
      code: { type: STRING(60), allowNull: false, unique: true },
      name: { type: STRING(150), allowNull: false },
      type: {
        type: ENUM("COINS", "COUPON", "BONUS_POINTS", "UNLOCKABLE", "BADGE", "FEATURE_ACCESS"),
        allowNull: false,
      },
      value: { type: JSONB, allowNull: false, defaultValue: {} },
      required_rank: { type: STRING(20) },
      required_level: { type: INTEGER },
      cost_coins: { type: INTEGER },
      stock: { type: INTEGER },
      expires_in_days: { type: INTEGER },
      active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("rewards");
  },
};
