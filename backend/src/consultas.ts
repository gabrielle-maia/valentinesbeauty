import bcrypt from "bcryptjs";
import { db } from "./db";
import { HttpError } from "./errors";
import { pedidoDTO, produtoDTO, reais } from "./serializers";
import type { PedidoItemRow, PedidoRow, ProdutoRow, Tipo, UsuarioRow } from "./types";

export const buscarUsuario = (id: number) =>
  db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as UsuarioRow | undefined;

export async function criarUsuario(d: { nome: string; email: string; senha: string; tipo: Tipo; loja?: string }) {
  const hash = await bcrypt.hash(d.senha, 10);
  // Da verificação ao INSERT não há await, então não existe corrida entre dois cadastros.
  if (db.prepare("SELECT 1 FROM usuarios WHERE email = ?").get(d.email)) {
    throw new HttpError(409, "Este e-mail já está cadastrado.");
  }
  const info = db
    .prepare("INSERT INTO usuarios (nome, email, senha_hash, tipo, loja) VALUES (?, ?, ?, ?, ?)")
    .run(d.nome, d.email, hash, d.tipo, d.tipo === "dono" ? d.loja ?? null : null);
  return buscarUsuario(Number(info.lastInsertRowid))!;
}

/** Atualiza nome, e-mail e (para donos) loja. Usado pelo próprio usuário e pelo admin. */
export function atualizarPerfil(alvo: UsuarioRow, d: { nome?: string; email?: string; loja?: string }) {
  if (d.email && d.email !== alvo.email) {
    if (db.prepare("SELECT 1 FROM usuarios WHERE email = ? AND id <> ?").get(d.email, alvo.id)) {
      throw new HttpError(409, "Este e-mail já está em uso.");
    }
  }
  const loja = alvo.tipo === "dono" ? d.loja ?? alvo.loja : null;
  db.prepare("UPDATE usuarios SET nome = ?, email = ?, loja = ? WHERE id = ?").run(
    d.nome ?? alvo.nome,
    d.email ?? alvo.email,
    loja,
    alvo.id,
  );
  return buscarUsuario(alvo.id)!;
}

type LinhaCarrinho = ProdutoRow & { quantidade: number };

export const linhasCarrinho = (usuarioId: number) =>
  db
    .prepare(
      `SELECT p.*, c.quantidade
         FROM carrinho_itens c JOIN produtos p ON p.id = c.produto_id
        WHERE c.usuario_id = ? ORDER BY c.id`,
    )
    .all(usuarioId) as LinhaCarrinho[];

export const totalCentavos = (linhas: LinhaCarrinho[]) =>
  linhas.reduce((soma, l) => soma + l.preco_centavos * l.quantidade, 0);

export function montarCarrinho(usuarioId: number) {
  const linhas = linhasCarrinho(usuarioId);
  return {
    itens: linhas.map((l) => ({
      produto: produtoDTO(l),
      quantidade: l.quantidade,
      subtotal: reais(l.preco_centavos * l.quantidade),
    })),
    quantidadeTotal: linhas.reduce((soma, l) => soma + l.quantidade, 0),
    total: reais(totalCentavos(linhas)),
  };
}

/** Carrega os itens de vários pedidos com uma única consulta. */
export function montarPedidos(pedidos: PedidoRow[]) {
  if (!pedidos.length) return [];
  const ids = pedidos.map((p) => p.id);
  const itens = db
    .prepare(`SELECT * FROM pedido_itens WHERE pedido_id IN (${ids.map(() => "?").join(",")}) ORDER BY id`)
    .all(...ids) as PedidoItemRow[];
  const porPedido = new Map<number, PedidoItemRow[]>();
  for (const item of itens) {
    const lista = porPedido.get(item.pedido_id) ?? [];
    lista.push(item);
    porPedido.set(item.pedido_id, lista);
  }
  return pedidos.map((p) => pedidoDTO(p, porPedido.get(p.id) ?? []));
}
