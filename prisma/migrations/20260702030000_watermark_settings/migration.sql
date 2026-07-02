-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "watermarkEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "watermarkText" TEXT;

