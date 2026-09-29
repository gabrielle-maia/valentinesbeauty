import { Router } from "express";
import { linhasCarrinho, montarPedidos, totalCentavos } from "../consultas";
import { db } from "../db";
import { HttpError, idParam, naoEncontrado } from "../errors";
import { pedidoNovo } from "../schemas";
import type { EnderecoRow, Pagamento, PedidoRow, UsuarioRow } from "../types";

export const pedidosRouter = Router();

// Transforma o carrinho em pedido de forma atômica: se algo falhar, nada é gravado.
const criarPedido = db.transaction((usuario: UsuarioRow, enderecoId: number, pagamento: Pagamento) => {
  const end = db
    .prepare("SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?")
    .get(enderecoId, usuario.id) as EnderecoRow | undefined;
  if (!end) throw new HttpError(400, "Selecione um endereço de entrega.");

  const linhas = linhasCarrinho(usuario.id);
  if (!linhas.length) throw new HttpError(400, "Seu carrinho está vazio.");

  const info = db
    .prepare(
      `INSERT INTO pedidos (usuario_id, status, pagamento, total_centavos,
         end_rua, end_numero, end_complemento, end_bairro, end_cidade, end_uf, end_cep)
       VALUES (?, 'Recebido', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(usuario.id, pagamento, totalCentavos(linhas), end.rua, end.numero, end.complemento, end.bairro, end.cidade, end.uf, end.cep);
  const pedidoId = Number(info.lastInsertRowid);

  const inserirItem = db.prepare(
    `INSERT INTO pedido_itens (pedido_id, produto_id, nome, categoria, imagem, preco_centavos, quantidade)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const l of linhas) inserirItem.run(pedidoId, l.id, l.nome, l.categoria, l.imagem, l.preco_centavos, l.quantidade);

  db.prepare("DELETE FROM carrinho_itens WHERE usuario_id = ?").run(usuario.id);
  return pedidoId;
});

const buscar = (id: number) => db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id) as PedidoRow;

pedidosRouter.post("/", (req, res) => {
  // Os dados do cartão são validados e descartados: pagamento é demonstração e nada é cobrado.
  const { enderecoId, pagamento } = pedidoNovo.parse(req.body);
  const id = criarPedido(req.usuario!, enderecoId, pagamento);
  res.status(201).json(montarPedidos([buscar(id)])[0]);
});

pedidosRouter.get("/", (req, res) => {
  const linhas = db
    .prepare("SELECT * FROM pedidos WHERE usuario_id = ? ORDER BY id DESC")
    .all(req.usuario!.id) as PedidoRow[];
  res.json(montarPedidos(linhas));
});

pedidosRouter.get("/:id", (req, res) => {
  const p = db
    .prepare("SELECT * FROM pedidos WHERE id = ? AND usuario_id = ?")
    .get(idParam(req.params.id), req.usuario!.id) as PedidoRow | undefined;
  if (!p) throw naoEncontrado("Pedido");
  res.json(montarPedidos([p])[0]);
});
