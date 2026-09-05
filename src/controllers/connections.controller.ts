import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

const sendRequestSchema = z.object({
  addresseeId: z.string().uuid(),
});

const respondSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"]),
});

// POST /connections — send a connection request
export async function sendConnectionRequest(req: Request, res: Response) {
  const { addresseeId } = sendRequestSchema.parse(req.body);
  const requesterId = req.user!.userId;

  if (addresseeId === requesterId) {
    throw new AppError("You cannot connect with yourself", 400);
  }

  const addressee = await prisma.user.findUnique({ where: { id: addresseeId } });
  if (!addressee) throw new AppError("Target user not found", 404);

  // Check both directions — either party may have already initiated a request
  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { requesterId, addresseeId },
        { requesterId: addresseeId, addresseeId: requesterId },
      ],
    },
  });

  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new AppError("You are already connected with this user", 409);
    }
    if (existing.status === "PENDING") {
      throw new AppError("A connection request is already pending", 409);
    }
    // status === REJECTED: allow re-sending by updating the existing row
    const updated = await prisma.connection.update({
      where: { id: existing.id },
      data: { requesterId, addresseeId, status: "PENDING" },
    });
    return res.status(201).json({ connection: updated });
  }

  const connection = await prisma.connection.create({
    data: { requesterId, addresseeId, status: "PENDING" },
  });

  return res.status(201).json({ connection });
}

// PATCH /connections/:id — accept or reject an incoming request
export async function respondToConnectionRequest(req: Request, res: Response) {
  const { id } = req.params;
  const { action } = respondSchema.parse(req.body);
  const userId = req.user!.userId;

  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) throw new AppError("Connection request not found", 404);

  // Only the addressee can accept/reject — the requester just waits
  if (connection.addresseeId !== userId) {
    throw new AppError("You are not authorized to respond to this request", 403);
  }
  if (connection.status !== "PENDING") {
    throw new AppError("This request has already been responded to", 409);
  }

  const updated = await prisma.connection.update({
    where: { id },
    data: { status: action === "ACCEPT" ? "ACCEPTED" : "REJECTED" },
  });

  return res.json({ connection: updated });
}

// DELETE /connections/:id — remove an existing accepted connection (either side)
export async function removeConnection(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.userId;

  const connection = await prisma.connection.findUnique({ where: { id } });
  if (!connection) throw new AppError("Connection not found", 404);

  if (connection.requesterId !== userId && connection.addresseeId !== userId) {
    throw new AppError("You are not part of this connection", 403);
  }

  await prisma.connection.delete({ where: { id } });
  return res.status(204).send();
}

// GET /connections — list accepted connections for the current user
export async function listConnections(req: Request, res: Response) {
  const userId = req.user!.userId;

  const connections = await prisma.connection.findMany({
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
  const results = connections.map((c: (typeof connections)[number]) => ({
    connectionId: c.id,
    connectedSince: c.updatedAt,
    user: c.requesterId === userId ? c.addressee : c.requester,
  }));

  return res.json({ connections: results });
}

// GET /connections/pending — incoming requests awaiting the current user's response
export async function listPendingRequests(req: Request, res: Response) {
  const userId = req.user!.userId;

  const pending = await prisma.connection.findMany({
    where: { addresseeId: userId, status: "PENDING" },
    include: {
      requester: { select: { id: true, name: true, profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    requests: pending.map((p: (typeof pending)[number]) => ({
      connectionId: p.id,
      requestedAt: p.createdAt,
      user: p.requester,
    })),
  });
}

// GET /connections/sent — outgoing requests the current user is waiting on
export async function listSentRequests(req: Request, res: Response) {
  const userId = req.user!.userId;

  const sent = await prisma.connection.findMany({
    where: { requesterId: userId, status: "PENDING" },
    include: {
      addressee: { select: { id: true, name: true, profile: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    requests: sent.map((s: (typeof sent)[number]) => ({
      connectionId: s.id,
      requestedAt: s.createdAt,
      user: s.addressee,
    })),
  });
}
