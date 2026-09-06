"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_TTL_MS = void 0;
exports.signAccessToken = signAccessToken;
exports.generateJti = generateJti;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
// Refresh sessions live 24h. Kept as one constant so the JWT's own expiry and
// the DB row's expiresAt can never drift apart.
exports.REFRESH_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in the environment");
}
function signAccessToken(payload) {
    const options = {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? "15m"),
    };
    return jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, options);
}
function generateJti() {
    return crypto_1.default.randomUUID();
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: exports.REFRESH_TOKEN_TTL_MS / 1000 });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
}
