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

export default router;
