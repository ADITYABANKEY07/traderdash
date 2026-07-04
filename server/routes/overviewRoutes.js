import express from "express";
import { getOverviewStats } from "../controllers/overviewController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getOverviewStats);

export default router;
