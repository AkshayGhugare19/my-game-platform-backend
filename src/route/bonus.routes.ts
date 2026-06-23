import { Router } from "express";
import {
  create,
  list,
  getOne,
  update,
  remove,
  getMyBonuses,
  claimMyBonus,
  catalog,
  catalogOne,
} from "../modules/bonus/controller/bonus.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { role } from "../middlewares/role.middleware.ts";
import { audit } from "../middlewares/audit.middleware.ts";

const router = Router();

// Catalog — read-only bonus DEFINITIONS for server-to-server sync (GAMRU
// snapshots these when a rank pins a bonus id). No user session; registered
// first so `/catalog` is not captured by the admin `/:id` routes.
router.get("/catalog", catalog);
router.get("/catalog/:id", catalogOne);

// Player — granted bonuses + claim. Registered before `/:id` so `/me` and
// `/:id/claim` are not captured by the admin `/:id` routes.
router.get("/me", auth, getMyBonuses);
router.post("/:id/claim", auth, claimMyBonus);

// Admin — bonus catalog CRUD.
router.get("/", auth, role("ADMIN"), list);
router.post("/", auth, role("ADMIN"), audit("CREATE", "bonus"), create);
router.get("/:id", auth, role("ADMIN"), getOne);
router.put("/:id", auth, role("ADMIN"), audit("UPDATE", "bonus"), update);
router.delete("/:id", auth, role("ADMIN"), audit("DELETE", "bonus"), remove);

// Swagger payloads for the endpoints whose body isn't Joi-validated (docs-only;
// validation lives in bonus.service). Keyed by `METHOD path` (see docs/swagger.js).
const bonusBody = {
  type: "object",
  required: ["bonusName", "amount", "amountType"],
  properties: {
    bonusName: { type: "string", example: "Welcome Bonus" },
    bonusType: { type: "string", example: "BONUS_CASH" },
    amount: { type: "number", example: 100 },
    amountType: { type: "string", enum: ["RM", "BM"], example: "RM" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE"], example: "ACTIVE" },
    description: { type: "string", example: "Welcome bonus for new players" },
  },
};
(router as Router & { docs?: Record<string, unknown> }).docs = {
  "POST /": {
    summary: "Create bonus (admin)",
    requestSchema: bonusBody,
    requestExample: {
      bonusName: "Level Reward",
      bonusType: "BONUS_CASH",
      amount: 500,
      amountType: "RM",
      status: "ACTIVE",
      description: "Cash reward for reaching a level",
    },
  },
  "PUT /:id": {
    summary: "Update bonus (admin)",
    requestSchema: { ...bonusBody, required: [] },
  },
  "GET /catalog": {
    summary: "List active bonus definitions (server-to-server: GAMRU snapshot)",
  },
  "GET /catalog/:id": {
    summary: "Get one bonus definition (server-to-server: GAMRU snapshot)",
  },
  "GET /me": { summary: "List my granted bonuses" },
  "POST /:id/claim": {
    summary: "Claim a granted bonus (credits the RM/BM wallet)",
  },
};

export default router;
