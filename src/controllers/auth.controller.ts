import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { loginSchema, signupSchema } from "../validators/auth.validators";
import { signAccessToken, verifyRefreshToken } from "../utils/jwt";
import {
  getActiveRefreshSession,
  issueRefreshToken,
  revokeRefreshToken,
} from "../services/refreshToken.service";
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  accessCookieOptions,
  refreshCookieOptions,
} from "../config/cookies";

const SALT_ROUNDS = 10;

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie(ACCESS_COOKIE_NAME, accessToken, accessCookieOptions);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
}

function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE_NAME, accessCookieOptions);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
}

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
      profile: { create: {} },
    },
  });

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, user.email);

  setAuthCookies(res, accessToken, refreshToken);

  return res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError("Invalid email or password", 401);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new AppError("Invalid email or password", 401);

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, user.email);

  setAuthCookies(res, accessToken, refreshToken);

  return res.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    throw new AppError("Missing refresh token", 401);
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const session = await getActiveRefreshSession(payload);
  if (!session) throw new AppError("Invalid or expired refresh token", 401);

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError("User no longer exists", 401);

  await revokeRefreshToken(session.jti);

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = await issueRefreshToken(user.id, user.email);

  setAuthCookies(res, accessToken, newRefreshToken);

  return res.json({ message: "Refreshed" });
}

export async function logout(req: Request, res: Response) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await revokeRefreshToken(payload.jti);
    } catch {
   }
  }

  clearAuthCookies(res);
  return res.status(200).json({ message: "Logged out successfully" });
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, createdAt: true, profile: true },
  });

  if (!user) throw new AppError("User not found", 404);

  return res.json({ user });
}