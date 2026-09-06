import { prisma } from "../lib/prisma";
import {
  generateJti,
  REFRESH_TOKEN_TTL_MS,
  RefreshJwtPayload,
  signRefreshToken,
} from "../utils/jwt";


export async function issueRefreshToken(userId: string, email: string) {
  const jti = generateJti();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.refreshToken.create({
    data: { jti, userId, expiresAt },
  });

  return signRefreshToken({ userId, email, jti });
}


export async function getActiveRefreshSession(payload: RefreshJwtPayload) {
  const record = await prisma.refreshToken.findUnique({ where: { jti: payload.jti } });

  if (!record) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;
  if (record.userId !== payload.userId) return null;

  return record;
}

/** Marks a single session dead. Idempotent — revoking twice is a no-op. */
export async function revokeRefreshToken(jti: string) {
  await prisma.refreshToken.updateMany({
    where: { jti, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}