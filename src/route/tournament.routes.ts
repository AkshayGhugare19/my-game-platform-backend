import { Router } from "express";
import {
  getMyTournaments,
  getHistory,
  getOne,
  submitScore,
  claim,
} from "../modules/tournament/controller/tournament.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyTournaments);
// `/history` must precede `/:id` so it isn't captured as an id.
router.get("/history", auth, getHistory);
router.get("/:id", auth, getOne);
router.post("/:id/score", auth, submitScore);
router.post("/:id/claim", auth, claim);

// Swagger payload (body isn't Joi-validated — docs-only).
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
