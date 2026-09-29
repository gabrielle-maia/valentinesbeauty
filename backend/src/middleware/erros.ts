import type { ErrorRequestHandler, RequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { HttpError } from "../errors";

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
};

// Formato único de erro: { erro: "mensagem legível", detalhes?: [{ campo, mensagem }] }
export const tratarErros: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      erro: err.issues[0]?.message ?? "Dados inválidos.",
      detalhes: err.issues.map((i) => ({ campo: i.path.join("."), mensagem: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ erro: err.message });
    return;
  }
  if (err instanceof multer.MulterError) {
    const grande = err.code === "LIMIT_FILE_SIZE";
    res.status(grande ? 413 : 400).json({ erro: grande ? "A imagem deve ter no máximo 5 MB." : "Envio de arquivo inválido." });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ erro: "JSON inválido." });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ erro: "Requisição muito grande." });
    return;
  }
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
};
