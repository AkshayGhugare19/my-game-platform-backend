"use strict";

/**
 * Adds participation fields to user_missions so missions can be driven off the
 * gamru-authored catalog. `category` is the exclusivity bucket ("Casino" /
 * "Sport") — only one IN_PROGRESS mission per bucket is allowed. `meta` is a
 * snapshot of the gamru mission's objective + display fields, captured at join
 * time so gameplay events (which carry only a user id) can advance progress
 * without a gamru round-trip.
 */
module.exports = {
  async up(qi, Sequelize) {
    const table = await qi.describeTable("user_missions");

    if (!table.category) {
      await qi.addColumn("user_missions", "category", {
        type: Sequelize.STRING(30),
        allowNull: true,
      });
    }
    if (!table.meta) {
      await qi.addColumn("user_missions", "meta", {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      });
    }

    await qi
      .addIndex("user_missions", ["user_id", "category", "status"], {
        name: "user_missions_user_id_category_status",
      })
      .catch(() => {
        /* index may already exist (idempotent re-run) */
      });
  },

  async down(qi) {
    await qi
      .removeIndex("user_missions", "user_missions_user_id_category_status")
      .catch(() => {});
    const table = await qi.describeTable("user_missions");
    if (table.meta) await qi.removeColumn("user_missions", "meta");
    if (table.category) await qi.removeColumn("user_missions", "category");
  },
};
