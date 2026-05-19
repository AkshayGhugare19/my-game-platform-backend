import { BaseRepository } from "../../../core/models/base.repository.ts";
import XpRule from "./xp-rule.model.ts";

class XpRuleRepository extends BaseRepository<XpRule> {
  constructor() {
    super(XpRule);
  }

  byCode(code: string): Promise<XpRule | null> {
    return this.findOne({ code });
  }
}

export default new XpRuleRepository();
