"use strict";

/**
 * `user_missions` is now a read-through CACHE / audit mirror of GAMRU, which
 * owns mission progress. Add `last_synced_at` (when this row was last mirrored
 * from a GAMRU response) and `claimed_at` (mirrors GAMRU's claim timestamp) so
 * the local mirror records the same audit trail GAMRU holds.
 */
module.exports = {
  async up(qi, Sequelize) {
    await qi.addColumn("user_missions", "claimed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await qi.addColumn("user_missions", "last_synced_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(qi) {
    await qi.removeColumn("user_missions", "last_synced_at");
    await qi.removeColumn("user_missions", "claimed_at");
  },
};
