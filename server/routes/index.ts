import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import messageRoutes from "./messages";

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