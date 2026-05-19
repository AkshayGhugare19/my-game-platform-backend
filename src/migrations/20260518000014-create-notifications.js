"use strict";

/** notifications — in-app notification feed. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, DATE, JSONB, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

    await qi.createTable("notifications", {
      id,
      user_id: { type: UUID, allowNull: false },
      type: {
        type: ENUM(
          "LEVEL_UP",
          "RANK_UP",
          "REWARD_UNLOCKED",
          "MISSION_COMPLETED",
          "STREAK",
          "SYSTEM"
        ),
        allowNull: false,
      },
      title: { type: STRING(150), allowNull: false },
      body: { type: STRING(500), allowNull: false, defaultValue: "" },
      data: { type: JSONB, allowNull: false, defaultValue: {} },
      read_at: { type: DATE },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await qi.addIndex("notifications", ["user_id", "read_at", "created_at"]);
  },

  async down(qi) {
    await qi.dropTable("notifications");
  },
};
