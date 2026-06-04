"use strict";

/** user_tournaments — per-player state for Gamru-authored tournaments. */
module.exports = {
  async up(qi, Sequelize) {
    // Idempotent: the table may already exist locally (created via `db:sync`).
    const tables = (await qi.showAllTables()).map((t) =>
      typeof t === "string" ? t : t.tableName
    );
    if (tables.includes("user_tournaments")) return;

    const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, INTEGER, JSONB, DATE } = Sequelize;

    await qi.createTable("user_tournaments", {
      id: { type: UUID, defaultValue: UUIDV4, primaryKey: true },
      user_id: {
        type: UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      // Gamru tournament id (the GamificationEntity uuid) — no local FK.
      tournament_id: { type: UUID, allowNull: false },
      registered: { type: BOOLEAN, allowNull: false, defaultValue: false },
      opted_in: { type: BOOLEAN, allowNull: false, defaultValue: false },
      score: { type: INTEGER, allowNull: false, defaultValue: 0 },
      plays: { type: INTEGER, allowNull: false, defaultValue: 0 },
      games_played: { type: JSONB, allowNull: false, defaultValue: {} },
      tournament_name: { type: STRING(200) },
      tournament_industry: { type: STRING(50) },
      tournament_image: { type: TEXT },
      last_played_at: { type: DATE },
      created_at: { type: DATE, allowNull: false },
      updated_at: { type: DATE, allowNull: false },
    });

    await qi.addIndex("user_tournaments", ["user_id", "tournament_id"], {
      unique: true,
    });
    await qi.addIndex("user_tournaments", ["tournament_id"]);
  },

  async down(qi) {
    await qi.dropTable("user_tournaments");
  },
};
