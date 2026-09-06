// src/middleware/auth.ts
import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ACCESS_COOKIE_NAME } from "../config/cookies";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; email: string };
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: "Missing access token" });
  }

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

export function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { userId: payload.userId, email: payload.email };
    } catch {
      // ignore invalid token, proceed unauthenticated
    }
  }
  next();
}