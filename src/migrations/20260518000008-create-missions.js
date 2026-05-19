"use strict";

/** missions — mission catalog. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, BOOLEAN, DATE, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("missions", {
      id,
      code: { type: STRING(60), allowNull: false, unique: true },
      title: { type: STRING(150), allowNull: false },
      description: { type: STRING(500), allowNull: false, defaultValue: "" },
      type: { type: ENUM("DAILY", "WEEKLY", "SPECIAL", "REFERRAL"), allowNull: false },
      metric: {
        type: ENUM("GAMES_PLAYED", "BETS_PLACED", "XP_EARNED", "LOGIN_DAYS", "REFERRALS"),
        allowNull: false,
      },
      target: { type: INTEGER, allowNull: false },
      reward_xp: { type: INTEGER, allowNull: false, defaultValue: 0 },
      reward_coins: { type: INTEGER, allowNull: false, defaultValue: 0 },
      reward_id: { type: UUID },
      required_rank: { type: STRING(20) },
      starts_at: { type: DATE },
      ends_at: { type: DATE },
      active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("missions");
  },
};
