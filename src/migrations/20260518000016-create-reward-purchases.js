"use strict";

/** reward_purchases — local mirror of reward-shop buys (history + boosters). */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, FLOAT, INTEGER, DATE, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("reward_purchases", {
      id,
      user_id: {
        type: UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      product_id: { type: STRING, allowNull: false },
      product_name: { type: STRING, allowNull: false },
      image: { type: TEXT },
      category: {
        type: ENUM("product", "booster"),
        allowNull: false,
        defaultValue: "product",
      },
      tier: { type: STRING },
      token_cost: { type: FLOAT, allowNull: false, defaultValue: 0 },
      quantity: { type: INTEGER, allowNull: false, defaultValue: 1 },
      multiplier: { type: FLOAT },
      booster_kind: { type: STRING },
      duration_minutes: { type: INTEGER },
      expires_at: { type: DATE },
      status: {
        type: ENUM("ACTIVE", "EXPIRED", "COMPLETED"),
        allowNull: false,
        defaultValue: "COMPLETED",
      },
      ...ts,
    });

    await qi.addIndex("reward_purchases", ["user_id", "status"]);
    await qi.addIndex("reward_purchases", ["user_id", "category"]);
    await qi.addIndex("reward_purchases", ["expires_at"]);
  },

  async down(qi) {
    await qi.dropTable("reward_purchases");
  },
};
