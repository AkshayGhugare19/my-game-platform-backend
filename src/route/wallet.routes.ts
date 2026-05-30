import { Router } from "express";
import {
  getMyWallet,
  depositToMyWallet,
} from "../modules/wallet/controller/wallet.controller.ts";
import { auth } from "../middlewares/auth.middleware.ts";

const router = Router();

router.get("/", auth, getMyWallet);
router.post("/deposit", auth, depositToMyWallet);

export default router;
