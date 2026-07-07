import express from "express";
import {
  getActiveGoal,
  getGoalHistory,
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  getGoalProgress,
  upsertGoalProgress,
} from "../controllers/goalController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // every goal route requires a logged-in admin

router.get("/active", getActiveGoal);      // active goal + live metrics
router.get("/history", getGoalHistory);    // all completed/past goals with full details
router.route("/").get(getGoals).post(createGoal);
router.route("/:id").put(updateGoal).delete(deleteGoal);
router.route("/:id/progress").get(getGoalProgress).post(upsertGoalProgress);

export default router;
