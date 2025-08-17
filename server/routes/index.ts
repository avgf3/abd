import { Router } from "express";

import authRoutes from "./auth";
import messageRoutes from "./messages";
import userRoutes from "./users";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/messages", messageRoutes);

// Health check endpoint
router.get("/ping", (req, res) => {
  res.json({ 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    status: "healthy" 
  });
});

export default router;