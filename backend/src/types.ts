export const TIPOS = ["cliente", "dono", "superadmin"] as const;
export type Tipo = (typeof TIPOS)[number];

export const PAGAMENTOS = ["pix", "cartao", "boleto"] as const;
export type Pagamento = (typeof PAGAMENTOS)[number];

export const STATUS_PEDIDO = ["Recebido", "Em preparação", "Enviado", "Entregue", "Cancelado"] as const;
export type StatusPedido = (typeof STATUS_PEDIDO)[number];

export interface UsuarioRow {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  tipo: Tipo;
  loja: string | null;
  foto: string | null;
  notificacoes: number;
  pagamento_preferido: Pagamento | null;
  bloqueado: number;
  criado_em: string;
}

export interface ProdutoRow {
  id: number;
  nome: string;
  categoria: string;
  preco_centavos: number;
  imagem: string;
  criado_em: string;
}

export interface EnderecoRow {
  id: number;
  usuario_id: number;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface PedidoRow {
  id: number;
  usuario_id: number;
  status: StatusPedido;
  pagamento: Pagamento;
  total_centavos: number;
  end_rua: string;
  end_numero: string;
  end_complemento: string;
  end_bairro: string;
  end_cidade: string;
  end_uf: string;
  end_cep: string;
  criado_em: string;
  cliente_nome?: string;
  cliente_email?: string;
}

export interface PedidoItemRow {
  id: number;
  pedido_id: number;
  produto_id: number | null;
  nome: string;
  categoria: string;
  imagem: string;
  preco_centavos: number;
  quantidade: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioRow;
    }
  }
}
