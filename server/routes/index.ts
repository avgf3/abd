import { Router } from "express";

import authRoutes from "./auth";
import messageRoutes from "./messages";
import userRoutes from "./users";
import privateMessageRoutes from "./privateMessages";
import notificationsRoutes from "./notifications";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/messages", messageRoutes);
router.use("/private-messages", privateMessageRoutes);
router.use("/notifications", notificationsRoutes);

// Health check endpoint
router.get("/ping", (req, res) => {
  res.json({ 
    message: "Server is running", 
    timestamp: new Date().toISOString(),
    status: "healthy" 
  });
});

export default router;