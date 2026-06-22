/*
  Warnings:

  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "bill_from" JSONB;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "username",
ADD COLUMN     "business_address" VARCHAR(255),
ADD COLUMN     "business_email" VARCHAR(255),
ADD COLUMN     "business_name" VARCHAR(255),
ADD COLUMN     "display_name" VARCHAR(60),
ADD COLUMN     "payment_instructions" TEXT,
ADD COLUMN     "phone" VARCHAR(50);
