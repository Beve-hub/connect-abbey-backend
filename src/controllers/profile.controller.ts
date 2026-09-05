import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { updateProfileSchema } from "../validators/profile.validators";

export async function getMyProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      profile: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return res.json({ user });
}

export async function updateMyProfile(req: Request, res: Response) {
  const data = updateProfileSchema.parse(req.body);
  const { name, ...profileFields } = data;
  if (profileFields.avatarUrl === "") {
    profileFields.avatarUrl = null as unknown as string;
  }

  const [user, profile] = await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.userId },
      data: name ? { name } : {},
      select: { id: true, email: true, name: true },
    }),
    prisma.profile.upsert({
      where: { userId: req.user!.userId },
      update: profileFields,
      create: { userId: req.user!.userId, ...profileFields },
    }),
  ]);

  return res.json({ user: { ...user, profile } });
}

// Public-facing profile — used when viewing another user before connecting
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true, profile: true },
  });
  if (!user) throw new AppError("User not found", 404);
  return res.json({ user });
}

// Simple search by name or email fragment, for the "find people to connect with" screen
export async function searchUsers(req: Request, res: Response) {
  const q = (req.query.q as string | undefined)?.trim();
  if (!q) {
    return res.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.userId },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    // Note: email is intentionally NOT selected here. It's still matched
    // against in the OR clause below so search-by-email still works, but any
    // authenticated user being able to read back other users' emails would
    // turn this endpoint into an email enumeration tool.
    select: { id: true, name: true, profile: true },
    take: 20,
  });

  return res.json({ users });
}
