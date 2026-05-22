import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = Router();

const clienteSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  status: z.string().optional(),
  telefone: z.string().optional(),
});

router.get("/", async (_req, res) => {
  const clientes = await prisma.cliente.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(clientes);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });

  if (!cliente) {
    return res.status(404).json({ error: "Cliente nao encontrado" });
  }

  res.json(cliente);
});

router.post("/", async (req, res) => {
  const parsed = clienteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  const cliente = await prisma.cliente.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      status: parsed.data.status || "Ativo",
      telefone: parsed.data.telefone,
    },
  });

  res.status(201).json(cliente);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = clienteSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  try {
    const cliente = await prisma.cliente.update({
      where: { id },
      data: parsed.data,
    });
    res.json(cliente);
  } catch {
    res.status(404).json({ error: "Cliente nao encontrado" });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.cliente.delete({ where: { id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Cliente nao encontrado" });
  }
});

export default router;
