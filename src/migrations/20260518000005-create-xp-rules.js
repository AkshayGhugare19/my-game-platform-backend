"use strict";

/** xp_rules — per-event XP award rules. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, BOOLEAN, DATE } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("xp_rules", {
      id,
      code: { type: STRING(60), allowNull: false, unique: true },
      description: { type: STRING(255), allowNull: false, defaultValue: "" },
      xp_amount: { type: INTEGER, allowNull: false },
      per: { type: STRING(20), allowNull: false, defaultValue: "event" },
      daily_cap: { type: INTEGER },
      active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("xp_rules");
  },
};
