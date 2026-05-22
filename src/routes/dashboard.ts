import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const endOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
};

const parseDateParam = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatLabel = (date: Date) => {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
};

router.get("/", async (req, res) => {
  const preset = String(req.query.preset || "7d");
  const startParam = parseDateParam(req.query.start as string | undefined);
  const endParam = parseDateParam(req.query.end as string | undefined);

  const now = new Date();
  let start = startOfDay(now);
  let end = endOfDay(now);

  if (preset === "day") {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (preset === "7d") {
    const base = new Date(now);
    base.setDate(base.getDate() - 6);
    start = startOfDay(base);
    end = endOfDay(now);
  } else if (preset === "30d") {
    const base = new Date(now);
    base.setDate(base.getDate() - 29);
    start = startOfDay(base);
    end = endOfDay(now);
  } else if (preset === "6m") {
    const base = new Date(now);
    base.setMonth(base.getMonth() - 6);
    start = startOfDay(base);
    end = endOfDay(now);
  } else if (preset === "custom") {
    if (!startParam || !endParam) {
      return res.status(400).json({ error: "Periodo personalizado invalido" });
    }
    start = startOfDay(startParam);
    end = endOfDay(endParam);
  }

  if (start > end) {
    return res.status(400).json({ error: "Periodo invalido" });
  }

  const vendas = await prisma.venda.findMany({
    where: { data: { gte: start, lte: end } },
    select: { data: true, total: true },
    orderBy: { data: "asc" },
  });

  const totalVendido = vendas.reduce((acc, venda) => acc + venda.total, 0);
  const quantidadeVendas = vendas.length;

  const dayCount = new Map<string, number>();
  const dayTotal = new Map<string, number>();

  const current = new Date(start);
  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    dayCount.set(key, 0);
    dayTotal.set(key, 0);
    current.setDate(current.getDate() + 1);
  }

  vendas.forEach((venda) => {
    const key = new Date(venda.data).toISOString().slice(0, 10);
    dayCount.set(key, (dayCount.get(key) || 0) + 1);
    dayTotal.set(key, (dayTotal.get(key) || 0) + venda.total);
  });

  const performance = Array.from(dayCount.entries()).map(([key, count]) => {
    const label = formatLabel(new Date(key));
    return {
      label,
      valor: count,                        
      totalVendido: dayTotal.get(key) || 0,
    };
  });

  const totalDays = Math.max(1, dayCount.size);
  const mediaDiaria = quantidadeVendas / totalDays;

  const produtosBaixo = await prisma.produto.findMany({
    where: { estoque: { lte: 10 } },
  });
  type ProdutoBaixo = (typeof produtosBaixo)[number];

  res.json({
    range: {
      preset,
      start: start.toISOString(),
      end: end.toISOString(),
    },
    indicadores: [
      {
        titulo: "Total vendido",
        valor: totalVendido,
        detalhe: "Periodo selecionado",
      },
      {
        titulo: "Quantidade vendas",
        valor: quantidadeVendas,
        detalhe: `Media diaria: ${mediaDiaria.toFixed(1)}`,
      },
      {
        titulo: "Estoque baixo",
        valor: produtosBaixo.length,
      },
    ],
    performance,
    alertas: produtosBaixo.map((produto: ProdutoBaixo) => ({
      id: produto.sku,
      titulo: produto.nome,
      nivel: produto.estoque <= 5 ? "Critico" : "Atencao",
      estoque: produto.estoque,
    })),
  });
});

export default router;
