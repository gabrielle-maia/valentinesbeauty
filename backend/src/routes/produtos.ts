import { Router } from "express";
import { db } from "../db";
import { idParam, naoEncontrado } from "../errors";
import { autenticar, exigirTipo } from "../middleware/auth";
import { filtroProdutos, produto } from "../schemas";
import { centavos, produtoDTO } from "../serializers";
import type { ProdutoRow } from "../types";

export const produtosRouter = Router();
const soAdmin = [autenticar, exigirTipo("superadmin")];

const buscar = (id: number) => db.prepare("SELECT * FROM produtos WHERE id = ?").get(id) as ProdutoRow | undefined;

// Público: catálogo (filtros opcionais ?categoria= e ?busca=)
produtosRouter.get("/", (req, res) => {
  const { categoria, busca } = filtroProdutos.parse(req.query);
  const condicoes: string[] = [];
  const params: string[] = [];
  if (categoria) {
    condicoes.push("categoria = ? COLLATE NOCASE");
    params.push(categoria);
  }
  if (busca) {
    condicoes.push("nome LIKE ?");
    params.push(`%${busca}%`);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(" AND ")}` : "";
  const linhas = db.prepare(`SELECT * FROM produtos ${where} ORDER BY id`).all(...params) as ProdutoRow[];
  res.json(linhas.map(produtoDTO));
});

produtosRouter.get("/categorias", (_req, res) => {
  const linhas = db.prepare("SELECT DISTINCT categoria FROM produtos ORDER BY categoria").all() as { categoria: string }[];
  res.json(linhas.map((l) => l.categoria));
});

produtosRouter.get("/:id", (req, res) => {
  const p = buscar(idParam(req.params.id));
  if (!p) throw naoEncontrado("Produto");
  res.json(produtoDTO(p));
});

// Somente Super Admin
produtosRouter.post("/", ...soAdmin, (req, res) => {
  const d = produto.parse(req.body);
  const info = db
    .prepare("INSERT INTO produtos (nome, categoria, preco_centavos, imagem) VALUES (?, ?, ?, ?)")
    .run(d.nome, d.categoria, centavos(d.preco), d.imagem);
  res.status(201).json(produtoDTO(buscar(Number(info.lastInsertRowid))!));
});

produtosRouter.put("/:id", ...soAdmin, (req, res) => {
  const id = idParam(req.params.id);
  const d = produto.parse(req.body);
  const info = db
    .prepare("UPDATE produtos SET nome = ?, categoria = ?, preco_centavos = ?, imagem = ? WHERE id = ?")
    .run(d.nome, d.categoria, centavos(d.preco), d.imagem, id);
  if (!info.changes) throw naoEncontrado("Produto");
  res.json(produtoDTO(buscar(id)!));
});

// Remove do catálogo, favoritos e carrinhos. Pedidos anteriores são mantidos (guardam uma cópia dos itens).
produtosRouter.delete("/:id", ...soAdmin, (req, res) => {
  const info = db.prepare("DELETE FROM produtos WHERE id = ?").run(idParam(req.params.id));
  if (!info.changes) throw naoEncontrado("Produto");
  res.status(204).end();
});
