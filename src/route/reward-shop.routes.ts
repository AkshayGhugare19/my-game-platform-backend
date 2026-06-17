import { Router } from "express";
import {
  listProducts,
  buy,
  history,
  boosters,
} from "../modules/reward-shop/controller/reward-shop.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/products", auth, listProducts);
router.get("/boosters", auth, boosters);
router.get("/history", auth, history);
router.post("/buy", auth, buy);

// Swagger payload (body isn't Joi-validated — docs-only).
(router as Router & { docs?: Record<string, unknown> }).docs = {
  "POST /buy": {
    requestSchema: {
      type: "object",
      required: ["productId"],
      properties: {
        productId: { type: "string", example: "xp-booster" },
        quantity: { type: "number", example: 1, description: "default 1" },
      },
    },
    requestExample: { productId: "xp-booster", quantity: 1 },
  },
};

export default router;
