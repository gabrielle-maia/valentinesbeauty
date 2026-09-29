import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

if (config.DATABASE_PATH !== ":memory:") {
  fs.mkdirSync(path.dirname(path.resolve(config.DATABASE_PATH)), { recursive: true });
}

export const db = new Database(config.DATABASE_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Valores monetários ficam em centavos (INTEGER) para evitar erros de arredondamento.
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cliente','dono','superadmin')),
  loja TEXT,
  foto TEXT,
  notificacoes INTEGER NOT NULL DEFAULT 0,
  pagamento_preferido TEXT CHECK (pagamento_preferido IN ('pix','cartao','boleto')),
  bloqueado INTEGER NOT NULL DEFAULT 0,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS produtos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL CHECK (preco_centavos > 0),
  imagem TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS favoritos (
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, produto_id)
);

CREATE TABLE IF NOT EXISTS carrinho_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL CHECK (quantidade BETWEEN 1 AND 99),
  UNIQUE (usuario_id, produto_id)
);

CREATE TABLE IF NOT EXISTS enderecos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rua TEXT NOT NULL,
  numero TEXT NOT NULL,
  complemento TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  uf TEXT NOT NULL,
  cep TEXT NOT NULL
);

-- O pedido guarda uma cópia do endereço e dos itens: editar ou excluir
-- produtos/endereços depois nunca altera o histórico de compras.
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  status TEXT NOT NULL DEFAULT 'Recebido'
    CHECK (status IN ('Recebido','Em preparação','Enviado','Entregue','Cancelado')),
  pagamento TEXT NOT NULL CHECK (pagamento IN ('pix','cartao','boleto')),
  total_centavos INTEGER NOT NULL,
  end_rua TEXT NOT NULL,
  end_numero TEXT NOT NULL,
  end_complemento TEXT NOT NULL,
  end_bairro TEXT NOT NULL,
  end_cidade TEXT NOT NULL,
  end_uf TEXT NOT NULL,
  end_cep TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id INTEGER REFERENCES produtos(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  imagem TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0)
);

CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
`);

const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=85&auto=format&fit=crop`;

const PRODUTOS_INICIAIS = [
  ["Batom Rosé", "Lábios", 2990, img("photo-1586495777744-4413f21062fa")],
  ["Paleta Soft Glam", "Olhos", 5990, img("photo-1512496015851-a90fb38ba796")],
  ["Blush Rosado", "Face", 3990, img("photo-1612817288484-6f916006741a")],
  ["Gloss Crystal", "Lábios", 2490, img("photo-1631214524020-7e18db761f78")],
  ["Kit Essentials", "Face", 7490, img("photo-1596462502278-27bfdc403348")],
  ["Pincéis Pro", "Acessórios", 4990, img("photo-1522335789203-aabd1fc54bc9")],
] as const;

// Roda só na primeira execução (banco novo): cria o Super Admin e o catálogo inicial.
const seed = db.transaction(() => {
  db.prepare("INSERT INTO usuarios (nome, email, senha_hash, tipo) VALUES (?, ?, ?, 'superadmin')").run(
    config.ADMIN_NAME,
    config.ADMIN_EMAIL.toLowerCase(),
    bcrypt.hashSync(config.ADMIN_PASSWORD, 10),
  );
  const inserir = db.prepare("INSERT INTO produtos (nome, categoria, preco_centavos, imagem) VALUES (?, ?, ?, ?)");
  for (const p of PRODUTOS_INICIAIS) inserir.run(...p);
});

if ((db.pragma("user_version", { simple: true }) as number) === 0) {
  seed();
  db.pragma("user_version = 1");
}
