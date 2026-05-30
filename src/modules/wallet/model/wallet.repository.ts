import { ModelStatic } from "sequelize";
import Wallet from "./wallet.model.ts";

class WalletRepository {
  private model: ModelStatic<Wallet> = Wallet;

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.model.findOne({ where: { user_id: userId } });
  }

  async create(data: Partial<Wallet>): Promise<Wallet> {
    return this.model.create(data as Wallet["_creationAttributes"]);
  }

  /** Find the user's wallet, creating an empty one on first access. */
  async findOrCreateByUserId(userId: string): Promise<Wallet> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;
    return this.create({ user_id: userId });
  }
}

export default new WalletRepository();
