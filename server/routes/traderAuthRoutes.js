import express from "express";
import {
  registerTrader,
  loginTrader,
  getMyProfile,
  getMyPnL,
  submitMyPnL,
  getMyPnLHistory,
} from "../controllers/traderAuthController.js";
import { protectTrader } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerTrader);
router.post("/login", loginTrader);

// Private — trader's own data only
router.get("/me", protectTrader, getMyProfile);
router.get("/pnl", protectTrader, getMyPnL);
router.get("/pnl/history", protectTrader, getMyPnLHistory);
router.post("/pnl", protectTrader, submitMyPnL);

export default router;
