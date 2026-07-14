import express from "express";
import cors from "cors";

import adminRoutes from "./routes/adminRoutes.js";
import traderRoutes from "./routes/traderRoutes.js";
import traderAuthRoutes from "./routes/traderAuthRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import overviewRoutes from "./routes/overviewRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://traderdash-psi.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "Trader Management System API is running" });
});

// Routes
app.use("/admin", adminRoutes);
app.use("/traders", traderRoutes); // admin-facing trader management
app.use("/trader", traderAuthRoutes); // trader's own signup/login/self-service
app.use("/goals", goalRoutes);
app.use("/settings", settingsRoutes);
app.use("/overview", overviewRoutes);

// 404 + error handling (must come after routes)
app.use(notFound);
app.use(errorHandler);

export default app;
