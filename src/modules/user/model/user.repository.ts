import { BaseRepository } from "../../../core/models/base.repository.ts";
import User from "./user.model.ts";

class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return (User as unknown as typeof User & {
      scope: (s: string) => typeof User;
    })
      .scope("withPassword")
      .findOne({ where: { email } });
  }
}

export default new UserRepository();
