import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { listUsers } from "../controllers/users.controller";
import { getUserById, searchUsers } from "../controllers/profile.controller";

const router = Router();

router.use(requireAuth);
router.get("/search", asyncHandler(searchUsers));
router.get("/", asyncHandler(listUsers));
router.get("/:id", asyncHandler(getUserById));

export default router;