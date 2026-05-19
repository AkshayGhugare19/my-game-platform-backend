"use strict";

/** user_achievements — unlocked achievements per user. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, DATE } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };

    await qi.createTable("user_achievements", {
      id,
      user_id: { type: UUID, allowNull: false },
      achievement_id: { type: UUID, allowNull: false },
      unlocked_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await qi.addIndex("user_achievements", ["user_id", "achievement_id"], {
      unique: true,
    });
  },

  async down(qi) {
    await qi.dropTable("user_achievements");
  },
};
