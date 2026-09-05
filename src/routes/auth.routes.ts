import { Router } from "express";
import { login, logout, me, refresh, signup } from "../controllers/auth.controller";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/signup", asyncHandler(signup));
router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
// No requireAuth here on purpose: the whole point of logout is to kill the
// refresh session, so it must still work even if the short-lived access
// token has already expired by the time the user logs out.
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));

export default router;
