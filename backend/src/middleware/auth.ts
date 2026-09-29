import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { config } from "../config";
import { buscarUsuario } from "../consultas";
import { HttpError } from "../errors";
import type { Tipo, UsuarioRow } from "../types";

export const gerarToken = (u: UsuarioRow) =>
  jwt.sign({ sub: String(u.id) }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_SECONDS });

const SESSAO_INVALIDA = "Sessão inválida ou expirada. Entre novamente.";

/** Exige `Authorization: Bearer <token>`. O usuário é lido do banco a cada requisição,
 *  então desativar uma conta tem efeito imediato. */
export const autenticar: RequestHandler = (req, _res, next) => {
  const [esquema, token] = (req.headers.authorization ?? "").split(" ");
  if (esquema !== "Bearer" || !token) throw new HttpError(401, "Faça login para continuar.");

  let id: number;
  try {
    const payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    id = Number(payload.sub);
  } catch {
    throw new HttpError(401, SESSAO_INVALIDA);
  }

  const usuario = buscarUsuario(id);
  if (!usuario) throw new HttpError(401, SESSAO_INVALIDA);
  if (usuario.bloqueado) {
    throw new HttpError(403, "Esta conta está desativada. Entre em contato com o administrador.");
  }
  req.usuario = usuario;
  next();
};

export const exigirTipo =
  (...tipos: Tipo[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.usuario || !tipos.includes(req.usuario.tipo)) {
      throw new HttpError(403, "Você não tem permissão para esta ação.");
    }
    next();
  };
