import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

type ConnectionStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";

const PAGE_SIZE = 30;

export async function listUsers(req: Request, res: Response) {
  const currentUserId = req.user!.userId;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  const pageParam = Number(req.query.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const where = {
    id: { not: currentUserId },
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [totalCount, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        profile: { select: { jobTitle: true, bio: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

 const connections = await prisma.connection.findMany({
    where: {
      OR: [{ requesterId: currentUserId }, { addresseeId: currentUserId }],
    },
    select: { requesterId: true, addresseeId: true, status: true },
  });

  const statusByUserId = new Map<string, ConnectionStatus>();
  for (const c of connections) {
    const otherId = c.requesterId === currentUserId ? c.addresseeId : c.requesterId;
    if (c.status === "ACCEPTED") {
      statusByUserId.set(otherId, "ACCEPTED");
    } else if (c.status === "PENDING") {
      statusByUserId.set(
        otherId,
        c.requesterId === currentUserId ? "PENDING_SENT" : "PENDING_RECEIVED"
      );
    }
  }

  const results = users.map((u: (typeof users)[number]) => ({
    id: u.id,
    name: u.name,
    profile: u.profile,
    connectionStatus: statusByUserId.get(u.id) ?? "NONE",
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return res.json({
    users: results,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
}