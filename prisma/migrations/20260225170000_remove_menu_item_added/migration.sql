-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LegalPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "shopifyPageId" TEXT,
    "contentHtml" TEXT,
    "formData" TEXT,
    "formSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegalPage_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LegalPage" ("id", "storeId", "pageType", "shopifyPageId", "contentHtml", "formData", "formSchemaVersion", "status", "version", "createdAt", "updatedAt") SELECT "id", "storeId", "pageType", "shopifyPageId", "contentHtml", "formData", "formSchemaVersion", "status", "version", "createdAt", "updatedAt" FROM "LegalPage";
DROP TABLE "LegalPage";
ALTER TABLE "new_LegalPage" RENAME TO "LegalPage";
CREATE UNIQUE INDEX "LegalPage_storeId_pageType_key" ON "LegalPage"("storeId", "pageType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
