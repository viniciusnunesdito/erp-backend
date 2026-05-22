import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthPayload = {
  userId: string;
  email: string;
};

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthPayload;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const token = header.replace("Bearer ", "").trim();
  const secret = process.env.JWT_SECRET || "";
  if (!secret) {
    return res.status(500).json({ error: "JWT_SECRET nao configurado" });
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
};
