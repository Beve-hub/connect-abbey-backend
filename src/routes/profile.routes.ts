import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getMyProfile,
  updateMyProfile,
} from "../controllers/profile.controller";

const router = Router();

router.get("/profile", requireAuth, asyncHandler(getMyProfile));
router.put("/profile", requireAuth, asyncHandler(updateMyProfile));

export default router;