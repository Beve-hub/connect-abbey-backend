import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { loginSchema, refreshSchema, signupSchema } from "../validators/auth.validators";
import { signAccessToken, verifyRefreshToken } from "../utils/jwt";
import {
  getActiveRefreshSession,
  issueRefreshToken,
  revokeRefreshToken,
} from "../services/refreshToken.service";

const SALT_ROUNDS = 10;

export async function signup(req: Request, res: Response) {
  const { email, password, name } = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(
      "We couldn't create your account with those details. If you already have an account, try logging in instead.",
      409
    );
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      profile: { create: {} }, // every user gets an empty profile row to fill in later
    },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, user.email);

  return res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, user.email);

  return res.json({
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  });
}

// POST /auth/refresh — verifies the refresh token AND its DB session, then
// rotates: the old session is revoked and a brand new one is issued. This
// means a stolen refresh token can only be "replayed" once before either the
// legitimate user or the attacker's next refresh call fails, which is a
// signal you could use to revoke the whole session family if you want to
// take this further later.
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await getActiveRefreshSession(payload);
  if (!session) {
    // Covers: never issued, already used (rotated away), revoked by logout,
    // or past its 24h expiry — all treated identically to the caller.
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new AppError("User no longer exists", 401);
  }

  await revokeRefreshToken(session.jti);

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = await issueRefreshToken(user.id, user.email);

  return res.json({ accessToken, refreshToken: newRefreshToken });
}

// POST /auth/logout — kills the refresh session server-side. After this, the
// refresh token in the request body can never be used again to mint new
// access tokens, so the client is forced to log in again. Simply minimizing
// the app or letting the access token expire does NOT hit this route, so
// those cases leave the 24h refresh session untouched, exactly as intended.
export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);

  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshToken(payload.jti);
  } catch {
    // Token was already invalid/expired/malformed — logout is still a
    // success from the client's point of view, there's nothing left to kill.
  }

  return res.status(200).json({ message: "Logged out successfully" });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, createdAt: true, profile: true },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return res.json({ user });
}
