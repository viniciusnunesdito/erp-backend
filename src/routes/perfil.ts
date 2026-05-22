import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";

const router = Router();

const perfilSchema = z.object({
  avatarBase64: z.union([z.string().min(1).max(2_000_000), z.null()]).optional(),
  currentPassword: z.string().min(4).optional(),
  newPassword: z.string().min(4).optional(),
});

router.get("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Token invalido" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

  return res.json({
    id: user.id,
    email: user.email,
    avatarBase64: user.avatarBase64,
  });
});

router.put("/", async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Token invalido" });
  }

  const parsed = perfilSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  if (parsed.data.newPassword && !parsed.data.currentPassword) {
    return res.status(400).json({ error: "Senha atual obrigatoria" });
  }
  if (parsed.data.currentPassword && !parsed.data.newPassword) {
    return res.status(400).json({ error: "Nova senha obrigatoria" });
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    return res.status(404).json({ error: "Usuario nao encontrado" });
  }

  let passwordHash: string | undefined;
  if (parsed.data.newPassword) {
    const match = await bcrypt.compare(
      parsed.data.currentPassword ?? "",
      existing.passwordHash,
    );
    if (!match) {
      return res.status(401).json({ error: "Senha atual invalida" });
    }
    passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }

  const data: { avatarBase64?: string | null; passwordHash?: string } = {};
  if (parsed.data.avatarBase64 !== undefined) {
    data.avatarBase64 = parsed.data.avatarBase64;
  }
  if (passwordHash) {
    data.passwordHash = passwordHash;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return res.json({
    id: user.id,
    email: user.email,
    avatarBase64: user.avatarBase64,
  });
});

export default router;
