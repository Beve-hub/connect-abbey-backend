"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/signup", (0, errorHandler_1.asyncHandler)(auth_controller_1.signup));
router.post("/login", (0, errorHandler_1.asyncHandler)(auth_controller_1.login));
router.post("/refresh", (0, errorHandler_1.asyncHandler)(auth_controller_1.refresh));
// No requireAuth here on purpose: the whole point of logout is to kill the
// refresh session, so it must still work even if the short-lived access
// token has already expired by the time the user logs out.
router.post("/logout", (0, errorHandler_1.asyncHandler)(auth_controller_1.logout));
router.get("/me", auth_1.requireAuth, (0, errorHandler_1.asyncHandler)(auth_controller_1.me));
exports.default = router;
