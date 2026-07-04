import express from "express";
import {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPassword,
} from "../controllers/adminController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public
router.post("/register", registerAdmin);
router.post("/login", loginAdmin); // matches AdminLogin.jsx -> POST http://localhost:7007/admin/login

// Private
router.get("/profile", protect, getAdminProfile);
router.put("/profile", protect, updateAdminProfile);
router.put("/password", protect, updateAdminPassword);

export default router;
