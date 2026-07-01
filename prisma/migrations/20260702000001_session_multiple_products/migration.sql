-- Session can now have MULTIPLE products.
-- Data-preserving migration: every existing session's single output/product
-- becomes one SessionProduct row, and existing auto-created portfolio items
-- are linked to that migrated product.

-- 1. New table
CREATE TABLE "SessionProduct" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SessionProduct_sessionId_sortOrder_idx" ON "SessionProduct"("sessionId", "sortOrder");

ALTER TABLE "SessionProduct" ADD CONSTRAINT "SessionProduct_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Migrate each session's existing single product into a SessionProduct row.
--    Deterministic id (sessionId + '_p1') lets us link portfolio items below.
INSERT INTO "SessionProduct" ("id", "sessionId", "name", "type", "description", "imageUrl", "imageAlt", "sortOrder", "updatedAt")
SELECT "id" || '_p1', "id", "outputName", "outputType", "outputDescription", "productImageUrl", "productImageAlt", 0, CURRENT_TIMESTAMP
FROM "CourseSession";

-- 3. Link existing auto-created portfolio items to the migrated product.
ALTER TABLE "PortfolioItem" ADD COLUMN "productId" TEXT;

ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "SessionProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "PortfolioItem"
SET "productId" = "sessionId" || '_p1'
WHERE "sessionId" IS NOT NULL AND "createdAutomatically" = true;

-- 4. Uniqueness is now per child per session PRODUCT (was per session).
DROP INDEX "PortfolioItem_childId_sessionId_key";
CREATE UNIQUE INDEX "PortfolioItem_childId_sessionId_productId_key" ON "PortfolioItem"("childId", "sessionId", "productId");
CREATE INDEX "PortfolioItem_childId_isActive_idx" ON "PortfolioItem"("childId", "isActive");

-- 5. Drop the old single-product columns from CourseSession.
ALTER TABLE "CourseSession"
    DROP COLUMN "outputType",
    DROP COLUMN "outputName",
    DROP COLUMN "outputDescription",
    DROP COLUMN "productImageUrl",
    DROP COLUMN "productImageAlt";
