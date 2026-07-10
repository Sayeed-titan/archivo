import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// The upload-rename test left a real File row + a real file on disk under
// storage/uploads/ — soft-delete it (consistent with the app's own delete
// semantics; nothing in this app hard-deletes files from the UI).
const file = await prisma.file.findFirst({
  where: { filename: { contains: "Renamed Upload Test" } },
});
if (file) {
  await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date(), isLatest: false } });
  console.log("Soft-deleted test file:", file.filename);
} else {
  console.log("No test file found to clean up.");
}
await prisma.$disconnect();
