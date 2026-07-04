import express from "express";
import {
  getActiveGoal,
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

router.get("/active", getActiveGoal); // GET /goals/active -> goal + countdown/pace metrics
router.route("/").get(getGoals).post(createGoal); // POST /goals -> "Set Goal" button
router.route("/:id").put(updateGoal).delete(deleteGoal);
router.route("/:id/progress").get(getGoalProgress).post(upsertGoalProgress);

export default router;
