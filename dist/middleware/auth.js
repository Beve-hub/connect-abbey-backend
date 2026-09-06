"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.attachUserIfPresent = attachUserIfPresent;
const jwt_1 = require("../utils/jwt");
/**
 * Protects a route. Expects: Authorization: Bearer <accessToken>
 * On success, attaches { userId, email } to req.user and calls next().
 * On failure, responds 401 and does NOT call next().
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or malformed Authorization header" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = { userId: payload.userId, email: payload.email };
        next();
    }
    catch (err) {
        if (err instanceof Error && err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Access token expired" });
        }
        return res.status(401).json({ error: "Invalid access token" });
    }
}
/**
 * Optional auth: attaches req.user if a valid token is present,
 * but does not block the request if it's missing/invalid.
 * Useful for endpoints like GET /users/:id that behave slightly
 * differently for logged-in vs anonymous callers.
 */
function attachUserIfPresent(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        try {
            const payload = (0, jwt_1.verifyAccessToken)(authHeader.split(" ")[1]);
            req.user = { userId: payload.userId, email: payload.email };
        }
        catch {
            // ignore invalid token, just proceed unauthenticated
        }
    }
    next();
}
