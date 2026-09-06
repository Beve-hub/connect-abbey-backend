"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const errorHandler_1 = require("../middleware/errorHandler");
const connections_controller_1 = require("../controllers/connections.controller");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth); // every connections route requires a logged-in user
router.post("/", (0, errorHandler_1.asyncHandler)(connections_controller_1.sendConnectionRequest));
router.patch("/:id", (0, errorHandler_1.asyncHandler)(connections_controller_1.respondToConnectionRequest));
router.delete("/:id", (0, errorHandler_1.asyncHandler)(connections_controller_1.removeConnection));
router.get("/", (0, errorHandler_1.asyncHandler)(connections_controller_1.listConnections));
router.get("/pending", (0, errorHandler_1.asyncHandler)(connections_controller_1.listPendingRequests));
router.get("/sent", (0, errorHandler_1.asyncHandler)(connections_controller_1.listSentRequests));
exports.default = router;
