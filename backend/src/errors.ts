export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const naoEncontrado = (o: string) => new HttpError(404, `${o} não encontrado.`);

export function idParam(valor: string): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "Identificador inválido.");
  return n;
}
