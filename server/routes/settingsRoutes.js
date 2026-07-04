import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect); // every settings route requires a logged-in admin

router.route("/").get(getSettings).put(updateSettings);

export default router;
