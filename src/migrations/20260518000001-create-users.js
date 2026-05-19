"use strict";

/** users — accounts (auth identity). */
module.exports = {
  async up(qi, Sequelize) {
    const { UUID, UUIDV4, STRING, TEXT, BOOLEAN, DATE, ENUM } = Sequelize;
    const id = { type: UUID, defaultValue: UUIDV4, primaryKey: true };
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    };

    await qi.createTable("users", {
      id,
      first_name: { type: STRING(100), allowNull: false },
      last_name: { type: STRING(100), allowNull: false },
      username: { type: STRING(100), unique: true },
      email: { type: STRING(100), allowNull: false, unique: true },
      mobile: { type: STRING(20), allowNull: false, unique: true },
      password: { type: TEXT, allowNull: false },
      role: { type: ENUM("USER", "ADMIN"), defaultValue: "USER" },
      status: { type: ENUM("ACTIVE", "INACTIVE"), defaultValue: "ACTIVE" },
      timezone: { type: STRING(100), allowNull: false, defaultValue: "UTC" },
      two_factor_enabled: { type: BOOLEAN, allowNull: false, defaultValue: false },
      theme: { type: STRING(20), allowNull: false, defaultValue: "dark" },
      ...ts,
    });
  },

  async down(qi) {
    await qi.dropTable("users");
  },
};
