import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import { autenticar, exigirTipo } from "./middleware/auth";
import { rotaNaoEncontrada, tratarErros } from "./middleware/erros";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { carrinhoRouter } from "./routes/carrinho";
import { enderecosRouter } from "./routes/enderecos";
import { favoritosRouter } from "./routes/favoritos";
import { meRouter } from "./routes/me";
import { pedidosRouter } from "./routes/pedidos";
import { produtosRouter } from "./routes/produtos";
import { UPLOADS_DIR } from "./uploads";

export function criarApp() {
  const app = express();
  app.disable("x-powered-by");
  // crossOriginResourcePolicy liberada para o app carregar as fotos de perfil de outra origem
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: config.CORS_ORIGIN === "*" ? "*" : config.CORS_ORIGIN.split(",").map((o) => o.trim()),
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/uploads", express.static(UPLOADS_DIR, { index: false, maxAge: "7d" }));

  app.get("/api/saude", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/produtos", produtosRouter); // leitura pública; escrita protegida dentro do router
  app.use("/api/me", autenticar, meRouter);
  app.use("/api/favoritos", autenticar, favoritosRouter);
  app.use("/api/carrinho", autenticar, carrinhoRouter);
  app.use("/api/enderecos", autenticar, enderecosRouter);
  app.use("/api/pedidos", autenticar, pedidosRouter);
  app.use("/api/admin", autenticar, exigirTipo("superadmin"), adminRouter);

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);
  return app;
}
