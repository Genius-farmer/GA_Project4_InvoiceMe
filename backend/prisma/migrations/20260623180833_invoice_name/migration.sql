/*
  Warnings:

  - You are about to drop the column `title` on the `invoices` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "title",
ADD COLUMN     "invoiceName" VARCHAR(255) NOT NULL DEFAULT '';
