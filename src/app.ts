import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import clientesRouter from "./routes/clientes";
import produtosRouter from "./routes/produtos";
import vendasRouter from "./routes/vendas";
import dashboardRouter from "./routes/dashboard";
import perfilRouter from "./routes/perfil";
import { authenticate } from "./middleware/auth";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);

app.use(authenticate);

app.use("/clientes", clientesRouter);
app.use("/produtos", produtosRouter);
app.use("/vendas", vendasRouter);
app.use("/dashboard", dashboardRouter);
app.use("/perfil", perfilRouter);

export default app;
