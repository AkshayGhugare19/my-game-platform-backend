"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Idempotent: the table may already exist (e.g. created via `db:sync`,
    // or by this migration under its previous `...0007` filename).
    const tables = (await queryInterface.showAllTables()).map((t) =>
      typeof t === "string" ? t : t.tableName
    );
    if (tables.includes("wallets")) return;

    await queryInterface.createTable("wallets", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      balance: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: "USD",
      },
      deposit_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_deposit: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("wallets");
  },
};
