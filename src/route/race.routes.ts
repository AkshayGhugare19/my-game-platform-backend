import { Router } from "express";
import {
  getMyRaces,
  getOne,
  join,
  getProgress,
  getLeaderboard,
  submitScore,
  claim,
} from "../modules/race/controller/race.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyRaces);
router.get("/:id", auth, getOne);
router.post("/:id/join", auth, join);
router.get("/:id/progress", auth, getProgress);
router.get("/:id/leaderboard", auth, getLeaderboard);
router.post("/:id/score", auth, submitScore);
router.post("/:id/claim", auth, claim);

// Swagger payload (body isn't Joi-validated — docs-only), matching the
// convention in tournament.routes.ts.
(router as Router & { docs?: Record<string, unknown> }).docs = {
  "POST /:id/score": {
    requestSchema: {
      type: "object",
      required: ["points"],
      properties: {
        points: { type: "number", example: 150, description: "points earned this play" },
        game: { type: "string", example: "aviator", description: "game key, optional" },
      },
    },
    requestExample: { points: 150, game: "aviator" },
  },
};

export default router;
