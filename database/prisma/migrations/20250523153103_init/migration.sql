/*
  Warnings:

  - Added the required column `x` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `z` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "x" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "z" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "pinId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Media_x_z_idx" ON "Media"("x", "z");
