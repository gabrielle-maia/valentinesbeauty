import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export const UPLOADS_DIR = path.resolve(config.UPLOADS_DIR);
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Identifica o formato pelos primeiros bytes (não confia no tipo informado pelo cliente).
function extensaoDaImagem(b: Buffer): string | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ".jpg";
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return ".webp";
  return null;
}

/** Salva a imagem e devolve o caminho público (ex.: /uploads/uuid.jpg), ou null se não for JPG/PNG/WEBP. */
export function salvarImagem(buffer: Buffer): string | null {
  const ext = extensaoDaImagem(buffer);
  if (!ext) return null;
  const nome = `${randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, nome), buffer);
  return `/uploads/${nome}`;
}

export function removerImagem(caminho: string | null) {
  if (!caminho?.startsWith("/uploads/")) return;
  fs.rmSync(path.join(UPLOADS_DIR, path.basename(caminho)), { force: true });
}
