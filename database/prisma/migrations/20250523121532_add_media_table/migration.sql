-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "note" TEXT,
    "pinId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Media_pinId_idx" ON "Media"("pinId");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_pinId_fkey" FOREIGN KEY ("pinId") REFERENCES "Pin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
