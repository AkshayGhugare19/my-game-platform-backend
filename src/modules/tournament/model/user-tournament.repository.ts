import { BaseRepository } from "../../../core/models/base.repository.ts";
import UserTournament from "./user-tournament.model.ts";

class UserTournamentRepository extends BaseRepository<UserTournament> {
  constructor() {
    super(UserTournament);
  }

  find(userId: string, tournamentId: string): Promise<UserTournament | null> {
    return this.findOne({ user_id: userId, tournament_id: tournamentId });
  }

  listByUser(userId: string): Promise<UserTournament[]> {
    return this.findWhere({ user_id: userId });
  }

  /** All participation rows for one tournament (drives the leaderboard). */
  listByTournament(tournamentId: string): Promise<UserTournament[]> {
    return this.findWhere(
      { tournament_id: tournamentId },
      { order: [["score", "DESC"]] }
    );
  }
}

export default new UserTournamentRepository();
