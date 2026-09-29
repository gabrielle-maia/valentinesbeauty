# Valentines Beauty — API

Back-end do app Valentines Beauty (Expo). API REST em **Node + TypeScript + Express**, com banco **SQLite** em arquivo (zero configuração) e autenticação por **JWT**.

## Rodar

Requer Node 20 ou superior.

```bash
npm install
cp .env.example .env      # no Windows (cmd): copy .env.example .env
npm run dev               # http://localhost:3333/api/saude
npm test                  # teste de integração do fluxo completo
```

Na primeira execução o banco é criado em `./data/valentines.db`, com o Super Admin
(`admin@valenbeauty.com` / `123456`, configurável no `.env`) e os 6 produtos do catálogo.

Produção: `npm run build && npm start`. Defina `JWT_SECRET` e `ADMIN_PASSWORD` próprios (o servidor recusa subir em produção com os valores de exemplo).

## Como o app se conecta

- **URL base:** `http://<IP-do-seu-computador>:3333/api` em celular físico (mesma rede Wi‑Fi); `http://10.0.2.2:3333/api` no emulador Android; `http://localhost:3333/api` no iOS Simulator e na web.
- **Autenticação:** `login`/`cadastro` devolvem `{ token, usuario }`. Envie `Authorization: Bearer <token>` nas rotas protegidas.
- **Erros:** sempre `{ "erro": "mensagem legível", "detalhes"?: [{ "campo", "mensagem" }] }`, com as mesmas mensagens usadas nos `Alert`s do front.
- **Dinheiro:** `preco`/`total` são números em reais (`29.9`); no banco ficam em centavos.
- **Visitante (sem login):** favoritos e carrinho exigem conta. O app pode manter o estado local do visitante e, ao logar, enviar com `PUT /favoritos/:id` e `POST /carrinho/itens`.
- **Foto de perfil** (`expo-image-picker`):
  ```ts
  const form = new FormData();
  form.append("foto", { uri, name: "foto.jpg", type: "image/jpeg" } as any);
  await fetch(`${API}/me/foto`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: form });
  ```
  O campo `foto` do usuário é um caminho relativo (`/uploads/xxx.jpg`): prefixe com o host (sem `/api`).

## Endpoints

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| POST | `/auth/cadastro` | público | Cria conta de cliente `{ nome, email, senha }` |
| POST | `/auth/cadastro-dono` | público | Cria conta de dono `{ nome, loja, email, senha }` |
| POST | `/auth/login` | público | `{ email, senha }` → `{ token, usuario }` |
| GET | `/produtos` | público | Catálogo (`?categoria=`, `?busca=`) |
| GET | `/produtos/categorias` | público | Lista de categorias |
| GET | `/produtos/:id` | público | Detalhe do produto |
| POST · PUT · DELETE | `/produtos` · `/produtos/:id` | super admin | Criar, editar, excluir produto |
| GET · PATCH | `/me` | logado | Ver / editar `{ nome, email, loja }` |
| PUT | `/me/senha` | logado | `{ senhaAtual, novaSenha }` |
| PATCH | `/me/preferencias` | logado | `{ notificacoes, pagamentoPreferido }` |
| PUT · DELETE | `/me/foto` | logado | Enviar (multipart, campo `foto`) / remover foto |
| GET | `/favoritos` | logado | Produtos favoritos |
| PUT · DELETE | `/favoritos/:produtoId` | logado | Favoritar / desfavoritar (idempotente) |
| GET · DELETE | `/carrinho` | logado | Ver (`itens`, `quantidadeTotal`, `total`) / esvaziar |
| POST | `/carrinho/itens` | logado | `{ produtoId, quantidade? }` — soma se já existir |
| PATCH · DELETE | `/carrinho/itens/:produtoId` | logado | Alterar quantidade / remover item |
| GET · POST | `/enderecos` | logado | Listar / criar |
| PUT · DELETE | `/enderecos/:id` | logado | Editar / excluir |
| POST | `/pedidos` | logado | `{ enderecoId, pagamento, cartao? }` — fecha o carrinho |
| GET | `/pedidos` · `/pedidos/:id` | logado | Meus pedidos |
| GET | `/admin/resumo` | super admin | Contagens dos cartões do painel |
| GET | `/admin/usuarios` | super admin | Usuários (`?tipo=dono` = lojas) |
| POST | `/admin/usuarios` | super admin | Cadastrar usuário ou loja |
| PATCH | `/admin/usuarios/:id` | super admin | Editar `{ nome, email, loja }` |
| PATCH | `/admin/usuarios/:id/bloqueio` | super admin | `{ bloqueado: true \| false }` |
| GET | `/admin/pedidos` | super admin | Todos os pedidos (`?status=`), com dados do cliente |
| PATCH | `/admin/pedidos/:id/status` | super admin | `Recebido` · `Em preparação` · `Enviado` · `Entregue` · `Cancelado` |
| GET | `/saude` | público | Health check |

## Decisões

- **Pedido é um retrato.** Guarda cópia do endereço e dos itens (nome, preço, imagem). Editar preço ou excluir produto/endereço depois não altera o histórico, como o front já promete ("pedidos anteriores serão mantidos").
- **Conta desativada perde acesso na hora**, mesmo com token válido (o usuário é lido do banco a cada requisição).
- **Pagamento é demonstração**, como no front. Os dados do cartão são validados no formato e descartados: nada é gravado nem cobrado. Para cobrança real, integre um gateway (Mercado Pago, Stripe, Pagar.me…) que tokenize o cartão no app, e nunca trafegue o número pelo seu servidor.
- **Carrinho com quantidade.** O front hoje repete a linha a cada "Adicionar"; a API soma em `quantidade` (máx. 99).
- **Senhas** com bcrypt; mínimo de 6 caracteres. Login/cadastro têm limite de tentativas.

## Estrutura

```
src/
  server.ts · app.ts · config.ts     inicialização e variáveis de ambiente
  db.ts                              schema SQLite + dados iniciais
  schemas.ts                         validação de entrada (zod)
  consultas.ts · serializers.ts      consultas reutilizadas e formato das respostas
  middleware/                        autenticação e tratamento de erros
  routes/                            um arquivo por recurso
tests/api.test.ts                    fluxo completo: cadastro → carrinho → pedido → admin
```

O schema usa `CREATE TABLE IF NOT EXISTS` e `PRAGMA user_version`. Quando precisar alterar tabelas em um banco já em uso, adicione migrações (ex.: incrementar `user_version` e aplicar `ALTER TABLE`).
