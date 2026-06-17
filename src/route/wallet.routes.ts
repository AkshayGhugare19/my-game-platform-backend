import { Router } from "express";
import {
  getMyWallet,
  depositToMyWallet,
} from "../modules/wallet/controller/wallet.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyWallet);
router.post("/deposit", auth, depositToMyWallet);

// Swagger payload (body isn't Joi-validated — docs-only).
(router as Router & { docs?: Record<string, unknown> }).docs = {
  "POST /deposit": {
    requestSchema: {
      type: "object",
      required: ["amount"],
      properties: {
        amount: { type: "number", example: 100, description: "amount to credit" },
      },
    },
    requestExample: { amount: 100 },
  },
};

export default router;
