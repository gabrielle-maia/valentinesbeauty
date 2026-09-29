import assert from "node:assert/strict";
import fs from "node:fs";
import type { Server } from "node:http";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

// O ambiente precisa estar definido ANTES de carregar o app (por isso o import dinâmico).
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "segredo-de-teste-com-mais-de-16-caracteres";
process.env.DATABASE_PATH = ":memory:";
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "vb-uploads-"));
process.env.ADMIN_EMAIL = "admin@valenbeauty.com";
process.env.ADMIN_PASSWORD = "123456";

let server: Server;
let base: string;

async function chamar(metodo: string, rota: string, corpo?: unknown, token?: string) {
  const res = await fetch(`${base}${rota}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });
  const texto = await res.text();
  return { status: res.status, corpo: texto ? JSON.parse(texto) : null };
}

before(async () => {
  const { criarApp } = await import("../src/app");
  server = criarApp().listen(0);
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(process.env.UPLOADS_DIR!, { recursive: true, force: true });
});

let tokenAdmin = "";
let tokenCliente = "";
let clienteId = 0;
let enderecoId = 0;
let pedidoId = 0;

test("saúde e catálogo público", async () => {
  assert.equal((await chamar("GET", "/saude")).status, 200);
  const produtos = await chamar("GET", "/produtos");
  assert.equal(produtos.corpo.length, 6);
  assert.equal(produtos.corpo[0].nome, "Batom Rosé");
  assert.equal(produtos.corpo[0].preco, 29.9);
  assert.equal((await chamar("GET", "/produtos?categoria=lábios")).corpo.length, 2);
  assert.equal((await chamar("GET", "/produtos/categorias")).corpo.length, 4);
  assert.equal((await chamar("GET", "/produtos/999")).status, 404);
});

test("login do Super Admin e proteção de rotas", async () => {
  const errado = await chamar("POST", "/auth/login", { email: "admin@valenbeauty.com", senha: "errada" });
  assert.equal(errado.status, 401);
  const ok = await chamar("POST", "/auth/login", { email: "ADMIN@valenbeauty.com", senha: "123456" });
  assert.equal(ok.status, 200);
  assert.equal(ok.corpo.usuario.tipo, "superadmin");
  assert.equal(ok.corpo.usuario.senha_hash, undefined);
  tokenAdmin = ok.corpo.token;
  assert.equal((await chamar("GET", "/me")).status, 401);
});

test("cadastro de cliente", async () => {
  const dados = { nome: "Maria Silva", email: "Maria@Email.com", senha: "segredo1" };
  const novo = await chamar("POST", "/auth/cadastro", dados);
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.usuario.email, "maria@email.com");
  tokenCliente = novo.corpo.token;
  clienteId = novo.corpo.usuario.id;
  assert.equal((await chamar("POST", "/auth/cadastro", dados)).status, 409);
  assert.equal((await chamar("POST", "/auth/cadastro", { ...dados, email: "x@y.com", senha: "123" })).status, 400);
  const dono = await chamar("POST", "/auth/cadastro-dono", { nome: "Ana", loja: "Loja da Ana", email: "ana@loja.com", senha: "segredo1" });
  assert.equal(dono.corpo.usuario.loja, "Loja da Ana");
});

test("perfil, senha e preferências", async () => {
  const p = await chamar("PATCH", "/me", { nome: "Maria S. Silva" }, tokenCliente);
  assert.equal(p.corpo.nome, "Maria S. Silva");
  assert.equal((await chamar("PATCH", "/me", { email: "admin@valenbeauty.com" }, tokenCliente)).status, 409);
  assert.equal((await chamar("PUT", "/me/senha", { senhaAtual: "x", novaSenha: "novasenha" }, tokenCliente)).status, 400);
  assert.equal((await chamar("PUT", "/me/senha", { senhaAtual: "segredo1", novaSenha: "novasenha" }, tokenCliente)).status, 204);
  assert.equal((await chamar("POST", "/auth/login", { email: "maria@email.com", senha: "novasenha" })).status, 200);
  const pref = await chamar("PATCH", "/me/preferencias", { notificacoes: true, pagamentoPreferido: "pix" }, tokenCliente);
  assert.equal(pref.corpo.notificacoes, true);
  assert.equal(pref.corpo.pagamentoPreferido, "pix");
});

test("foto de perfil", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const enviar = (bytes: Buffer) => {
    const form = new FormData();
    form.append("foto", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "foto.png");
    return fetch(`${base}/me/foto`, { method: "PUT", headers: { Authorization: `Bearer ${tokenCliente}` }, body: form });
  };
  assert.equal((await enviar(Buffer.from("isto não é uma imagem"))).status, 400);
  const res = await enviar(png);
  assert.equal(res.status, 200);
  const { foto } = (await res.json()) as { foto: string };
  assert.match(foto, /^\/uploads\/.+\.png$/);
  assert.equal((await fetch(`${base.replace("/api", "")}${foto}`)).status, 200);
  assert.equal((await chamar("DELETE", "/me/foto", undefined, tokenCliente)).status, 204);
});

test("endereços", async () => {
  const valido = { rua: "Rua das Flores", numero: "10", bairro: "Centro", cidade: "Brasília", uf: "df", cep: "70000000" };
  assert.equal((await chamar("POST", "/enderecos", { ...valido, cep: "123" }, tokenCliente)).status, 400);
  assert.equal((await chamar("POST", "/enderecos", { ...valido, uf: "XX" }, tokenCliente)).status, 400);
  const criado = await chamar("POST", "/enderecos", valido, tokenCliente);
  assert.equal(criado.status, 201);
  assert.equal(criado.corpo.uf, "DF");
  enderecoId = criado.corpo.id;
  const editado = await chamar("PUT", `/enderecos/${enderecoId}`, { ...valido, complemento: "Apto 2" }, tokenCliente);
  assert.equal(editado.corpo.complemento, "Apto 2");
  // endereço de outra pessoa não é visível
  assert.equal((await chamar("GET", "/enderecos", undefined, tokenAdmin)).corpo.length, 0);
  assert.equal((await chamar("DELETE", `/enderecos/${enderecoId}`, undefined, tokenAdmin)).status, 404);
});

test("favoritos", async () => {
  assert.equal((await chamar("PUT", "/favoritos/1", undefined, tokenCliente)).status, 204);
  assert.equal((await chamar("PUT", "/favoritos/1", undefined, tokenCliente)).status, 204);
  assert.equal((await chamar("PUT", "/favoritos/999", undefined, tokenCliente)).status, 404);
  assert.equal((await chamar("GET", "/favoritos", undefined, tokenCliente)).corpo.length, 1);
  assert.equal((await chamar("DELETE", "/favoritos/1", undefined, tokenCliente)).status, 204);
  assert.equal((await chamar("GET", "/favoritos", undefined, tokenCliente)).corpo.length, 0);
});

test("carrinho", async () => {
  await chamar("POST", "/carrinho/itens", { produtoId: 1, quantidade: 1 }, tokenCliente);
  await chamar("POST", "/carrinho/itens", { produtoId: 1 }, tokenCliente); // soma: 2
  const c = await chamar("POST", "/carrinho/itens", { produtoId: 2 }, tokenCliente);
  assert.equal(c.corpo.itens.length, 2);
  assert.equal(c.corpo.itens[0].quantidade, 2);
  assert.equal(c.corpo.quantidadeTotal, 3);
  assert.equal(c.corpo.total, 119.7);
  assert.equal((await chamar("POST", "/carrinho/itens", { produtoId: 999 }, tokenCliente)).status, 404);
  assert.equal((await chamar("PATCH", "/carrinho/itens/2", { quantidade: 0 }, tokenCliente)).status, 400);
  const sem = await chamar("DELETE", "/carrinho/itens/2", undefined, tokenCliente);
  assert.equal(sem.corpo.itens.length, 1);
  const volta = await chamar("POST", "/carrinho/itens", { produtoId: 2 }, tokenCliente);
  assert.equal(volta.corpo.total, 119.7);
});

test("pedido: validações e criação", async () => {
  assert.equal((await chamar("POST", "/pedidos", { pagamento: "pix" }, tokenCliente)).status, 400);
  assert.equal((await chamar("POST", "/pedidos", { enderecoId: 9999, pagamento: "pix" }, tokenCliente)).status, 400);
  assert.equal((await chamar("POST", "/pedidos", { enderecoId, pagamento: "cartao" }, tokenCliente)).status, 400);
  // falhou tudo acima: carrinho continua intacto
  assert.equal((await chamar("GET", "/carrinho", undefined, tokenCliente)).corpo.itens.length, 2);

  const cartao = { numero: "4111 1111 1111 1111", validade: "12/30", cvv: "123" };
  const res = await chamar("POST", "/pedidos", { enderecoId, pagamento: "cartao", cartao }, tokenCliente);
  assert.equal(res.status, 201);
  assert.equal(res.corpo.status, "Recebido");
  assert.equal(res.corpo.total, 119.7);
  assert.equal(res.corpo.itens.length, 2);
  assert.equal(res.corpo.endereco.cidade, "Brasília");
  assert.equal(JSON.stringify(res.corpo).includes("4111"), false); // cartão nunca é devolvido/gravado
  pedidoId = res.corpo.id;

  assert.equal((await chamar("GET", "/carrinho", undefined, tokenCliente)).corpo.itens.length, 0);
  assert.equal((await chamar("POST", "/pedidos", { enderecoId, pagamento: "pix" }, tokenCliente)).status, 400); // carrinho vazio
  assert.equal((await chamar("GET", "/pedidos", undefined, tokenCliente)).corpo.length, 1);
  assert.equal((await chamar("GET", `/pedidos/${pedidoId}`, undefined, tokenAdmin)).status, 404); // pedido é privado
});

test("painel admin: resumo, pedidos e status", async () => {
  assert.equal((await chamar("GET", "/admin/resumo", undefined, tokenCliente)).status, 403);
  const resumo = await chamar("GET", "/admin/resumo", undefined, tokenAdmin);
  assert.deepEqual(resumo.corpo, { usuarios: 3, lojas: 1, produtos: 6, pedidos: 1 });

  const pedidos = await chamar("GET", "/admin/pedidos", undefined, tokenAdmin);
  assert.equal(pedidos.corpo[0].cliente.email, "maria@email.com");
  assert.equal((await chamar("GET", "/admin/pedidos?status=Enviado", undefined, tokenAdmin)).corpo.length, 0);

  assert.equal((await chamar("PATCH", `/admin/pedidos/${pedidoId}/status`, { status: "Inventado" }, tokenAdmin)).status, 400);
  const novo = await chamar("PATCH", `/admin/pedidos/${pedidoId}/status`, { status: "Em preparação" }, tokenAdmin);
  assert.equal(novo.corpo.status, "Em preparação");
  assert.equal((await chamar("GET", "/admin/pedidos?status=Em%20prepara%C3%A7%C3%A3o", undefined, tokenAdmin)).corpo.length, 1);
  assert.equal((await chamar("GET", `/pedidos/${pedidoId}`, undefined, tokenCliente)).corpo.status, "Em preparação");
});

test("painel admin: produtos (editar e excluir mantém histórico)", async () => {
  const novo = await chamar("POST", "/produtos", { nome: "Máscara", categoria: "Olhos", preco: "34,90", imagem: "https://exemplo.com/a.jpg" }, tokenAdmin);
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.preco, 34.9);
  assert.equal((await chamar("POST", "/produtos", { nome: "X", categoria: "Y", preco: -1, imagem: "https://a.com/i.jpg" }, tokenAdmin)).status, 400);
  assert.equal((await chamar("POST", "/produtos", { nome: "X", categoria: "Y", preco: 10, imagem: "ftp://a" }, tokenAdmin)).status, 400);
  assert.equal((await chamar("POST", "/produtos", { nome: "X", categoria: "Y", preco: 10, imagem: "https://a.com/i.jpg" }, tokenCliente)).status, 403);

  const editado = await chamar("PUT", "/produtos/1", { nome: "Batom Rosé", categoria: "Lábios", preco: 39.9, imagem: "https://exemplo.com/b.jpg" }, tokenAdmin);
  assert.equal(editado.corpo.preco, 39.9);

  assert.equal((await chamar("DELETE", "/produtos/1", undefined, tokenAdmin)).status, 204);
  const meus = await chamar("GET", "/pedidos", undefined, tokenCliente);
  const item = meus.corpo[0].itens.find((i: { nome: string }) => i.nome === "Batom Rosé");
  assert.equal(item.produtoId, null); // produto excluído...
  assert.equal(item.preco, 29.9); // ...mas o pedido guarda o preço da época
  assert.equal(meus.corpo[0].total, 119.7);
});

test("painel admin: usuários e bloqueio", async () => {
  const lojas = await chamar("GET", "/admin/usuarios?tipo=dono", undefined, tokenAdmin);
  assert.equal(lojas.corpo.length, 1);
  assert.equal((await chamar("POST", "/admin/usuarios", { nome: "Lojista", email: "l@l.com", senha: "segredo1", tipo: "dono" }, tokenAdmin)).status, 400); // falta loja
  const criado = await chamar("POST", "/admin/usuarios", { nome: "Lojista", email: "l@l.com", senha: "segredo1", tipo: "dono", loja: "Minha Loja" }, tokenAdmin);
  assert.equal(criado.status, 201);
  assert.equal((await chamar("PATCH", `/admin/usuarios/${criado.corpo.id}`, { loja: "Loja Nova" }, tokenAdmin)).corpo.loja, "Loja Nova");

  const adminId = (await chamar("GET", "/me", undefined, tokenAdmin)).corpo.id;
  assert.equal((await chamar("PATCH", `/admin/usuarios/${adminId}/bloqueio`, { bloqueado: true }, tokenAdmin)).status, 403);

  const bloqueado = await chamar("PATCH", `/admin/usuarios/${clienteId}/bloqueio`, { bloqueado: true }, tokenAdmin);
  assert.equal(bloqueado.corpo.bloqueado, true);
  assert.equal((await chamar("POST", "/auth/login", { email: "maria@email.com", senha: "novasenha" })).status, 403);
  assert.equal((await chamar("GET", "/me", undefined, tokenCliente)).status, 403); // token antigo também perde acesso
  await chamar("PATCH", `/admin/usuarios/${clienteId}/bloqueio`, { bloqueado: false }, tokenAdmin);
  assert.equal((await chamar("GET", "/me", undefined, tokenCliente)).status, 200);
});
