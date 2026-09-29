import bcrypt from "bcryptjs";
import { Router } from "express";
import multer from "multer";
import { atualizarPerfil, buscarUsuario } from "../consultas";
import { db } from "../db";
import { HttpError } from "../errors";
import { alterarSenha, perfil, preferencias } from "../schemas";
import { usuarioDTO } from "../serializers";
import { removerImagem, salvarImagem } from "../uploads";

export const meRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

meRouter.get("/", (req, res) => {
  res.json(usuarioDTO(req.usuario!));
});

meRouter.patch("/", (req, res) => {
  const dados = perfil.parse(req.body);
  res.json(usuarioDTO(atualizarPerfil(req.usuario!, dados)));
});

meRouter.put("/senha", async (req, res) => {
  const { senhaAtual, novaSenha } = alterarSenha.parse(req.body);
  const usuario = req.usuario!;
  if (!(await bcrypt.compare(senhaAtual, usuario.senha_hash))) {
    throw new HttpError(400, "A senha atual está incorreta.");
  }
  const hash = await bcrypt.hash(novaSenha, 10);
  db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(hash, usuario.id);
  res.status(204).end();
});

meRouter.patch("/preferencias", (req, res) => {
  const p = preferencias.parse(req.body);
  const id = req.usuario!.id;
  if (p.notificacoes !== undefined) {
    db.prepare("UPDATE usuarios SET notificacoes = ? WHERE id = ?").run(p.notificacoes ? 1 : 0, id);
  }
  if (p.pagamentoPreferido !== undefined) {
    db.prepare("UPDATE usuarios SET pagamento_preferido = ? WHERE id = ?").run(p.pagamentoPreferido, id);
  }
  res.json(usuarioDTO(buscarUsuario(id)!));
});

// multipart/form-data com o arquivo no campo "foto" (JPG, PNG ou WEBP, até 5 MB)
meRouter.put("/foto", upload.single("foto"), (req, res) => {
  if (!req.file) throw new HttpError(400, 'Envie uma imagem no campo "foto".');
  const caminho = salvarImagem(req.file.buffer);
  if (!caminho) throw new HttpError(400, "Formato inválido. Use JPG, PNG ou WEBP.");
  const usuario = req.usuario!;
  db.prepare("UPDATE usuarios SET foto = ? WHERE id = ?").run(caminho, usuario.id);
  removerImagem(usuario.foto);
  res.json(usuarioDTO(buscarUsuario(usuario.id)!));
});

meRouter.delete("/foto", (req, res) => {
  const usuario = req.usuario!;
  db.prepare("UPDATE usuarios SET foto = NULL WHERE id = ?").run(usuario.id);
  removerImagem(usuario.foto);
  res.status(204).end();
});
