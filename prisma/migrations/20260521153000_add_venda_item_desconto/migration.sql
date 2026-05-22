-- Add fields to preserve original price and discount per sold item.
ALTER TABLE "VendaItem" ADD COLUMN "precoOriginal" REAL NOT NULL DEFAULT 0;
ALTER TABLE "VendaItem" ADD COLUMN "desconto" REAL NOT NULL DEFAULT 0;

UPDATE "VendaItem"
SET "precoOriginal" = "preco"
WHERE "precoOriginal" = 0;
