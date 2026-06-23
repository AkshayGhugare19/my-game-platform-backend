"use strict";

/** user_bonuses — bonuses granted to players by reaching a GAMRU level/rank. */
module.exports = {
  async up(qi, Sequelize) {
    const tables = (await qi.showAllTables()).map((t) =>
      typeof t === "string" ? t : t.tableName
    );
    if (tables.includes("user_bonuses")) return;

    const { UUID, UUIDV4, STRING, FLOAT, DATE, ENUM } = Sequelize;
    await qi.createTable("user_bonuses", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: { type: UUID, allowNull: false },
      bonus_id: { type: UUID, allowNull: false },
      source_type: { type: ENUM("LEVEL", "RANK"), allowNull: false },
      source_id: { type: STRING(64), allowNull: false },
      amount: { type: FLOAT, allowNull: false },
      amount_type: { type: ENUM("RM", "BM"), allowNull: false },
      status: {
        type: ENUM("PENDING", "CLAIMED", "EXPIRED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      claimed_at: { type: DATE },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    // Duplicate-grant guard: reconcile runs on every profile read.
    await qi.addIndex(
      "user_bonuses",
      ["user_id", "bonus_id", "source_type", "source_id"],
      { unique: true, name: "user_bonuses_grant_unique" }
    );
    await qi.addIndex("user_bonuses", ["user_id", "status"]);
  },

  async down(qi) {
    await qi.dropTable("user_bonuses");
  },
};
