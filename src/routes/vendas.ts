import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import type { Prisma } from "@prisma/client";

const router = Router();

const itemSchema = z.object({
  produtoSku: z.string().min(1).optional(),
  produto: z.string().min(1),
  quantidade: z.number().int().positive(),
  preco: z.number().positive().optional(),
  desconto: z.number().min(0).optional(),
});


const clienteSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }
    return value;
  },
  z.string().trim().min(1).optional(),
);

const vendaSchema = z.object({
  cliente: clienteSchema,
  data: z.string().min(1).optional(),
  realizadaEm: z.string().datetime().optional(),
  itens: z.array(itemSchema).min(1),
});

router.get("/", async (_req, res) => {
  const vendas = await prisma.venda.findMany({
    orderBy: { createdAt: "desc" },
    include: { itens: true },
  });
  res.json(vendas);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const venda = await prisma.venda.findUnique({
    where: { id },
    include: { itens: true },
  });

  if (!venda) {
    return res.status(404).json({ error: "Venda nao encontrada" });
  }

  res.json(venda);
});

router.post("/", async (req, res) => {
  const parsed = vendaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  const { cliente, data, realizadaEm, itens } = parsed.data;
  const dataVenda = realizadaEm ? new Date(realizadaEm) : data ? new Date(data) : new Date();

  if (Number.isNaN(dataVenda.getTime())) {
    return res.status(400).json({ error: "Data da venda invalida" });
  }

  const produtosResolviveis = await Promise.all(
    itens.map(async (item) => {
      const produto = item.produtoSku
        ? await prisma.produto.findUnique({ where: { sku: item.produtoSku } })
        : await prisma.produto.findFirst({ where: { nome: item.produto } });

      return { item, produto };
    }),
  );

  const produtoInexistente = produtosResolviveis.find(({ produto }) => !produto);
  if (produtoInexistente) {
    return res.status(400).json({ error: "Produto nao encontrado" });
  }

  const quantidadePorSku = new Map<string, number>();
  for (const { item, produto } of produtosResolviveis) {
    if (!produto) {
      continue;
    }
    quantidadePorSku.set(produto.sku, (quantidadePorSku.get(produto.sku) || 0) + item.quantidade);
  }

  const estoqueInsuficiente = produtosResolviveis.find(({ produto }) => {
    if (!produto) {
      return false;
    }
    return (quantidadePorSku.get(produto.sku) || 0) > produto.estoque;
  });

  if (estoqueInsuficiente) {
    return res.status(400).json({
      error: `Estoque insuficiente para ${estoqueInsuficiente.produto?.nome}`,
    });
  }

  const itensNormalizados = produtosResolviveis.map(({ item, produto }) => {
    const precoOriginal = produto!.preco;
    const descontoInformado = item.desconto ??
      (item.preco && item.preco < precoOriginal ? precoOriginal - item.preco : 0);
    const desconto = Math.min(precoOriginal, Math.max(0, descontoInformado));
    const precoFinal = Number((precoOriginal - desconto).toFixed(2));

    return {
      produto: item.produto,
      produtoSku: item.produtoSku ?? null,
      quantidade: item.quantidade,
      precoOriginal,
      desconto: Number(desconto.toFixed(2)),
      preco: precoFinal,
    };
  });

  const total = itensNormalizados.reduce((acc, item) => acc + item.quantidade * item.preco, 0);

  const venda = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.venda.create({
      data: {
        cliente: cliente?.trim() || "Sem cliente informado",
        data: dataVenda,
        total,
        itens: {
          create: itensNormalizados.map((item) => ({
            produto: item.produto,
            produtoSku: item.produtoSku ?? null,
            quantidade: item.quantidade,
            precoOriginal: item.precoOriginal,
            desconto: item.desconto,
            preco: item.preco,
          })),
        },
      },
      include: { itens: true },
    });

    for (const [sku, quantidade] of quantidadePorSku.entries()) {
      const produto = await tx.produto.findUnique({ where: { sku } });
      if (produto) {
        await tx.produto.update({
          where: { sku: produto.sku },
          data: {
            estoque: Math.max(0, produto.estoque - quantidade),
          },
        });
      }
    }

    return created;
  });

  res.status(201).json(venda);
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const venda = await prisma.venda.findUnique({
    where: { id },
    include: { itens: true },
  });

  if (!venda) {
    return res.status(404).json({ error: "Venda nao encontrada" });
  }

  const vendaItens = venda.itens as unknown as Array<{
    produto: string;
    produtoSku: string | null;
    quantidade: number;
  }>;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const item of vendaItens) {
      const produto = item.produtoSku
        ? await tx.produto.findUnique({ where: { sku: item.produtoSku } })
        : await tx.produto.findFirst({ where: { nome: item.produto } });

      if (!produto) {
        continue;
      }

      await tx.produto.update({
        where: { sku: produto.sku },
        data: {
          estoque: produto.estoque + item.quantidade,
        },
      });
    }

    await tx.venda.delete({ where: { id } });
  });

  return res.status(204).send();
});

export default router;
