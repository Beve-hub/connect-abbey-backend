"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyProfile = getMyProfile;
exports.updateMyProfile = updateMyProfile;
exports.getUserById = getUserById;
exports.searchUsers = searchUsers;
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const profile_validators_1 = require("../validators/profile.validators");
async function getMyProfile(req, res) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
            profile: true,
        },
    });
    if (!user)
        throw new errorHandler_1.AppError("User not found", 404);
    return res.json({ user });
}
async function updateMyProfile(req, res) {
    const data = profile_validators_1.updateProfileSchema.parse(req.body);
    const { name, ...profileFields } = data;
    if (profileFields.avatarUrl === "") {
        profileFields.avatarUrl = null;
    }
    const [user, profile] = await prisma_1.prisma.$transaction([
        prisma_1.prisma.user.update({
            where: { id: req.user.userId },
            data: name ? { name } : {},
            select: { id: true, email: true, name: true },
        }),
        prisma_1.prisma.profile.upsert({
            where: { userId: req.user.userId },
            update: profileFields,
            create: { userId: req.user.userId, ...profileFields },
        }),
    ]);
    return res.json({ user: { ...user, profile } });
}
// Public-facing profile — used when viewing another user before connecting
async function getUserById(req, res) {
    const id = req.params.id;
    const user = await prisma_1.prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, createdAt: true, profile: true },
    });
    if (!user)
        throw new errorHandler_1.AppError("User not found", 404);
    return res.json({ user });
}
// Simple search by name or email fragment, for the "find people to connect with" screen
async function searchUsers(req, res) {
    const q = req.query.q?.trim();
    if (!q) {
        return res.json({ users: [] });
    }
    const users = await prisma_1.prisma.user.findMany({
        where: {
            id: { not: req.user.userId },
            OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true, profile: true },
        take: 20,
    });
    return res.json({ users });
}
