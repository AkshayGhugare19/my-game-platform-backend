"use strict";

/** achievements — achievement/badge catalog. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, BOOLEAN, DATE, JSONB } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("achievements", {
      id,
      code: { type: STRING(60), allowNull: false, unique: true },
      name: { type: STRING(120), allowNull: false },
      description: { type: STRING(300), allowNull: false, defaultValue: "" },
      icon: { type: STRING(120), allowNull: false, defaultValue: "" },
      criteria: { type: JSONB, allowNull: false, defaultValue: {} },
      active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("achievements");
  },
};
