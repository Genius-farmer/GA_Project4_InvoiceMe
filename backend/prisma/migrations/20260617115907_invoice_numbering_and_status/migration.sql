/*
  Warnings:

  - The values [sent] on the enum `InvoiceStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[user_id,invoice_seq]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InvoiceStatus_new" AS ENUM ('draft', 'issued', 'paid', 'cancelled');
ALTER TABLE "public"."invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "InvoiceStatus_new" USING ("status"::text::"InvoiceStatus_new");
ALTER TYPE "InvoiceStatus" RENAME TO "InvoiceStatus_old";
ALTER TYPE "InvoiceStatus_new" RENAME TO "InvoiceStatus";
DROP TYPE "public"."InvoiceStatus_old";
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'draft';
COMMIT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "invoice_seq" INTEGER,
ALTER COLUMN "invoice_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invoice_counter" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_user_id_invoice_seq_key" ON "invoices"("user_id", "invoice_seq");
