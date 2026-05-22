-- AlterTable
ALTER TABLE "Produto" ADD COLUMN "fotoBase64" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarBase64" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_VendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "produto" TEXT NOT NULL,
    "produtoSku" TEXT,
    "quantidade" INTEGER NOT NULL,
    "precoOriginal" REAL NOT NULL,
    "desconto" REAL NOT NULL DEFAULT 0,
    "preco" REAL NOT NULL,
    "vendaId" TEXT NOT NULL,
    CONSTRAINT "VendaItem_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_VendaItem" ("desconto", "id", "preco", "precoOriginal", "produto", "produtoSku", "quantidade", "vendaId") SELECT "desconto", "id", "preco", "precoOriginal", "produto", "produtoSku", "quantidade", "vendaId" FROM "VendaItem";
DROP TABLE "VendaItem";
ALTER TABLE "new_VendaItem" RENAME TO "VendaItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
