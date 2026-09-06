"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendConnectionRequest = sendConnectionRequest;
exports.respondToConnectionRequest = respondToConnectionRequest;
exports.removeConnection = removeConnection;
exports.listConnections = listConnections;
exports.listPendingRequests = listPendingRequests;
exports.listSentRequests = listSentRequests;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const errorHandler_1 = require("../middleware/errorHandler");
const sendRequestSchema = zod_1.z.object({
    addresseeId: zod_1.z.string().uuid(),
});
const respondSchema = zod_1.z.object({
    action: zod_1.z.enum(["ACCEPT", "REJECT"]),
});
// POST /connections — send a connection request
async function sendConnectionRequest(req, res) {
    const { addresseeId } = sendRequestSchema.parse(req.body);
    const requesterId = req.user.userId;
    if (addresseeId === requesterId) {
        throw new errorHandler_1.AppError("You cannot connect with yourself", 400);
    }
    const addressee = await prisma_1.prisma.user.findUnique({ where: { id: addresseeId } });
    if (!addressee)
        throw new errorHandler_1.AppError("Target user not found", 404);
    // Check both directions — either party may have already initiated a request
    const existing = await prisma_1.prisma.connection.findFirst({
        where: {
            OR: [
                { requesterId, addresseeId },
                { requesterId: addresseeId, addresseeId: requesterId },
            ],
        },
    });
    if (existing) {
        if (existing.status === "ACCEPTED") {
            throw new errorHandler_1.AppError("You are already connected with this user", 409);
        }
        if (existing.status === "PENDING") {
            throw new errorHandler_1.AppError("A connection request is already pending", 409);
        }
        // status === REJECTED: allow re-sending by updating the existing row
        const updated = await prisma_1.prisma.connection.update({
            where: { id: existing.id },
            data: { requesterId, addresseeId, status: "PENDING" },
        });
        return res.status(201).json({ connection: updated });
    }
    const connection = await prisma_1.prisma.connection.create({
        data: { requesterId, addresseeId, status: "PENDING" },
    });
    return res.status(201).json({ connection });
}
// PATCH /connections/:id — accept or reject an incoming request
async function respondToConnectionRequest(req, res) {
    const id = req.params.id;
    const { action } = respondSchema.parse(req.body);
    const userId = req.user.userId;
    const connection = await prisma_1.prisma.connection.findUnique({ where: { id } });
    if (!connection)
        throw new errorHandler_1.AppError("Connection request not found", 404);
    // Only the addressee can accept/reject — the requester just waits
    if (connection.addresseeId !== userId) {
        throw new errorHandler_1.AppError("You are not authorized to respond to this request", 403);
    }
    if (connection.status !== "PENDING") {
        throw new errorHandler_1.AppError("This request has already been responded to", 409);
    }
    const updated = await prisma_1.prisma.connection.update({
        where: { id },
        data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
    });
    return res.json({ connection: updated });
}
// DELETE /connections/:id — remove an existing accepted connection (either side)
async function removeConnection(req, res) {
    const id = req.params.id;
    const userId = req.user.userId;
    const connection = await prisma_1.prisma.connection.findUnique({ where: { id } });
    if (!connection)
        throw new errorHandler_1.AppError("Connection not found", 404);
    if (connection.requesterId !== userId && connection.addresseeId !== userId) {
        throw new errorHandler_1.AppError("You are not part of this connection", 403);
    }
    await prisma_1.prisma.connection.delete({ where: { id } });
    return res.status(204).send();
}
// GET /connections — list accepted connections for the current user
async function listConnections(req, res) {
    const userId = req.user.userId;
    const connections = await prisma_1.prisma.connection.findMany({
        where: {
            status: "ACCEPTED",
            OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
        include: {
            requester: { select: { id: true, name: true, profile: true } },
            addressee: { select: { id: true, name: true, profile: true } },
        },
        orderBy: { updatedAt: "desc" },
    });
    // Flatten so the client always gets "the other person", regardless of who initiated
    const results = connections.map((c) => ({
        connectionId: c.id,
        connectedSince: c.updatedAt,
        user: c.requesterId === userId ? c.addressee : c.requester,
    }));
    return res.json({ connections: results });
}
// GET /connections/pending — incoming requests awaiting the current user's response
async function listPendingRequests(req, res) {
    const userId = req.user.userId;
    const pending = await prisma_1.prisma.connection.findMany({
        where: { addresseeId: userId, status: "PENDING" },
        include: {
            requester: { select: { id: true, name: true, profile: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json({
        requests: pending.map((p) => ({
            connectionId: p.id,
            requestedAt: p.createdAt,
            user: p.requester,
        })),
    });
}
// outgoing requests the current user is waiting on
async function listSentRequests(req, res) {
    const userId = req.user.userId;
    const sent = await prisma_1.prisma.connection.findMany({
        where: { requesterId: userId, status: "PENDING" },
        include: {
            addressee: { select: { id: true, name: true, profile: true } },
        },
        orderBy: { createdAt: "desc" },
    });
    return res.json({
        requests: sent.map((s) => ({
            connectionId: s.id,
            requestedAt: s.createdAt,
            user: s.addressee,
        })),
    });
}
