import { Router } from "express";
import authRoutes from "./auth";
import userRoutes from "./users";
import messageRoutes from "./messages";
import healthRoutes from "./health";

const router = Router();

// Mount route modules
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/messages", messageRoutes);

// Health check routes (also mounted at root level for compatibility)
router.use("/", healthRoutes);

export default router;