import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import {
  listConnections,
  listPendingRequests,
  listSentRequests,
  removeConnection,
  respondToConnectionRequest,
  sendConnectionRequest,
} from "../controllers/connections.controller";

const router = Router();

router.use(requireAuth); // every connections route requires a logged-in user

router.post("/", asyncHandler(sendConnectionRequest));
router.patch("/:id", asyncHandler(respondToConnectionRequest));
router.delete("/:id", asyncHandler(removeConnection));
router.get("/", asyncHandler(listConnections));
router.get("/pending", asyncHandler(listPendingRequests));
router.get("/sent", asyncHandler(listSentRequests));

export default router;