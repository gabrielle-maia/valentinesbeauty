import { Router } from "express";
import { montarCarrinho } from "../consultas";
import { db } from "../db";
import { idParam, naoEncontrado } from "../errors";
import { carrinhoAdicionar, carrinhoQuantidade } from "../schemas";

export const carrinhoRouter = Router();

carrinhoRouter.get("/", (req, res) => {
  res.json(montarCarrinho(req.usuario!.id));
});

// Adicionar um produto que já está no carrinho soma à quantidade (máx. 99 por produto).
carrinhoRouter.post("/itens", (req, res) => {
  const { produtoId, quantidade } = carrinhoAdicionar.parse(req.body);
  if (!db.prepare("SELECT 1 FROM produtos WHERE id = ?").get(produtoId)) throw naoEncontrado("Produto");
  db.prepare(
    `INSERT INTO carrinho_itens (usuario_id, produto_id, quantidade) VALUES (?, ?, ?)
     ON CONFLICT (usuario_id, produto_id) DO UPDATE SET quantidade = MIN(quantidade + excluded.quantidade, 99)`,
  ).run(req.usuario!.id, produtoId, quantidade);
  res.status(201).json(montarCarrinho(req.usuario!.id));
});

carrinhoRouter.patch("/itens/:produtoId", (req, res) => {
  const { quantidade } = carrinhoQuantidade.parse(req.body);
  const info = db
    .prepare("UPDATE carrinho_itens SET quantidade = ? WHERE usuario_id = ? AND produto_id = ?")
    .run(quantidade, req.usuario!.id, idParam(req.params.produtoId));
  if (!info.changes) throw naoEncontrado("Item");
  res.json(montarCarrinho(req.usuario!.id));
});

carrinhoRouter.delete("/itens/:produtoId", (req, res) => {
  db.prepare("DELETE FROM carrinho_itens WHERE usuario_id = ? AND produto_id = ?").run(
    req.usuario!.id,
    idParam(req.params.produtoId),
  );
  res.json(montarCarrinho(req.usuario!.id));
});

carrinhoRouter.delete("/", (req, res) => {
  db.prepare("DELETE FROM carrinho_itens WHERE usuario_id = ?").run(req.usuario!.id);
  res.json(montarCarrinho(req.usuario!.id));
});
