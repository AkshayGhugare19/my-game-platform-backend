"use strict";

/** user_rewards — granted/claimed reward instances. */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, DATE, JSONB, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("user_rewards", {
      id,
      user_id: { type: UUID, allowNull: false },
      reward_id: { type: UUID, allowNull: false },
      source: { type: ENUM("RANK", "MISSION", "LEVEL", "ADMIN", "SHOP"), allowNull: false },
      status: {
        type: ENUM("GRANTED", "CLAIMED", "EXPIRED", "REVOKED"),
        allowNull: false,
        defaultValue: "GRANTED",
      },
      granted_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      claimed_at: { type: DATE },
      expires_at: { type: DATE },
      meta: { type: JSONB, allowNull: false, defaultValue: {} },
      ...ts,
    });
    await qi.addIndex("user_rewards", ["user_id", "status"]);
    await qi.addIndex("user_rewards", ["expires_at"]);
  },

  async down(qi) {
    await qi.dropTable("user_rewards");
  },
};
