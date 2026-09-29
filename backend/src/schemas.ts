import { z } from "zod";
import { PAGAMENTOS, STATUS_PEDIDO, TIPOS } from "./types";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const texto = (campo: string, max = 150) =>
  z
    .string({ required_error: `Preencha o campo ${campo}.`, invalid_type_error: `${campo} inválido.` })
    .trim()
    .min(1, `Preencha o campo ${campo}.`)
    .max(max, `${campo} deve ter no máximo ${max} caracteres.`);

const email = z
  .string({ required_error: "Informe o e-mail." })
  .trim()
  .toLowerCase()
  .email("Informe um e-mail válido.")
  .max(150);

// bcrypt só considera os primeiros 72 bytes da senha
const senha = z
  .string({ required_error: "Informe a senha." })
  .min(6, "A senha precisa ter pelo menos 6 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

const preco = z.union([z.number(), z.string()]).transform((valor, ctx) => {
  const t = typeof valor === "number" ? String(valor) : valor.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t) || Number(t) <= 0) {
    ctx.addIssue({ code: "custom", message: "Informe um preço positivo com até 2 casas decimais." });
    return z.NEVER;
  }
  return Number(t);
});

export const cadastroCliente = z.object({ nome: texto("Nome", 100), email, senha });
export const cadastroDono = cadastroCliente.extend({ loja: texto("Nome da loja", 100) });
export const login = z.object({
  email: z.string({ required_error: "Informe o e-mail." }).trim().toLowerCase().min(1, "Informe o e-mail."),
  senha: z.string({ required_error: "Informe a senha." }).min(1, "Informe a senha."),
});

export const perfil = z.object({
  nome: texto("Nome", 100).optional(),
  email: email.optional(),
  loja: texto("Nome da loja", 100).optional(),
});
export const alterarSenha = z.object({
  senhaAtual: z.string({ required_error: "Informe a senha atual." }).min(1, "Informe a senha atual."),
  novaSenha: senha,
});
export const preferencias = z.object({
  notificacoes: z.boolean().optional(),
  pagamentoPreferido: z.enum(PAGAMENTOS).nullable().optional(),
});

export const endereco = z.object({
  rua: texto("Rua"),
  numero: texto("Número", 20),
  complemento: z.string().trim().max(150).default(""),
  bairro: texto("Bairro"),
  cidade: texto("Cidade"),
  uf: z
    .string({ required_error: "Informe uma UF válida." })
    .trim()
    .toUpperCase()
    .refine((v) => UFS.includes(v), "Informe uma UF válida."),
  cep: z
    .string({ required_error: "Informe o CEP." })
    .trim()
    .regex(/^\d{8}$/, "O CEP precisa ter 8 dígitos, somente números (ex.: 12345678)."),
});

export const produto = z.object({
  nome: texto("Nome do produto", 100),
  categoria: texto("Categoria", 50),
  preco,
  imagem: z
    .string({ required_error: "Informe a URL da imagem." })
    .trim()
    .max(500)
    .regex(/^https?:\/\/[^\s]+$/i, "Informe uma URL de imagem http ou https."),
});
export const filtroProdutos = z.object({
  categoria: z.string().trim().optional(),
  busca: z.string().trim().optional(),
});

export const carrinhoAdicionar = z.object({
  produtoId: z.number({ required_error: "Informe o produto." }).int().positive(),
  quantidade: z.number().int().min(1).max(99).default(1),
});
export const carrinhoQuantidade = z.object({
  quantidade: z.number({ required_error: "Informe a quantidade." }).int().min(1).max(99),
});

// Os dados do cartão são apenas validados; nunca são gravados (pagamento é demonstração).
export const pedidoNovo = z
  .object({
    enderecoId: z.number({ required_error: "Selecione um endereço de entrega." }).int().positive(),
    pagamento: z.enum(PAGAMENTOS, { errorMap: () => ({ message: "Selecione uma forma de pagamento." }) }),
    cartao: z
      .object({
        numero: z
          .string()
          .transform((s) => s.replace(/\s/g, ""))
          .pipe(z.string().regex(/^\d{13,19}$/, "Número do cartão inválido.")),
        validade: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Validade inválida. Use MM/AA."),
        cvv: z.string().trim().regex(/^\d{3,4}$/, "CVV inválido."),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.pagamento === "cartao" && !v.cartao) {
      ctx.addIssue({ code: "custom", path: ["cartao"], message: "Preencha os dados do cartão." });
    }
  });

export const adminUsuarioNovo = z
  .object({
    nome: texto("Nome", 100),
    email,
    senha,
    tipo: z.enum(["cliente", "dono"]),
    loja: z.string().trim().max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.tipo === "dono" && !v.loja) {
      ctx.addIssue({ code: "custom", path: ["loja"], message: "Preencha o campo Nome da loja." });
    }
  });
export const filtroUsuarios = z.object({ tipo: z.enum(TIPOS).optional() });
export const bloqueio = z.object({ bloqueado: z.boolean({ required_error: "Informe o bloqueio." }) });
export const filtroPedidos = z.object({ status: z.enum(STATUS_PEDIDO).optional() });
export const statusPedido = z.object({
  status: z.enum(STATUS_PEDIDO, { errorMap: () => ({ message: "Status inválido." }) }),
});
