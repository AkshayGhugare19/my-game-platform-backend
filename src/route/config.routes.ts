import { Router } from "express";
import {
  listLevels,
  listRanks,
  listXpRules,
  upsertXpRule,
  deleteXpRule,
  adminGrantXp,
} from "../modules/xp/controller/config.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { role } from "../middlewares/role.middleware.ts";
import { audit } from "../middlewares/audit.middleware.ts";

const levels = Router();
levels.get("/", auth, listLevels);

const ranks = Router();
ranks.get("/", auth, listRanks);

const xp = Router();
xp.get("/rules", auth, role("ADMIN"), listXpRules);
xp.post("/rules", auth, role("ADMIN"), audit("UPSERT", "xp_rule"), upsertXpRule);
xp.delete(
  "/rules/:id",
  auth,
  role("ADMIN"),
  audit("DELETE", "xp_rule"),
  deleteXpRule
);
xp.post(
  "/admin/grant",
  auth,
  role("ADMIN"),
  audit("GRANT_XP", "profile"),
  adminGrantXp
);

export { levels as levelsRouter, ranks as ranksRouter, xp as xpRouter };
