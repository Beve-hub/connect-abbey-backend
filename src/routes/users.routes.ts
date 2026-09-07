import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { listUsers } from "../controllers/users.controller";

const router = Router();

router.use(requireAuth);
router.get("/", asyncHandler(listUsers));

export default router;