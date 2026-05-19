import { BaseRepository } from "../../../core/models/base.repository";
import RefreshToken from "./refresh-token.model";

class RefreshTokenRepository extends BaseRepository<RefreshToken> {
  constructor() {
    super(RefreshToken);
  }

  findByHash(hash: string): Promise<RefreshToken | null> {
    return this.findOne({ token_hash: hash });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.updateWhere(
      { revoked_at: new Date() },
      { user_id: userId, revoked_at: null }
    );
  }
}

export default new RefreshTokenRepository();
