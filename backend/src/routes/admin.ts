import { Router } from "express";
import { atualizarPerfil, buscarUsuario, criarUsuario, montarPedidos } from "../consultas";
import { db } from "../db";
import { HttpError, idParam, naoEncontrado } from "../errors";
import { adminUsuarioNovo, bloqueio, filtroPedidos, filtroUsuarios, perfil, statusPedido } from "../schemas";
import { usuarioDTO } from "../serializers";
import type { PedidoRow, UsuarioRow } from "../types";

// Todas as rotas exigem Super Admin (aplicado em app.ts).
export const adminRouter = Router();

const contar = (sql: string) => (db.prepare(sql).get() as { n: number }).n;

// Números dos cartões do painel
adminRouter.get("/resumo", (_req, res) => {
  res.json({
    usuarios: contar("SELECT COUNT(*) AS n FROM usuarios"),
    lojas: contar("SELECT COUNT(*) AS n FROM usuarios WHERE tipo = 'dono'"),
    produtos: contar("SELECT COUNT(*) AS n FROM produtos"),
    pedidos: contar("SELECT COUNT(*) AS n FROM pedidos"),
  });
});

// "Gerenciar usuários" = sem filtro · "Gerenciar lojas" = ?tipo=dono
adminRouter.get("/usuarios", (req, res) => {
  const { tipo } = filtroUsuarios.parse(req.query);
  const linhas = (
    tipo
      ? db.prepare("SELECT * FROM usuarios WHERE tipo = ? ORDER BY id").all(tipo)
      : db.prepare("SELECT * FROM usuarios ORDER BY id").all()
  ) as UsuarioRow[];
  res.json(linhas.map(usuarioDTO));
});

adminRouter.post("/usuarios", async (req, res) => {
  const dados = adminUsuarioNovo.parse(req.body);
  res.status(201).json(usuarioDTO(await criarUsuario(dados)));
});

function alvoEditavel(idTexto: string) {
  const alvo = buscarUsuario(idParam(idTexto));
  if (!alvo) throw naoEncontrado("Usuário");
  if (alvo.tipo === "superadmin") throw new HttpError(403, "Edite sua conta pelo Perfil.");
  return alvo;
}

adminRouter.patch("/usuarios/:id", (req, res) => {
  const alvo = alvoEditavel(req.params.id);
  res.json(usuarioDTO(atualizarPerfil(alvo, perfil.parse(req.body))));
});

// Ativar / desativar conta. Conta desativada perde o acesso na hora.
adminRouter.patch("/usuarios/:id/bloqueio", (req, res) => {
  const alvo = alvoEditavel(req.params.id);
  const { bloqueado } = bloqueio.parse(req.body);
  db.prepare("UPDATE usuarios SET bloqueado = ? WHERE id = ?").run(bloqueado ? 1 : 0, alvo.id);
  res.json(usuarioDTO(buscarUsuario(alvo.id)!));
});

const SQL_PEDIDOS_ADMIN = `SELECT p.*, u.nome AS cliente_nome, u.email AS cliente_email
                             FROM pedidos p JOIN usuarios u ON u.id = p.usuario_id`;

adminRouter.get("/pedidos", (req, res) => {
  const { status } = filtroPedidos.parse(req.query);
  const linhas = (
    status
      ? db.prepare(`${SQL_PEDIDOS_ADMIN} WHERE p.status = ? ORDER BY p.id DESC`).all(status)
      : db.prepare(`${SQL_PEDIDOS_ADMIN} ORDER BY p.id DESC`).all()
  ) as PedidoRow[];
  res.json(montarPedidos(linhas));
});

adminRouter.patch("/pedidos/:id/status", (req, res) => {
  const id = idParam(req.params.id);
  const { status } = statusPedido.parse(req.body);
  const info = db.prepare("UPDATE pedidos SET status = ? WHERE id = ?").run(status, id);
  if (!info.changes) throw naoEncontrado("Pedido");
  const p = db.prepare(`${SQL_PEDIDOS_ADMIN} WHERE p.id = ?`).get(id) as PedidoRow;
  res.json(montarPedidos([p])[0]);
});
