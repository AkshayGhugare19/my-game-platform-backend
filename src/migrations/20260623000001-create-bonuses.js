"use strict";

/** bonuses — the games-platform bonus catalog (pinned to GAMRU ranks/levels). */
module.exports = {
  async up(qi, Sequelize) {
    // Idempotent: skip if the table already exists (e.g. via db:sync).
    const tables = (await qi.showAllTables()).map((t) =>
      typeof t === "string" ? t : t.tableName
    );
    if (tables.includes("bonuses")) return;

    const { UUID, UUIDV4, STRING, FLOAT, DATE, ENUM } = Sequelize;
    await qi.createTable("bonuses", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      bonus_name: { type: STRING(150), allowNull: false },
      bonus_type: { type: STRING(60), allowNull: false, defaultValue: "BONUS_CASH" },
      amount: { type: FLOAT, allowNull: false },
      amount_type: { type: ENUM("RM", "BM"), allowNull: false },
      status: {
        type: ENUM("ACTIVE", "INACTIVE"),
        allowNull: false,
        defaultValue: "ACTIVE",
      },
      description: { type: STRING(500), allowNull: false, defaultValue: "" },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
  },

  async down(qi) {
    await qi.dropTable("bonuses");
  },
};
