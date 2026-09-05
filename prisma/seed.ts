import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    { email: "alice@example.com", name: "Alice Johnson", bio: "Product designer", jobTitle: "Senior Product Designer" },
    { email: "bob@example.com", name: "Bob Smith", bio: "Backend engineer", jobTitle: "Software Engineer" },
    { email: "carla@example.com", name: "Carla Reyes", bio: "Loan officer", jobTitle: "Mortgage Loan Officer" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash: password,
        profile: { create: { bio: u.bio, jobTitle: u.jobTitle } },
      },
    });
  }

  console.log("Seeded users (all with password: password123):");
  users.forEach((u) => console.log(` - ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
