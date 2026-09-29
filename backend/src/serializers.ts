import type { EnderecoRow, PedidoItemRow, PedidoRow, ProdutoRow, UsuarioRow } from "./types";

export const reais = (centavos: number) => centavos / 100;
export const centavos = (valor: number) => Math.round(valor * 100);

export const produtoDTO = (p: ProdutoRow) => ({
  id: p.id,
  nome: p.nome,
  categoria: p.categoria,
  preco: reais(p.preco_centavos),
  imagem: p.imagem,
});

// Nunca expõe senha_hash. `foto` é um caminho relativo (ex.: /uploads/abc.jpg).
export const usuarioDTO = (u: UsuarioRow) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo,
  loja: u.tipo === "dono" ? u.loja : undefined,
  foto: u.foto,
  notificacoes: !!u.notificacoes,
  pagamentoPreferido: u.pagamento_preferido,
  bloqueado: !!u.bloqueado,
  criadoEm: u.criado_em,
});

export const enderecoDTO = (e: EnderecoRow) => ({
  id: e.id,
  rua: e.rua,
  numero: e.numero,
  complemento: e.complemento,
  bairro: e.bairro,
  cidade: e.cidade,
  uf: e.uf,
  cep: e.cep,
});

export const pedidoDTO = (p: PedidoRow, itens: PedidoItemRow[]) => ({
  id: p.id,
  data: p.criado_em,
  status: p.status,
  pagamento: p.pagamento,
  total: reais(p.total_centavos),
  endereco: {
    rua: p.end_rua,
    numero: p.end_numero,
    complemento: p.end_complemento,
    bairro: p.end_bairro,
    cidade: p.end_cidade,
    uf: p.end_uf,
    cep: p.end_cep,
  },
  itens: itens.map((i) => ({
    produtoId: i.produto_id,
    nome: i.nome,
    categoria: i.categoria,
    imagem: i.imagem,
    preco: reais(i.preco_centavos),
    quantidade: i.quantidade,
    subtotal: reais(i.preco_centavos * i.quantidade),
  })),
  ...(p.cliente_email ? { cliente: { id: p.usuario_id, nome: p.cliente_nome, email: p.cliente_email } } : {}),
});
