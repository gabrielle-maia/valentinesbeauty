import { Router } from "express";
import { db } from "../db";
import { idParam, naoEncontrado } from "../errors";
import { endereco } from "../schemas";
import { enderecoDTO } from "../serializers";
import type { EnderecoRow } from "../types";

export const enderecosRouter = Router();

const buscar = (id: number, usuarioId: number) =>
  db.prepare("SELECT * FROM enderecos WHERE id = ? AND usuario_id = ?").get(id, usuarioId) as EnderecoRow | undefined;

enderecosRouter.get("/", (req, res) => {
  const linhas = db.prepare("SELECT * FROM enderecos WHERE usuario_id = ? ORDER BY id").all(req.usuario!.id) as EnderecoRow[];
  res.json(linhas.map(enderecoDTO));
});

enderecosRouter.post("/", (req, res) => {
  const e = endereco.parse(req.body);
  const info = db
    .prepare(
      "INSERT INTO enderecos (usuario_id, rua, numero, complemento, bairro, cidade, uf, cep) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(req.usuario!.id, e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep);
  res.status(201).json(enderecoDTO(buscar(Number(info.lastInsertRowid), req.usuario!.id)!));
});

enderecosRouter.put("/:id", (req, res) => {
  const id = idParam(req.params.id);
  const e = endereco.parse(req.body);
  const info = db
    .prepare(
      `UPDATE enderecos SET rua = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, uf = ?, cep = ?
        WHERE id = ? AND usuario_id = ?`,
    )
    .run(e.rua, e.numero, e.complemento, e.bairro, e.cidade, e.uf, e.cep, id, req.usuario!.id);
  if (!info.changes) throw naoEncontrado("Endereço");
  res.json(enderecoDTO(buscar(id, req.usuario!.id)!));
});

enderecosRouter.delete("/:id", (req, res) => {
  const info = db.prepare("DELETE FROM enderecos WHERE id = ? AND usuario_id = ?").run(idParam(req.params.id), req.usuario!.id);
  if (!info.changes) throw naoEncontrado("Endereço");
  res.status(204).end();
});
