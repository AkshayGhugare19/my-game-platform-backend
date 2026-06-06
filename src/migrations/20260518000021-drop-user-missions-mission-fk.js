"use strict";

/**
 * Drop the foreign key on user_missions.mission_id. Missions are now authored
 * in gamru (the source of truth) and fetched live, so mission_id holds a gamru
 * mission uuid that has no row in the local `missions` table — the old FK
 * (created by sync from the Mission↔UserMission association) rejected every
 * join. Mirrors user_tournaments.tournament_id, which has no local FK either.
 */
module.exports = {
  async up(qi) {
    await qi
      .removeConstraint("user_missions", "user_missions_mission_id_fkey")
      .catch(() => {
        /* constraint may not exist (migrate-only deploys never had it) */
      });
  },

  async down() {
    // Intentionally not re-added — mission_id is a gamru reference, not a
    // local foreign key.
  },
};
