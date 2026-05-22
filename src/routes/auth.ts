import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import prisma from "../lib/prisma";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Dados invalidos" });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Credenciais invalidas" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "Credenciais invalidas" });
  }

  const secret = process.env.JWT_SECRET || "";
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET nao configurado" });
  }

  const token = jwt.sign({ userId: user.id, email: user.email }, secret, {
    expiresIn: "8h",
  });

  return res.json({
    token,
    user: { id: user.id, email: user.email },
  });
});

export default router;
