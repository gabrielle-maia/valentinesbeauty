import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config";
import { criarUsuario } from "../consultas";
import { db } from "../db";
import { HttpError } from "../errors";
import { gerarToken } from "../middleware/auth";
import { cadastroCliente, cadastroDono, login } from "../schemas";
import { usuarioDTO } from "../serializers";
import type { UsuarioRow } from "../types";

export const authRouter = Router();

// Freia tentativas em massa de login/cadastro (desligado nos testes).
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.NODE_ENV === "test",
    message: { erro: "Muitas tentativas. Tente novamente em alguns minutos." },
  }),
);

authRouter.post("/cadastro", async (req, res) => {
  const dados = cadastroCliente.parse(req.body);
  const usuario = await criarUsuario({ ...dados, tipo: "cliente" });
  res.status(201).json({ token: gerarToken(usuario), usuario: usuarioDTO(usuario) });
});

authRouter.post("/cadastro-dono", async (req, res) => {
  const dados = cadastroDono.parse(req.body);
  const usuario = await criarUsuario({ ...dados, tipo: "dono" });
  res.status(201).json({ token: gerarToken(usuario), usuario: usuarioDTO(usuario) });
});

authRouter.post("/login", async (req, res) => {
  const { email, senha } = login.parse(req.body);
  const usuario = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email) as UsuarioRow | undefined;
  const senhaCorreta = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;
  if (!usuario || !senhaCorreta) throw new HttpError(401, "E-mail ou senha incorretos.");
  if (usuario.bloqueado) {
    throw new HttpError(403, "Esta conta está desativada. Entre em contato com o administrador.");
  }
  res.json({ token: gerarToken(usuario), usuario: usuarioDTO(usuario) });
});
