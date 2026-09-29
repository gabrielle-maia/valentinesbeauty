import { Router } from "express";
import { db } from "../db";
import { idParam, naoEncontrado } from "../errors";
import { produtoDTO } from "../serializers";
import type { ProdutoRow } from "../types";

export const favoritosRouter = Router();

favoritosRouter.get("/", (req, res) => {
  const linhas = db
    .prepare("SELECT p.* FROM favoritos f JOIN produtos p ON p.id = f.produto_id WHERE f.usuario_id = ? ORDER BY p.id")
    .all(req.usuario!.id) as ProdutoRow[];
  res.json(linhas.map(produtoDTO));
});

// Idempotente: favoritar duas vezes não gera erro nem duplicata.
favoritosRouter.put("/:produtoId", (req, res) => {
  const produtoId = idParam(req.params.produtoId);
  if (!db.prepare("SELECT 1 FROM produtos WHERE id = ?").get(produtoId)) throw naoEncontrado("Produto");
  db.prepare("INSERT OR IGNORE INTO favoritos (usuario_id, produto_id) VALUES (?, ?)").run(req.usuario!.id, produtoId);
  res.status(204).end();
});

favoritosRouter.delete("/:produtoId", (req, res) => {
  db.prepare("DELETE FROM favoritos WHERE usuario_id = ? AND produto_id = ?").run(
    req.usuario!.id,
    idParam(req.params.produtoId),
  );
  res.status(204).end();
});
