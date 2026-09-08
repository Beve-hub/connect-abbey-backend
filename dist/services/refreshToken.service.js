"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueRefreshToken = issueRefreshToken;
exports.getActiveRefreshSession = getActiveRefreshSession;
exports.revokeRefreshToken = revokeRefreshToken;
exports.revokeAllRefreshTokensForUser = revokeAllRefreshTokensForUser;
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../utils/jwt");
/**
 * Issues a brand new refresh session for a user (used on signup/login, and
 * again on every successful /auth/refresh as part of rotation).
 */
async function issueRefreshToken(userId, email) {
    const jti = (0, jwt_1.generateJti)();
    const expiresAt = new Date(Date.now() + jwt_1.REFRESH_TOKEN_TTL_MS);
    await prisma_1.prisma.refreshToken.create({
        data: { jti, userId, expiresAt },
    });
    return (0, jwt_1.signRefreshToken)({ userId, email, jti });
}
/**
 * Verifies a refresh token's signature AND checks it against the DB record,
 * so a token that's been logged-out, rotated away, or expired is rejected
 * even if the JWT signature itself would still technically be valid.
 */
async function getActiveRefreshSession(payload) {
    const record = await prisma_1.prisma.refreshToken.findUnique({ where: { jti: payload.jti } });
    if (!record)
        return null;
    if (record.revokedAt)
        return null;
    if (record.expiresAt.getTime() < Date.now())
        return null;
    if (record.userId !== payload.userId)
        return null;
    return record;
}
/** Marks a single session dead. Idempotent — revoking twice is a no-op. */
async function revokeRefreshToken(jti) {
    await prisma_1.prisma.refreshToken.updateMany({
        where: { jti, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
/** Used on password-reset / "log out everywhere" type flows, if you add one. */
async function revokeAllRefreshTokensForUser(userId) {
    await prisma_1.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
    });
}
