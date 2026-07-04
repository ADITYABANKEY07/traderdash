import express from "express";
import {
  getTraders,
  getTraderById,
  createTrader,
  updateTrader,
  deleteTrader,
  getTraderPnL,
} from "../controllers/traderController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // every route here requires a logged-in admin

router.route("/").get(getTraders).post(createTrader);
router.route("/:id").get(getTraderById).put(updateTrader).delete(deleteTrader);
router.get("/:id/pnl", getTraderPnL); // read-only on the admin side — traders submit via POST /trader/pnl

export default router;
