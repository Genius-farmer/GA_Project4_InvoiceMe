-- AlterTable
ALTER TABLE "line_items" ALTER COLUMN "gig_role" DROP NOT NULL,
ALTER COLUMN "gig_description" DROP NOT NULL,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "unit_cost" DROP NOT NULL;
