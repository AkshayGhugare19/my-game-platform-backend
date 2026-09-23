"use strict";

/** free_spins_grants — free spins credited to a player (e.g. from a reward-shop purchase). */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, INTEGER, DATE } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("free_spins_grants", {
      id,
      user_id: {
        type: UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      game_key: { type: STRING, allowNull: false },
      quantity_total: { type: INTEGER, allowNull: false, defaultValue: 0 },
      quantity_remaining: { type: INTEGER, allowNull: false, defaultValue: 0 },
      /** Where this grant came from, e.g. "reward-shop". */
      source: { type: STRING, allowNull: true },
      /** The gamru reward-shop product id, when source is "reward-shop". */
      source_id: { type: STRING, allowNull: true },
      ...ts,
    });

    await qi.addIndex("free_spins_grants", ["user_id", "game_key"]);
  },

  async down(qi) {
    await qi.dropTable("free_spins_grants");
  },
};
