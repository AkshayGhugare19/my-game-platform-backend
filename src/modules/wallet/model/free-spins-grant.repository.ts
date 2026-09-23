import FreeSpinsGrant from "./free-spins-grant.model.ts";
import type { FreeSpinsGrantAttributes } from "./free-spins-grant.model.ts";

export interface FreeSpinsSummaryRow {
  gameKey: string;
  remaining: number;
}

class FreeSpinsGrantRepository {
  create(data: Partial<FreeSpinsGrantAttributes>): Promise<FreeSpinsGrant> {
    return FreeSpinsGrant.create(data as FreeSpinsGrant["_creationAttributes"]);
  }

  /** Remaining spins per game for one user (games with 0 left are omitted). */
  async summaryByUser(userId: string): Promise<FreeSpinsSummaryRow[]> {
    const rows = await FreeSpinsGrant.findAll({ where: { user_id: userId } });
    const byGame = new Map<string, number>();
    for (const r of rows) {
      byGame.set(r.game_key, (byGame.get(r.game_key) ?? 0) + Number(r.quantity_remaining ?? 0));
    }
    return Array.from(byGame.entries())
      .filter(([, remaining]) => remaining > 0)
      .map(([gameKey, remaining]) => ({ gameKey, remaining }));
  }
}

export default new FreeSpinsGrantRepository();
