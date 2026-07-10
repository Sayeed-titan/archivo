import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const file = await prisma.file.findFirst({ where: { filename: { contains: "pasted-from-explorer" } } });
if (file) {
  await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date(), isLatest: false } });
  console.log("Soft-deleted test file:", file.filename);
} else {
  console.log("No test file found to clean up.");
}
await prisma.$disconnect();
