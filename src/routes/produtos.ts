import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = Router();

const produtoSchema = z.object({
  nome: z.string().min(1),
  preco: z.union([z.number(), z.string()]),
  estoque: z.union([z.number(), z.string()]),
  fotoBase64: z.union([z.string().min(1).max(2_000_000), z.null()]).optional(),
});

const parseNumber = (value: string | number) => {
  if (typeof value === "number") {
    return value;
  }
  let cleaned = value.replace(/[^0-9,.-]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "");
  }
  cleaned = cleaned.replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const createSku = () => {
  return `PR-${Date.now()}`;
};

router.get("/", async (_req, res) => {
  const produtos = await prisma.produto.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(produtos);
});

router.get("/:sku", async (req, res) => {
  const { sku } = req.params;
  const produto = await prisma.produto.findUnique({ where: { sku } });

  if (!produto) {
    return res.status(404).json({ error: "Produto nao encontrado" });
  }

  res.json(produto);
});

router.post("/", async (req, res) => {
  const parsed = produtoSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  const preco = parseNumber(parsed.data.preco);
  const estoque = Math.max(0, Math.floor(parseNumber(parsed.data.estoque)));

  const produto = await prisma.produto.create({
    data: {
      sku: createSku(),
      nome: parsed.data.nome,
      preco,
      estoque,
      fotoBase64: parsed.data.fotoBase64 ?? null,
    },
  });

  res.status(201).json(produto);
});

router.put("/:sku", async (req, res) => {
  const { sku } = req.params;
  const parsed = produtoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  try {
    const produto = await prisma.produto.update({
      where: { sku },
      data: {
        nome: parsed.data.nome,
        preco:
          parsed.data.preco === undefined
            ? undefined
            : parseNumber(parsed.data.preco),
        estoque:
          parsed.data.estoque === undefined
            ? undefined
            : Math.max(0, Math.floor(parseNumber(parsed.data.estoque))),
        fotoBase64:
          parsed.data.fotoBase64 === undefined
            ? undefined
            : parsed.data.fotoBase64,
      },
    });

    res.json(produto);
  } catch {
    res.status(404).json({ error: "Produto nao encontrado" });
  }
});

router.delete("/:sku", async (req, res) => {
  const { sku } = req.params;

  try {
    await prisma.produto.delete({ where: { sku } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Produto nao encontrado" });
  }
});

export default router;
