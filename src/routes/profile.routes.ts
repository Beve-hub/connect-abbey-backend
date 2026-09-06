import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  getMyProfile,
  getUserById,
  searchUsers,
  updateMyProfile,
} from "../controllers/profile.controller";

const router = Router();

router.get("/profile", requireAuth, asyncHandler(getMyProfile));
router.put("/profile", requireAuth, asyncHandler(updateMyProfile));
router.get("/users/search", requireAuth, asyncHandler(searchUsers));
router.get("/users/:id", requireAuth, asyncHandler(getUserById));

export default router;