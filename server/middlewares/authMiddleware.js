import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import { Trader } from "../models/Trader.js";

// Verifies the Bearer token and attaches the admin (without password) to req.admin.
// Rejects trader tokens — admin and trader sessions are fully separate.
export const protect = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tokens issued before the role claim existed have no `role` field — treat
    // those as admin tokens for backwards compatibility. Anything explicitly
    // marked "trader" is rejected here.
    if (decoded.role && decoded.role !== "admin") {
      return res.status(403).json({ message: "Not authorized for admin access" });
    }

    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: "Not authorized, admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

// Verifies the Bearer token and attaches the trader (without password) to req.trader.
export const protectTrader = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "trader") {
      return res.status(403).json({ message: "Not authorized for trader access" });
    }

    const trader = await Trader.findById(decoded.id);

    if (!trader) {
      return res.status(401).json({ message: "Not authorized, trader not found" });
    }

    req.trader = trader;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, invalid or expired token" });
  }
};

// Restricts access to Super Admins only
export const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "Super Admin") {
    return res.status(403).json({ message: "Access denied: Super Admin role required" });
  }
  next();
};

