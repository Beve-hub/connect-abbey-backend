import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

// Extend Express's Request type so `req.user` is typed everywhere downstream
declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

/**
 * Protects a route. Expects: Authorization: Bearer <accessToken>
 * On success, attaches { userId, email } to req.user and calls next().
 * On failure, responds 401 and does NOT call next().
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch (err) {
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
export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(authHeader.split(" ")[1]);
      req.user = { userId: payload.userId, email: payload.email };
    } catch {
      // ignore invalid token, just proceed unauthenticated
    }
  }
  next();
}
