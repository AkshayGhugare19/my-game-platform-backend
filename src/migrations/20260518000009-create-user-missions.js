"use strict";

/** user_missions — per-user, per-period mission progress. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, DATE, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("user_missions", {
      id,
      user_id: { type: UUID, allowNull: false },
      mission_id: { type: UUID, allowNull: false },
      progress: { type: INTEGER, allowNull: false, defaultValue: 0 },
      target: { type: INTEGER, allowNull: false },
      status: {
        type: ENUM("LOCKED", "IN_PROGRESS", "COMPLETED", "CLAIMED", "EXPIRED"),
        allowNull: false,
        defaultValue: "IN_PROGRESS",
      },
      period_key: { type: STRING(20), allowNull: false },
      completed_at: { type: DATE },
      ...ts,
    });
    await qi.addIndex("user_missions", ["user_id", "mission_id", "period_key"], {
      unique: true,
    });
  },

  async down(qi) {
    await qi.dropTable("user_missions");
  },
};
