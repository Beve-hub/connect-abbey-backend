"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_validators_1 = require("../validators/auth.validators");
const jwt_1 = require("../utils/jwt");
const refreshToken_service_1 = require("../services/refreshToken.service");
const SALT_ROUNDS = 10;
async function signup(req, res) {
    const { email, password, name } = auth_validators_1.signupSchema.parse(req.body);
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        throw new errorHandler_1.AppError("We couldn't create your account with those details. If you already have an account, try logging in instead.", 409);
    }
    const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            profile: { create: {} }, // every user gets an empty profile row to fill in later
        },
    });
    const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email });
    const refreshToken = await (0, refreshToken_service_1.issueRefreshToken)(user.id, user.email);
    return res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
    });
}
async function login(req, res) {
    const { email, password } = auth_validators_1.loginSchema.parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new errorHandler_1.AppError("Invalid email or password", 401);
    }
    const passwordMatches = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!passwordMatches) {
        throw new errorHandler_1.AppError("Invalid email or password", 401);
    }
    const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email });
    const refreshToken = await (0, refreshToken_service_1.issueRefreshToken)(user.id, user.email);
    return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
        refreshToken,
    });
}
async function refresh(req, res) {
    const { refreshToken } = auth_validators_1.refreshSchema.parse(req.body);
    let payload;
    try {
        payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
    }
    catch {
        throw new errorHandler_1.AppError("Invalid or expired refresh token", 401);
    }
    const session = await (0, refreshToken_service_1.getActiveRefreshSession)(payload);
    if (!session) {
        throw new errorHandler_1.AppError("Invalid or expired refresh token", 401);
    }
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
        throw new errorHandler_1.AppError("User no longer exists", 401);
    }
    await (0, refreshToken_service_1.revokeRefreshToken)(session.jti);
    const accessToken = (0, jwt_1.signAccessToken)({ userId: user.id, email: user.email });
    const newRefreshToken = await (0, refreshToken_service_1.issueRefreshToken)(user.id, user.email);
    return res.json({ accessToken, refreshToken: newRefreshToken });
}
async function logout(req, res) {
    const { refreshToken } = auth_validators_1.refreshSchema.parse(req.body);
    try {
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
        await (0, refreshToken_service_1.revokeRefreshToken)(payload.jti);
    }
    catch {
    }
    return res.status(200).json({ message: "Logged out successfully" });
}
async function me(req, res) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, email: true, name: true, createdAt: true, profile: true },
    });
    if (!user) {
        throw new errorHandler_1.AppError("User not found", 404);
    }
    return res.json({ user });
}
