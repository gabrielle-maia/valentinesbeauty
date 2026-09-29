import React, { useEffect, useState } from "react";
import { Alert, Switch, TextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
} from "react-native";

type Produto = {
  id: number;
  nome: string;
  categoria: string;
  preco: number;
  imagem: string;
};

// Substitua pelo número do seu IPv4
const API_URL = "http://192.168.0.136:3333/api";

type Usuario = { nome: string; email: string; senha: string; tipo: "cliente" | "dono" | "superadmin"; loja?: string; bloqueado?: boolean };
type FormaPagamento = "pix" | "cartao" | "boleto";
type Tela = "configuracoes" | "notificacoes" | "ajuda" | "sobre" | "loja" | "editarPerfil" | "enderecos" | "pedidos" | "formas" | "splash" | "inicio" | "produtos" | "produto" | "favoritos" | "carrinho" | "login" | "cadastro" | "cadastroDono" | "perfil" | "superadmin" | "pagamento" | "sucesso";

type Endereco = { id: number; rua: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; cep: string };
type StatusPedido = "Recebido" | "Em preparação" | "Enviado" | "Entregue" | "Cancelado";
type Pedido = { id: number; data: string; itens: Produto[]; total: number; endereco: Endereco; pagamento: FormaPagamento; status?: StatusPedido };
type DadosPerfil = { enderecos: Endereco[]; pedidos: Pedido[]; pagamento: FormaPagamento | null; favoritos: number[]; carrinho: Produto[]; foto: string | null; notificacoes: boolean };
const enderecoVazio: Endereco = { id: 0, rua: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "", cep: "" };
const dadosVazios: DadosPerfil = { enderecos: [], pedidos: [], pagamento: null, favoritos: [], carrinho: [], foto: null, notificacoes: false };
const superAdmin: Usuario = { nome: "Super Administrador", email: "admin@valenbeauty.com", senha: "123456", tipo: "superadmin" };
function avisar(titulo: string, mensagem: string) {
  Alert.alert(titulo, mensagem);
}
function validarEndereco(e: Endereco): string {
  for (const [campo, nome] of [["rua", "Rua"], ["numero", "Número"], ["bairro", "Bairro"], ["cidade", "Cidade"]] as const) {
    if (!e[campo].trim()) return `Preencha o campo ${nome}.`;
  }
  const cep = e.cep.trim();
  if (!/^\d{8}$/.test(cep)) return `O CEP precisa ter 8 dígitos. Você informou ${cep.replace(/\D/g, "").length} dígitos. Use apenas números, como 12345678.`;
  if (!"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ").includes(e.uf.trim().toUpperCase())) return "Informe uma UF válida.";
  return "";
}

const textoEndereco = (e: Endereco) => `${e.rua}, ${e.numero}${e.complemento ? ` — ${e.complemento}` : ""} · ${e.bairro} · ${e.cidade}/${e.uf} · CEP ${e.cep}`;

const produtosIniciais: Produto[] = [
  { id: 1, nome: "Batom Rosé", categoria: "Lábios", preco: 29.9, imagem: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=900&q=85&auto=format&fit=crop" },
  { id: 2, nome: "Paleta Soft Glam", categoria: "Olhos", preco: 59.9, imagem: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=900&q=85&auto=format&fit=crop" },
  { id: 3, nome: "Blush Rosado", categoria: "Face", preco: 39.9, imagem: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=900&q=85&auto=format&fit=crop" },
  { id: 4, nome: "Gloss Crystal", categoria: "Lábios", preco: 24.9, imagem: "https://images.unsplash.com/photo-1631214524020-7e18db761f78?w=900&q=85&auto=format&fit=crop" },
  { id: 5, nome: "Kit Essentials", categoria: "Face", preco: 74.9, imagem: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900&q=85&auto=format&fit=crop" },
  { id: 6, nome: "Pincéis Pro", categoria: "Acessórios", preco: 49.9, imagem: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=85&auto=format&fit=crop" },
];

export default function App() {
  const [tela, setTela] = useState<Tela>("splash");
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [contas, setContas] = useState<Usuario[]>([superAdmin]);
  const [visitante, setVisitante] = useState<DadosPerfil>(dadosVazios);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [emailLogin, setEmailLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [nomeCadastro, setNomeCadastro] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");
  const [nomeDono, setNomeDono] = useState("");
  const [lojaDono, setLojaDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [senhaDono, setSenhaDono] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | null>(null);
  const [numeroCartao, setNumeroCartao] = useState("");
  const [validade, setValidade] = useState("");
  const [cvv, setCvv] = useState("");
  const [perfis, setPerfis] = useState<Record<string, DadosPerfil>>({});
  const dados = usuario ? perfis[usuario.email] ?? dadosVazios : visitante;
  const { favoritos, carrinho } = dados;
  const [endereco, setEndereco] = useState<Endereco>({ ...enderecoVazio });
  const [enderecoCompra, setEnderecoCompra] = useState<number | null>(null);
  const [origemEndereco, setOrigemEndereco] = useState<"perfil" | "pagamento">("perfil");
  const [exclusao, setExclusao] = useState<number | null>(null);
  const [edicao, setEdicao] = useState({ nome: "", email: "", loja: "" });
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>(produtosIniciais);
  const [abaAdmin, setAbaAdmin] = useState<"usuarios" | "lojas" | "produtos" | "pedidos">("usuarios");
  const [contaAdmin, setContaAdmin] = useState<Usuario | null>(null);
  const [emailOriginal, setEmailOriginal] = useState<string | null>(null);
  const [produtoAdmin, setProdutoAdmin] = useState({ id: 0, nome: "", categoria: "", preco: "", imagem: "" });
  const [formProdutoAberto, setFormProdutoAberto] = useState(false);
  const [excluirProduto, setExcluirProduto] = useState<number | null>(null);
  const [filtroPedido, setFiltroPedido] = useState<StatusPedido | "Todos">("Todos");
  function atualizarPerfil(atualizar: (d: DadosPerfil) => DadosPerfil) {
    if (usuario) setPerfis(atual => ({ ...atual, [usuario.email]: atualizar(atual[usuario.email] ?? dadosVazios) }));
    else setVisitante(atualizar);
  }
  function abrirEnderecos(origem: "perfil" | "pagamento") { setOrigemEndereco(origem); setEndereco({ ...enderecoVazio }); setExclusao(null); setTela("enderecos"); }
  function abrirEdicao() { if (usuario) { setEdicao({ nome: usuario.nome, email: usuario.email, loja: usuario.loja ?? "" }); setTela("editarPerfil"); } }


  useEffect(() => {
    const timer = setTimeout(() => setTela("login"), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Novo useEffect para ir buscar os dados ao back-end
  useEffect(() => {
    async function carregarProdutos() {
      try {
        const resposta = await fetch(`${API_URL}/produtos`);
        if (resposta.ok) {
          const dados = await resposta.json();
          // Atualiza o estado com os produtos reais, substituindo os "produtosIniciais"
          setProdutos(dados);
        }
      } catch (erro) {
        console.error("Erro ao ligar à API:", erro);
      }
    }

    carregarProdutos();
  }, []);

  const abrirProduto = (produto: Produto) => {
    setProdutoSelecionado(produto);
    setTela("produto");
  };

  const favoritar = (id: number) => {
    atualizarPerfil(d => ({ ...d, favoritos: d.favoritos.includes(id) ? d.favoritos.filter(item => item !== id) : [...d.favoritos, id] }));
  };

  const adicionarCarrinho = (produto: Produto) => {
    atualizarPerfil(d => ({ ...d, carrinho: [...d.carrinho, produto] }));
    setTela("carrinho");
  };

  const formatarPreco = (preco: number) =>
    `R$ ${preco.toFixed(2).replace(".", ",")}`;

  function Navegacao() {
    return (
      <View style={styles.nav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela("inicio")}>
          <Text style={styles.navIcon}>⌂</Text><Text style={styles.navTexto}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela("produtos")}>
          <Text style={styles.navIcon}>◌</Text><Text style={styles.navTexto}>Produtos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela("favoritos")}>
          <Text style={styles.navIcon}>♡</Text><Text style={styles.navTexto}>Favoritos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela("carrinho")}>
          <Text style={styles.navIcon}>□</Text><Text style={styles.navTexto}>Carrinho</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setTela(usuario ? "perfil" : "login")}>
          <Text style={styles.navIcon}>{usuario ? "○" : "→"}</Text><Text style={styles.navTexto}>{usuario ? "Perfil" : "Entrar"}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function Splash() {
    return (
      <View style={styles.splash}>
        <View style={styles.logoMark}>
          <Text style={styles.logoMarkText}>♡</Text>
        </View>
        <Text style={styles.splashLogo}>Valentines Beauty</Text>
        <Text style={styles.splashSubtitle}>beleza do seu jeito</Text>
        <View style={styles.splashLine} />
      </View>
    );
  }

  function Inicio() {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=88&auto=format&fit=crop" }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.logoLight}>Valentines Beauty</Text>
              <Text style={styles.ola}>Maquiagem para a sua rotina</Text>
              <Text style={styles.heroTitulo}>Escolha o que combina com você.</Text>
              <Text style={styles.heroTextoLight}>
                Produtos de maquiagem e acessórios para você montar seu nécessaire.
              </Text>
              <TouchableOpacity style={styles.botaoPrincipalLight} onPress={() => setTela("produtos")}>
                <Text style={styles.botaoTextoDark}>Ver produtos</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

          <View style={styles.categoriaArea}>
            <Text style={styles.tituloSecao}>Encontre por categoria</Text>
            <View style={styles.categorias}>
              <TouchableOpacity style={styles.categoriaImagem} onPress={() => setTela("produtos")}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=85&auto=format&fit=crop" }} style={styles.categoriaFoto} />
                <View style={styles.categoriaLegenda}><Text style={styles.categoriaTexto}>Lábios</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoriaImagem} onPress={() => setTela("produtos")}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=85&auto=format&fit=crop" }} style={styles.categoriaFoto} />
                <View style={styles.categoriaLegenda}><Text style={styles.categoriaTexto}>Olhos</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.categoriaImagem} onPress={() => setTela("produtos")}>
                <Image source={{ uri: "https://images.unsplash.com/photo-1612817288484-6f916006741a?w=600&q=85&auto=format&fit=crop" }} style={styles.categoriaFoto} />
                <View style={styles.categoriaLegenda}><Text style={styles.categoriaTexto}>Face</Text></View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.destaque}>
            <Text style={styles.destaqueTitulo}>Novidades</Text>
            <Text style={styles.destaqueTexto}>Veja os produtos que chegaram na Valentines Beauty.</Text>
          </View>
        </ScrollView>
        <Navegacao />
      </View>
    );
  }

  function Produtos() {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.topo}>
            <Text style={styles.logo}>Valentines Beauty</Text>
            <Text style={styles.titulo}>Nossos produtos</Text>
            <Text style={styles.subtitulo}>Escolha seus favoritos.</Text>
          </View>
          <View style={styles.grid}>
            {produtos.map((produto) => (
              <View style={styles.card} key={produto.id}>
                <View style={styles.imagemContainer}>
                  <Image source={{ uri: produto.imagem }} style={styles.imagem} />
                  <TouchableOpacity style={styles.coracao} onPress={() => favoritar(produto.id)}>
                    <Text style={styles.coracaoTexto}>{favoritos.includes(produto.id) ? "❤️" : "🤍"}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.categoriaCard}>{produto.categoria}</Text>
                <Text style={styles.nomeProduto}>{produto.nome}</Text>
                <Text style={styles.preco}>{formatarPreco(produto.preco)}</Text>
                <TouchableOpacity style={styles.botaoCard} onPress={() => abrirProduto(produto)}>
                  <Text style={styles.botaoCardTexto}>Ver produto</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>
        <Navegacao />
      </View>
    );
  }

  function ProdutoDetalhes() {
    if (!produtoSelecionado) return null;
    const produto = produtoSelecionado;
    return (
      <View style={styles.container}>
        <ScrollView>
          <TouchableOpacity style={styles.voltar} onPress={() => setTela("produtos")}>
            <Text style={styles.voltarTexto}>← Voltar</Text>
          </TouchableOpacity>
          <Image source={{ uri: produto.imagem }} style={styles.imagemGrande} />
          <View style={styles.detalhes}>
            <Text style={styles.categoriaCard}>{produto.categoria}</Text>
            <Text style={styles.tituloProduto}>{produto.nome}</Text>
            <Text style={styles.precoGrande}>{formatarPreco(produto.preco)}</Text>
            <Text style={styles.descricao}>
              Uma escolha versátil para completar sua maquiagem no dia a dia ou em ocasiões especiais.
            </Text>
            <TouchableOpacity style={styles.botaoPrincipal} onPress={() => adicionarCarrinho(produto)}>
              <Text style={styles.botaoTexto}>Adicionar ao carrinho</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <Navegacao />
      </View>
    );
  }

  function Favoritos() {
    const produtosFavoritos = produtos.filter((produto) => favoritos.includes(produto.id));
    return (
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.topo}><Text style={styles.titulo}>Meus favoritos</Text></View>
          {produtosFavoritos.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioEmoji}>💗</Text>
              <Text style={styles.vazioTitulo}>Você ainda não tem favoritos</Text>
              <Text style={styles.vazioTexto}>Toque no coração dos produtos que você mais gostar.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {produtosFavoritos.map((produto) => (
                <View style={styles.card} key={produto.id}>
                  <Image source={{ uri: produto.imagem }} style={styles.imagem} />
                  <Text style={styles.nomeProduto}>{produto.nome}</Text>
                  <Text style={styles.preco}>{formatarPreco(produto.preco)}</Text>
                  <TouchableOpacity accessibilityLabel={`Remover ${produto.nome} dos favoritos`} onPress={() => favoritar(produto.id)}><Text style={styles.link}>Remover favorito</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.botaoCard} onPress={() => abrirProduto(produto)}>
                    <Text style={styles.botaoCardTexto}>Ver produto</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        <Navegacao />
      </View>
    );
  }

  function Carrinho() {
    const total = carrinho.reduce((soma, produto) => soma + produto.preco, 0);
    return (
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.topo}><Text style={styles.titulo}>Meu carrinho</Text></View>
          {carrinho.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioEmoji}>🛍️</Text>
              <Text style={styles.vazioTitulo}>Seu carrinho está vazio</Text>
              <Text style={styles.vazioTexto}>Adicione alguns produtos para continuar.</Text>
            </View>
          ) : (
            <View style={styles.carrinho}>
              {carrinho.map((produto, index) => (
                <View style={styles.itemCarrinho} key={`${produto.id}-${index}`}>
                  <Image source={{ uri: produto.imagem }} style={styles.imagemCarrinho} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nomeProduto}>{produto.nome}</Text>
                    <Text style={styles.preco}>{formatarPreco(produto.preco)}</Text>
                  </View>
                </View>
              ))}
              <View style={styles.total}>
                <Text style={styles.totalTexto}>Total</Text>
                <Text style={styles.totalPreco}>{formatarPreco(total)}</Text>
              </View>
              <TouchableOpacity style={styles.botaoPrincipal} onPress={() => { if (!usuario) { Alert.alert("Faça login", "Entre ou cadastre-se antes de finalizar o pedido."); setTela("login"); } else { setFormaPagamento(dados.pagamento); setEnderecoCompra(null); setTela("pagamento"); } }}>
                <Text style={styles.botaoTexto}>Finalizar pedido</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <Navegacao />
      </View>
    );
  }


  /*function fazerLogin() {
    const conta = contas.find(c => c.email === emailLogin.trim().toLowerCase() && c.senha === senhaLogin);
    if (!conta) { avisar("Login", "E-mail ou senha incorretos."); return; }
    if (conta.bloqueado) { avisar("Login", "Esta conta está desativada. Entre em contato com o administrador."); return; }
    limparFormularios(); setUsuario(conta); setVisitante(dadosVazios); setTela("perfil");
  }*/

  async function fazerLogin() {
  try {
    const resposta = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Envia o e-mail formatado e a palavra-passe para o back-end
      body: JSON.stringify({ 
        email: emailLogin.trim().toLowerCase(), 
        senha: senhaLogin 
      })
    });

    if (resposta.ok) {
      const dados = await resposta.json();
      // Executa as mesmas ações visuais que tinhas antes
      limparFormularios();
      setUsuario(dados.usuario || dados); 
      setVisitante(dadosVazios);
      setTela("perfil"); 
    } else {
      avisar("Login", "E-mail ou senha incorretos.");
    }
  } catch (erro) {
    avisar("Login", "Não foi possível ligar ao servidor.");
    console.error("Erro na API:", erro);
  }
}
/*
  function cadastrar(conta: Usuario) {
    conta = { ...conta, nome: conta.nome.trim(), email: conta.email.trim().toLowerCase(), loja: conta.loja?.trim() };
    if (!conta.nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(conta.email) || !conta.senha.trim() || (conta.tipo === "dono" && !conta.loja)) { avisar("Cadastro", "Preencha nome, e-mail válido, senha e loja quando aplicável."); return false; }
    if (contas.some(c => c.email === conta.email)) { avisar("Cadastro", "Este e-mail já está cadastrado."); return false; }
    setContas(atual => [...atual, conta]); setUsuario(conta); setVisitante(dadosVazios); limparFormularios(); setTela("perfil");
    return true;
  }
  function cadastrarCliente() {
    if (!cadastrar({ nome: nomeCadastro, email: emailCadastro, senha: senhaCadastro, tipo: "cliente" })) return;
    setNomeCadastro(""); setEmailCadastro(""); setSenhaCadastro(""); setTela("perfil");
  }

  function cadastrarDono() {
    if (!cadastrar({ nome: nomeDono, email: emailDono, senha: senhaDono, tipo: "dono", loja: lojaDono })) return;
    setNomeDono(""); setLojaDono(""); setEmailDono(""); setSenhaDono(""); setTela("perfil");
  }
*/

async function cadastrar(conta: Usuario) {
  conta = { ...conta, nome: conta.nome.trim(), email: conta.email.trim().toLowerCase(), loja: conta.loja?.trim() };
  
  if (!conta.nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(conta.email) || !conta.senha.trim() || (conta.tipo === "dono" && !conta.loja)) { 
    avisar("Cadastro", "Preencha todos os dados corretamente."); 
    return false; 
  }

  try {
    // AQUI ESTÁ A CORREÇÃO: Escolhe a rota dependendo do tipo de conta
    const endpoint = conta.tipo === "dono" ? "/auth/cadastro-dono" : "/auth/cadastro";
    
    const resposta = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(conta)
    });

    if (resposta.ok) {
      const dados = await resposta.json();
      setUsuario(dados.usuario || dados); 
      setVisitante(dadosVazios); 
      limparFormularios();
      setTela("perfil");
      return true;
    } else {
      const erroReal = await resposta.text(); 
      console.log("O BACK-END RESPONDEU COM STATUS:", resposta.status, erroReal);
      avisar("Cadastro", "Não foi possível criar a conta. Verifique os dados.");
      return false;
    }
  } catch (erro) {
    avisar("Erro", "Não foi possível ligar ao servidor.");
    console.error("Erro na API:", erro);
    return false;
  }
}

// Atualizamos os wrappers para aguardarem (await) a resposta da API
async function cadastrarCliente() {
  const sucesso = await cadastrar({ nome: nomeCadastro, email: emailCadastro, senha: senhaCadastro, tipo: "cliente" });
  if (!sucesso) return;
  setNomeCadastro(""); setEmailCadastro(""); setSenhaCadastro(""); setTela("perfil");
}

async function cadastrarDono() {
  const sucesso = await cadastrar({ nome: nomeDono, email: emailDono, senha: senhaDono, tipo: "dono", loja: lojaDono });
  if (!sucesso) return;
  setNomeDono(""); setLojaDono(""); setEmailDono(""); setSenhaDono(""); setTela("perfil");
}


  function limparFormularios() {
    setEmailLogin(""); setSenhaLogin(""); setNumeroCartao(""); setValidade(""); setCvv("");
    setFormaPagamento(null); setEnderecoCompra(null); setEndereco({ ...enderecoVazio }); setExclusao(null);
    setSenhaAtual(""); setNovaSenha(""); setConfirmacaoSenha(""); setEdicao({ nome: "", email: "", loja: "" });
  }
  function sair() { limparFormularios(); setUsuario(null); setVisitante(dadosVazios); setTela("inicio"); }

  async function escolherFoto() {
    if (!usuario) return;
    const email = usuario.email;
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (resultado.canceled || !resultado.assets?.length) return;
      const foto = resultado.assets[0].uri;
      setPerfis(atual => ({ ...atual, [email]: { ...(atual[email] ?? dadosVazios), foto } }));
    } catch {
      avisar("Foto", "Não foi possível abrir a imagem. Verifique a permissão de acesso às fotos e tente novamente.");
    }
  }

  function Login() {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginBrand}>
            <View style={styles.loginLogoCircle}><Text style={styles.loginLogoHeart}>♡</Text></View>
            <Text style={styles.loginLogo}>Valentines Beauty</Text>
            <Text style={styles.loginTagline}>beleza do seu jeito</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.titulo}>Entrar</Text>
            <Text style={styles.subtitulo}>Acesse sua conta para continuar.</Text>
            <Text style={styles.label}>E-mail</Text>
            <TextInput style={styles.input} placeholder="seu@email.com" placeholderTextColor="#AA99A8" value={emailLogin} onChangeText={setEmailLogin} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.label}>Senha</Text>
            <TextInput style={styles.input} placeholder="Digite sua senha" placeholderTextColor="#AA99A8" value={senhaLogin} onChangeText={setSenhaLogin} secureTextEntry />
            <TouchableOpacity style={styles.botaoPrincipal} onPress={fazerLogin}><Text style={styles.botaoTexto}>Entrar</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setTela("cadastro")}><Text style={styles.link}>Criar uma conta</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setTela("cadastroDono")}><Text style={styles.link}>Cadastrar minha loja</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  function Cadastro() {
    return <View style={styles.container}><ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.logo}>Valentines Beauty</Text><Text style={styles.titulo}>Cadastre-se</Text><Text style={styles.subtitulo}>Crie sua conta de cliente.</Text>
      <Text style={styles.label}>Nome completo</Text><TextInput style={styles.input} placeholder="Seu nome" placeholderTextColor="#AA99A8" value={nomeCadastro} onChangeText={setNomeCadastro} />
      <Text style={styles.label}>E-mail</Text><TextInput style={styles.input} placeholder="seu@email.com" placeholderTextColor="#AA99A8" value={emailCadastro} onChangeText={setEmailCadastro} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Senha</Text><TextInput style={styles.input} placeholder="Crie uma senha" placeholderTextColor="#AA99A8" value={senhaCadastro} onChangeText={setSenhaCadastro} secureTextEntry />
      <TouchableOpacity style={styles.botaoPrincipal} onPress={cadastrarCliente}><Text style={styles.botaoTexto}>Criar minha conta</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTela("login")}><Text style={styles.link}>Já tenho uma conta</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTela("cadastroDono")}><Text style={styles.link}>Quero cadastrar minha loja</Text></TouchableOpacity>
    </ScrollView></View>;
  }

  function CadastroDono() {
    return <View style={styles.container}><ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.logo}>Valentines Beauty</Text><Text style={styles.titulo}>Cadastro do dono</Text><Text style={styles.subtitulo}>Cadastro separado para o proprietário da loja.</Text>
      <Text style={styles.label}>Nome do proprietário</Text><TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor="#AA99A8" value={nomeDono} onChangeText={setNomeDono} />
      <Text style={styles.label}>Nome da loja</Text><TextInput style={styles.input} placeholder="Nome da sua loja" placeholderTextColor="#AA99A8" value={lojaDono} onChangeText={setLojaDono} />
      <Text style={styles.label}>E-mail comercial</Text><TextInput style={styles.input} placeholder="loja@email.com" placeholderTextColor="#AA99A8" value={emailDono} onChangeText={setEmailDono} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Senha</Text><TextInput style={styles.input} placeholder="Crie uma senha" placeholderTextColor="#AA99A8" value={senhaDono} onChangeText={setSenhaDono} secureTextEntry />
      <View style={styles.infoBox}><Text style={styles.infoTitulo}>Conta do proprietário</Text><Text style={styles.infoTexto}>Acesso para administrar a loja, produtos e pedidos.</Text></View>
      <TouchableOpacity style={styles.botaoPrincipal} onPress={cadastrarDono}><Text style={styles.botaoTexto}>Cadastrar minha loja</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTela("login")}><Text style={styles.voltarTexto}>← Voltar para login</Text></TouchableOpacity>
    </ScrollView></View>;
  }

  function pagina(titulo: string, conteudo: React.ReactNode, voltar: Tela = "perfil") {
    return <View style={styles.container}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContainer}>
      <TouchableOpacity onPress={() => setTela(voltar)}><Text style={styles.voltarTexto}>← Voltar</Text></TouchableOpacity>
      <Text style={[styles.titulo, { marginVertical: 20 }]}>{titulo}</Text>{conteudo}
    </ScrollView></View>;
  }
  function salvarEndereco() {
    const erro = validarEndereco(endereco);
    if (erro) { avisar("Endereço", erro); return; }
    const salvo = { ...endereco, id: endereco.id || Date.now(), uf: endereco.uf.trim().toUpperCase() };
    atualizarPerfil(d => ({ ...d, enderecos: d.enderecos.some(e => e.id === salvo.id) ? d.enderecos.map(e => e.id === salvo.id ? salvo : e) : [...d.enderecos, salvo] }));
    setEndereco({ ...enderecoVazio });
    if (origemEndereco === "pagamento") { setEnderecoCompra(salvo.id); setTela("pagamento"); }
  }
  function Enderecos() {
    const campos: [keyof Endereco, string][] = [["rua", "Rua"], ["numero", "Número"], ["complemento", "Complemento (opcional)"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["uf", "UF"], ["cep", "CEP"]];
    return pagina("Endereços", <>
      {!dados.enderecos.length && <Text style={styles.infoTexto}>Nenhum endereço cadastrado.</Text>}
      {dados.enderecos.map(e => <View key={e.id} style={styles.infoBox}>
        <Text style={styles.infoTexto}>{textoEndereco(e)}</Text>
        <TouchableOpacity onPress={() => setEndereco({ ...e })}><Text style={styles.link}>Editar endereço</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setExclusao(e.id)}><Text style={styles.link}>Excluir endereço</Text></TouchableOpacity>
        {exclusao === e.id && <><Text style={styles.infoTexto}>Confirma a exclusão?</Text><TouchableOpacity onPress={() => { atualizarPerfil(d => ({ ...d, enderecos: d.enderecos.filter(item => item.id !== e.id) })); if (enderecoCompra === e.id) setEnderecoCompra(null); if (endereco.id === e.id) setEndereco({ ...enderecoVazio }); setExclusao(null); }}><Text style={styles.link}>Confirmar exclusão</Text></TouchableOpacity><TouchableOpacity onPress={() => setExclusao(null)}><Text style={styles.link}>Cancelar</Text></TouchableOpacity></>}
      </View>)}
      <Text style={styles.label}>{endereco.id ? "Editar endereço" : "Cadastrar endereço"}</Text>
      {campos.map(([campo, label]) => <View key={campo}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={String(endereco[campo])} maxLength={campo === "uf" ? 2 : campo === "cep" ? 8 : 150} keyboardType={campo === "cep" ? "number-pad" : "default"} onChangeText={valor => setEndereco(atual => ({ ...atual, [campo]: valor }))} /></View>)}
      <TouchableOpacity style={styles.botaoSecundario} onPress={salvarEndereco}><Text style={styles.botaoSecundarioTexto}>Salvar endereço</Text></TouchableOpacity>
      {!!endereco.id && <TouchableOpacity onPress={() => setEndereco({ ...enderecoVazio })}><Text style={styles.link}>Cancelar edição</Text></TouchableOpacity>}
    </>, origemEndereco);
  }
  function EditarPerfil() {
    return pagina("Editar perfil", <>
      {dados.foto && <Image source={{ uri: dados.foto }} style={styles.fotoPerfil} accessibilityLabel="Foto de perfil" />}
      <TouchableOpacity style={styles.botaoSecundario} onPress={escolherFoto}><Text style={styles.botaoSecundarioTexto}>{dados.foto ? "Trocar foto" : "Adicionar foto"}</Text></TouchableOpacity>
      {dados.foto && <TouchableOpacity onPress={() => atualizarPerfil(d => ({ ...d, foto: null }))}><Text style={styles.link}>Remover foto</Text></TouchableOpacity>}
      {(["nome", "email", ...(usuario?.tipo === "dono" ? ["loja"] : [])] as (keyof typeof edicao)[]).map(campo => <View key={campo}><Text style={styles.label}>{campo === "nome" ? "Nome" : campo === "email" ? "E-mail" : "Loja"}</Text><TextInput accessibilityLabel={campo} style={styles.input} value={edicao[campo]} onChangeText={valor => setEdicao(atual => ({ ...atual, [campo]: valor }))} autoCapitalize={campo === "email" ? "none" : "words"} /></View>)}
      <TouchableOpacity style={styles.botaoSecundario} onPress={() => {
        if (!usuario) return;
        const email = edicao.email.trim().toLowerCase();
        if (!edicao.nome.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (usuario.tipo === "dono" && !edicao.loja.trim())) { avisar("Perfil", "Preencha nome, e-mail válido e nome da loja, quando aplicável."); return; }
        if (email !== usuario.email && contas.some(c => c.email === email)) { avisar("Perfil", "Este e-mail já está em uso."); return; }
        setPerfis(atual => { const proximo = { ...atual, [email]: atual[usuario.email] ?? dadosVazios }; if (email !== usuario.email) delete proximo[usuario.email]; return proximo; });
        const atualizado = { ...usuario, nome: edicao.nome.trim(), email, loja: edicao.loja.trim() };
        setContas(atual => atual.map(c => c.email === usuario.email ? atualizado : c));
        setUsuario(atualizado); setTela("perfil");
      }}><Text style={styles.botaoSecundarioTexto}>Salvar perfil</Text></TouchableOpacity>
    </>);
  }
  function Pedidos() {
    return pagina("Meus pedidos", <>{!dados.pedidos.length && <Text style={styles.infoTexto}>Você ainda não possui pedidos registrados.</Text>}
      {dados.pedidos.map(p => <View key={p.id} style={styles.infoBox}><Text style={styles.infoTitulo}>Pedido #{p.id} · {p.status ?? "Recebido"}</Text><Text style={styles.infoTexto}>{new Date(p.data).toLocaleString("pt-BR")}</Text>{p.itens.map((item, i) => <Text key={i} style={styles.infoTexto}>{item.nome} — {formatarPreco(item.preco)}</Text>)}<Text style={styles.infoTexto}>Total: {formatarPreco(p.total)} · {p.pagamento}</Text><Text style={styles.infoTexto}>{textoEndereco(p.endereco)}</Text></View>)}
    </>);
  }
  function Formas() {
    return pagina("Formas de pagamento", <><Text style={styles.infoTexto}>Escolha a forma de pagamento preferida.</Text>
      {(["pix", "cartao", "boleto"] as FormaPagamento[]).map(forma => <TouchableOpacity key={forma} accessibilityRole="radio" accessibilityState={{ checked: dados.pagamento === forma }} style={[styles.pagamentoOpcao, dados.pagamento === forma && styles.pagamentoSelecionado]} onPress={() => atualizarPerfil(d => ({ ...d, pagamento: forma }))}><Text style={styles.pagamentoTitulo}>{forma === "pix" ? "PIX" : forma === "cartao" ? "Cartão" : "Boleto"}</Text></TouchableOpacity>)}
    </>);
  }

  function Configuracoes() {
    return pagina("Configurações", <>
      <TouchableOpacity onPress={abrirEdicao}><Text style={styles.link}>Editar dados e foto</Text></TouchableOpacity>
      <TouchableOpacity onPress={() => setTela("notificacoes")}><Text style={styles.link}>Notificações</Text></TouchableOpacity>
      <Text style={styles.label}>Senha atual</Text><TextInput accessibilityLabel="Senha atual" style={styles.input} secureTextEntry value={senhaAtual} onChangeText={setSenhaAtual} />
      <Text style={styles.label}>Nova senha</Text><TextInput accessibilityLabel="Nova senha" style={styles.input} secureTextEntry value={novaSenha} onChangeText={setNovaSenha} />
      <Text style={styles.label}>Confirmar nova senha</Text><TextInput accessibilityLabel="Confirmar nova senha" style={styles.input} secureTextEntry value={confirmacaoSenha} onChangeText={setConfirmacaoSenha} />
      <TouchableOpacity style={styles.botaoSecundario} onPress={() => {
        if (!usuario) return;
        if (senhaAtual !== usuario.senha) { avisar("Senha", "A senha atual está incorreta."); return; }
        if (!novaSenha.trim() || novaSenha !== confirmacaoSenha) { avisar("Senha", "Preencha a nova senha e confirme a mesma senha."); return; }
        const atualizado = { ...usuario, senha: novaSenha };
        setContas(atual => atual.map(c => c.email === usuario.email ? atualizado : c)); setUsuario(atualizado);
        setSenhaAtual(""); setNovaSenha(""); setConfirmacaoSenha(""); avisar("Senha", "Senha atualizada."); setTela("perfil");
      }}><Text style={styles.botaoSecundarioTexto}>Alterar senha</Text></TouchableOpacity>
    </>);
  }
  function Notificacoes() {
    return pagina("Notificações", <><Text style={styles.label}>Novidades e ofertas</Text><Switch accessibilityLabel="Novidades e ofertas" value={dados.notificacoes} onValueChange={notificacoes => atualizarPerfil(d => ({ ...d, notificacoes }))} /></>);
  }
  function Ajuda() {
    return pagina("Ajuda e suporte", <>
      <Text style={styles.label}>Como altero meus dados ou foto?</Text><Text style={styles.infoTexto}>Abra Editar perfil. Para trocar a senha, use a engrenagem de Configurações.</Text>
      <Text style={styles.label}>Como escolho o endereço de entrega?</Text><Text style={styles.infoTexto}>Cadastre em Endereços e selecione ao finalizar a compra.</Text>
      <Text style={styles.label}>Onde encontro os pedidos?</Text><Text style={styles.infoTexto}>As compras concluídas aparecem em Meus pedidos.</Text>
      <Text style={styles.label}>Meus dados continuam após fechar o app?</Text><Text style={styles.infoTexto}>Não. Esta versão mantém contas e dados somente durante a sessão. Não há atendimento online conectado.</Text>
    </>);
  }
  function Sobre() {
    return pagina("Sobre o app", <Text style={styles.infoTitulo}>Valentines Beauty · 1.0.0</Text>);
  }
  function Loja() {
    if (usuario?.tipo !== "dono") return null;
    return pagina("Minha loja", <><Text style={styles.infoTitulo}>{usuario.loja}</Text><Text style={styles.infoTexto}>Responsável: {usuario.nome}</Text><Text style={styles.infoTexto}>{usuario.email}</Text><TouchableOpacity style={styles.botaoSecundario} onPress={abrirEdicao}><Text style={styles.botaoSecundarioTexto}>Editar dados da loja</Text></TouchableOpacity></>);
  }

  function Perfil() {
    if (!usuario) return null;
    const iniciais = usuario.nome.split(" ").filter(Boolean).slice(0, 2).map((nome) => nome[0].toUpperCase()).join("");
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.profileContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.profileTopRow}>
              <Text style={styles.profileTitle}>Meu perfil</Text>
              <TouchableOpacity accessibilityLabel="Configurações" onPress={() => setTela("configuracoes")}>
                <Text style={styles.settingsIcon}>⚙</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileIdentity}>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Alterar foto de perfil" onPress={escolherFoto} style={styles.avatar}>{dados.foto ? <Image source={{ uri: dados.foto }} style={styles.fotoPerfil} /> : <Text style={styles.avatarText}>{iniciais}</Text>}</TouchableOpacity>
              <View style={styles.identityText}>
                <Text style={styles.profileName}>{usuario.nome}</Text>
                <Text style={styles.profileEmail}>{usuario.email}</Text>
                <View style={styles.accountBadge}><Text style={styles.accountBadgeText}>{usuario.tipo === "superadmin" ? "Administrador" : usuario.tipo === "dono" ? "Proprietário" : "Cliente"}</Text></View>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.profileEdit} onPress={() => abrirEdicao()}>
            <View><Text style={styles.profileEditTitle}>Editar perfil</Text><Text style={styles.profileEditText}>Atualize seus dados pessoais</Text></View>
            <Text style={styles.profileArrow}>›</Text>
          </TouchableOpacity>

          <Text style={styles.profileSection}>Minha conta</Text>
          <View style={styles.profileMenuCard}>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setTela("pedidos")}>
              <View style={styles.menuIcon}><Text>▣</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Meus pedidos</Text><Text style={styles.menuSubtitle}>Acompanhe suas compras</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => abrirEnderecos("perfil")}>
              <View style={styles.menuIcon}><Text>⌖</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Endereços</Text><Text style={styles.menuSubtitle}>Gerencie seus endereços de entrega</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setTela("formas")}>
              <View style={styles.menuIcon}><Text>▭</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Formas de pagamento</Text><Text style={styles.menuSubtitle}>Cartões e outras opções</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setTela("favoritos")}>
              <View style={styles.menuIcon}><Text>♡</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Favoritos</Text><Text style={styles.menuSubtitle}>{favoritos.length} produto(s) salvo(s)</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileSection}>Preferências</Text>
          <View style={styles.profileMenuCard}>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setTela("notificacoes")}>
              <View style={styles.menuIcon}><Text>♢</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Notificações</Text><Text style={styles.menuSubtitle}>Receba novidades e ofertas</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileMenuItem} onPress={() => setTela("ajuda")}>
              <View style={styles.menuIcon}><Text>?</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Ajuda e suporte</Text><Text style={styles.menuSubtitle}>Tire suas dúvidas</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.profileMenuItem, { borderBottomWidth: 0 }]} onPress={() => setTela("sobre")}>
              <View style={styles.menuIcon}><Text>i</Text></View><View style={styles.menuContent}><Text style={styles.menuTitle}>Sobre o app</Text><Text style={styles.menuSubtitle}>Versão de demonstração</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {usuario.tipo === "dono" && (
            <TouchableOpacity style={styles.ownerCard} onPress={() => setTela("loja")}>
              <View><Text style={styles.ownerTitle}>Área da loja</Text><Text style={styles.ownerText}>{usuario.loja || "Minha loja"}</Text></View><Text style={styles.profileArrow}>›</Text>
            </TouchableOpacity>
          )}

          {usuario.tipo === "superadmin" && <TouchableOpacity style={styles.ownerCard} onPress={() => setTela("superadmin")}><Text style={styles.ownerTitle}>Painel administrativo</Text></TouchableOpacity>}
          <TouchableOpacity style={styles.logoutButton} onPress={sair}><Text style={styles.logoutText}>Sair da conta</Text></TouchableOpacity>
        </ScrollView>
        <Navegacao />
      </View>
    );
  }

  function SuperAdmin() {
    if (usuario?.tipo !== "superadmin") return pagina("Acesso restrito", <Text style={styles.infoTexto}>Somente o Super Admin pode acessar este painel.</Text>);
    const lojas = contas.filter(c => c.tipo === "dono");
    const pedidos = Object.entries(perfis).flatMap(([email, perfil]) => perfil.pedidos.map(pedido => ({ email, pedido }))).sort((a, b) => b.pedido.data.localeCompare(a.pedido.data));
    const secoes = [["usuarios", "Gerenciar usuários", contas.length], ["lojas", "Gerenciar lojas", lojas.length], ["produtos", "Gerenciar produtos", produtos.length], ["pedidos", "Acompanhar pedidos", pedidos.length]] as const;
    const salvarConta = () => {
      if (usuario?.tipo !== "superadmin" || !contaAdmin) return;
      const email = contaAdmin.email.trim().toLowerCase();
      const existente = contas.find(c => c.email === emailOriginal);
      if (existente?.tipo === "superadmin") { avisar("Usuário", "Edite sua conta pelo Perfil."); return; }
      if (!contaAdmin.nome.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!existente && !contaAdmin.senha.trim()) || (contaAdmin.tipo === "dono" && !contaAdmin.loja?.trim())) { avisar("Cadastro", "Preencha nome, e-mail válido, senha e loja quando aplicável."); return; }
      if (contas.some(c => c.email === email && c.email !== emailOriginal)) { avisar("Cadastro", "Este e-mail já está cadastrado."); return; }
      const salvo: Usuario = { ...contaAdmin, nome: contaAdmin.nome.trim(), email, loja: contaAdmin.loja?.trim(), senha: existente?.senha ?? contaAdmin.senha };
      setContas(atual => existente ? atual.map(c => c.email === emailOriginal ? salvo : c) : [...atual, salvo]);
      if (emailOriginal && emailOriginal !== email) setPerfis(atual => { const proximo = { ...atual, [email]: atual[emailOriginal] ?? dadosVazios }; delete proximo[emailOriginal]; return proximo; });
      setContaAdmin(null); setEmailOriginal(null);
    };
    const salvarProduto = () => {
      if (usuario?.tipo !== "superadmin") return;
      const precoTexto = produtoAdmin.preco.trim().replace(",", ".");
      const preco = Number(precoTexto);
      if (!produtoAdmin.nome.trim() || !produtoAdmin.categoria.trim() || !/^\d+(\.\d{1,2})?$/.test(precoTexto) || !Number.isFinite(preco) || preco <= 0 || !/^https?:\/\/[^\s]+$/i.test(produtoAdmin.imagem.trim())) { avisar("Produto", "Informe nome, categoria, preço positivo com até 2 casas decimais e uma URL de imagem http ou https."); return; }
      const salvo: Produto = { id: produtoAdmin.id || Math.max(Date.now(), ...produtos.map(p => p.id + 1)), nome: produtoAdmin.nome.trim(), categoria: produtoAdmin.categoria.trim(), preco, imagem: produtoAdmin.imagem.trim() };
      setProdutos(atual => produtoAdmin.id ? atual.map(p => p.id === salvo.id ? salvo : p) : [...atual, salvo]);
      const atualizar = (d: DadosPerfil) => ({ ...d, carrinho: d.carrinho.map(p => p.id === salvo.id ? salvo : p) });
      setPerfis(atual => Object.fromEntries(Object.entries(atual).map(([email, d]) => [email, atualizar(d)]))); setVisitante(atualizar);
      if (produtoSelecionado?.id === salvo.id) setProdutoSelecionado(salvo);
      setProdutoAdmin({ id: 0, nome: "", categoria: "", preco: "", imagem: "" }); setFormProdutoAberto(false);
    };
    const removerProduto = (id: number) => {
      if (usuario?.tipo !== "superadmin") return;
      setProdutos(atual => atual.filter(p => p.id !== id));
      const limpar = (d: DadosPerfil) => ({ ...d, favoritos: d.favoritos.filter(p => p !== id), carrinho: d.carrinho.filter(p => p.id !== id) });
      setPerfis(atual => Object.fromEntries(Object.entries(atual).map(([email, d]) => [email, limpar(d)]))); setVisitante(limpar);
      if (produtoSelecionado?.id === id) setProdutoSelecionado(null);
      if (produtoAdmin.id === id) { setProdutoAdmin({ id: 0, nome: "", categoria: "", preco: "", imagem: "" }); setFormProdutoAberto(false); }
      setExcluirProduto(null);
    };
    return pagina("Painel administrativo", <>
      <View style={styles.adminGrid}>{secoes.map(([aba, titulo, quantidade]) => <TouchableOpacity key={aba} accessibilityRole="button" accessibilityState={{ selected: abaAdmin === aba }} style={[styles.adminCard, abaAdmin === aba && styles.pagamentoSelecionado]} onPress={() => { setAbaAdmin(aba); setFormProdutoAberto(false); setContaAdmin(null); setEmailOriginal(null); setExcluirProduto(null); }}><Text style={styles.adminNumero}>{quantidade}</Text><Text style={styles.adminTexto}>{titulo}</Text></TouchableOpacity>)}</View>
      {(abaAdmin === "usuarios" || abaAdmin === "lojas") && <>
        <TouchableOpacity style={styles.botaoSecundario} onPress={() => { setEmailOriginal(null); setContaAdmin({ nome: "", email: "", senha: "", tipo: abaAdmin === "lojas" ? "dono" : "cliente", loja: "" }); }}><Text style={styles.botaoSecundarioTexto}>{abaAdmin === "lojas" ? "Cadastrar loja" : "Cadastrar usuário"}</Text></TouchableOpacity>
        {contaAdmin && <View style={styles.infoBox}>
          <Text style={styles.infoTitulo}>{emailOriginal ? "Editar cadastro" : "Novo cadastro"}</Text>
          {(["nome", "email", ...(emailOriginal ? [] : ["senha"]), ...(contaAdmin.tipo === "dono" ? ["loja"] : [])] as ("nome" | "email" | "senha" | "loja")[]).map(campo => <View key={campo}><Text style={styles.label}>{campo === "nome" ? "Nome" : campo === "email" ? "E-mail" : campo === "senha" ? "Senha" : "Nome da loja"}</Text><TextInput accessibilityLabel={`Admin ${campo}`} style={styles.input} value={contaAdmin[campo] ?? ""} secureTextEntry={campo === "senha"} autoCapitalize={campo === "email" ? "none" : "sentences"} onChangeText={valor => setContaAdmin(atual => atual ? { ...atual, [campo]: valor } : null)} /></View>)}
          <TouchableOpacity style={styles.botaoSecundario} onPress={salvarConta}><Text style={styles.botaoSecundarioTexto}>Salvar cadastro</Text></TouchableOpacity><TouchableOpacity onPress={() => setContaAdmin(null)}><Text style={styles.link}>Cancelar cadastro</Text></TouchableOpacity>
        </View>}
        {abaAdmin === "lojas" && !lojas.length && <Text style={styles.infoTexto}>Nenhuma loja cadastrada.</Text>}
        {(abaAdmin === "lojas" ? lojas : contas).map(c => <View key={c.email} style={styles.infoBox}>
          <Text style={styles.infoTitulo}>{abaAdmin === "lojas" ? c.loja : c.nome}</Text><Text style={styles.infoTexto}>{c.email} · {c.tipo === "dono" ? "Proprietário" : c.tipo === "superadmin" ? "Administrador" : "Cliente"} · {c.bloqueado ? "Desativado" : "Ativo"}</Text>
          {c.tipo !== "superadmin" && <><TouchableOpacity accessibilityLabel={`Editar ${c.email}`} onPress={() => { setEmailOriginal(c.email); setContaAdmin({ ...c, senha: "" }); }}><Text style={styles.link}>Editar</Text></TouchableOpacity><TouchableOpacity accessibilityLabel={`${c.bloqueado ? "Ativar" : "Desativar"} ${c.email}`} onPress={() => { if (usuario?.tipo === "superadmin") setContas(atual => atual.map(item => item.email === c.email ? { ...item, bloqueado: !item.bloqueado } : item)); }}><Text style={styles.link}>{c.bloqueado ? "Ativar conta" : "Desativar conta"}</Text></TouchableOpacity></>}
        </View>)}
      </>}
      {abaAdmin === "produtos" && <>
        <TouchableOpacity style={styles.botaoSecundario} accessibilityState={{ expanded: formProdutoAberto }} onPress={() => { setProdutoAdmin({ id: 0, nome: "", categoria: "", preco: "", imagem: "" }); setFormProdutoAberto(true); }}><Text style={styles.botaoSecundarioTexto}>Cadastrar produto</Text></TouchableOpacity>
        {formProdutoAberto && <View style={styles.infoBox}><Text style={styles.infoTitulo}>{produtoAdmin.id ? "Editar produto" : "Novo produto"}</Text>
        {(["nome", "categoria", "preco", "imagem"] as const).map(campo => <View key={campo}><Text style={styles.label}>{campo === "preco" ? "Preço (R$)" : campo === "imagem" ? "URL da imagem" : campo === "nome" ? "Nome do produto" : "Categoria"}</Text><TextInput accessibilityLabel={`Produto ${campo}`} style={styles.input} value={produtoAdmin[campo]} keyboardType={campo === "preco" ? "decimal-pad" : "default"} autoCapitalize={campo === "imagem" ? "none" : "sentences"} onChangeText={valor => setProdutoAdmin(atual => ({ ...atual, [campo]: valor }))} /></View>)}
        <TouchableOpacity style={styles.botaoSecundario} onPress={salvarProduto}><Text style={styles.botaoSecundarioTexto}>Salvar produto</Text></TouchableOpacity><TouchableOpacity onPress={() => setFormProdutoAberto(false)}><Text style={styles.link}>Cancelar produto</Text></TouchableOpacity></View>}
        {!produtos.length && <Text style={styles.infoTexto}>Nenhum produto cadastrado.</Text>}
        {produtos.map(p => <View key={p.id} style={styles.infoBox}><Text style={styles.infoTitulo}>{p.nome}</Text><Text style={styles.infoTexto}>{p.categoria} · {formatarPreco(p.preco)}</Text><TouchableOpacity accessibilityLabel={`Editar produto ${p.id}`} onPress={() => { setProdutoAdmin({ ...p, preco: p.preco.toFixed(2) }); setFormProdutoAberto(true); }}><Text style={styles.link}>Editar produto</Text></TouchableOpacity><TouchableOpacity accessibilityLabel={`Excluir produto ${p.id}`} onPress={() => setExcluirProduto(p.id)}><Text style={styles.link}>Excluir produto</Text></TouchableOpacity>
          {excluirProduto === p.id && <><Text style={styles.infoTexto}>Excluir {p.nome} do catálogo, favoritos e carrinhos? Pedidos anteriores serão mantidos.</Text><TouchableOpacity onPress={() => removerProduto(p.id)}><Text style={styles.link}>Confirmar exclusão do produto</Text></TouchableOpacity><TouchableOpacity onPress={() => setExcluirProduto(null)}><Text style={styles.link}>Cancelar exclusão</Text></TouchableOpacity></>}
        </View>)}
      </>}
      {abaAdmin === "pedidos" && <>
        <View style={styles.statusGrupo}>{(["Todos", "Recebido", "Em preparação", "Enviado", "Entregue", "Cancelado"] as const).map(status => <TouchableOpacity key={status} accessibilityRole="radio" accessibilityState={{ checked: filtroPedido === status }} style={[styles.pagamentoOpcao, styles.statusFiltro, filtroPedido === status && styles.pagamentoSelecionado]} onPress={() => setFiltroPedido(status)}><Text>{status}</Text></TouchableOpacity>)}</View>
        {!pedidos.some(({ pedido }) => filtroPedido === "Todos" || (pedido.status ?? "Recebido") === filtroPedido) && <Text style={styles.infoTexto}>Nenhum pedido neste filtro.</Text>}
        {pedidos.filter(({ pedido }) => filtroPedido === "Todos" || (pedido.status ?? "Recebido") === filtroPedido).map(({ email, pedido }) => <View key={`${email}-${pedido.id}`} style={styles.infoBox}>
          <Text style={styles.infoTitulo}>Pedido #{pedido.id} · {pedido.status ?? "Recebido"}</Text><Text style={styles.infoTexto}>{contas.find(c => c.email === email)?.nome ?? email} · {email}</Text><Text style={styles.infoTexto}>{new Date(pedido.data).toLocaleString("pt-BR")}</Text>
          {pedido.itens.map((p, i) => <Text key={i} style={styles.infoTexto}>{p.nome} · {formatarPreco(p.preco)}</Text>)}<Text style={styles.infoTexto}>Total: {formatarPreco(pedido.total)} · {pedido.pagamento}</Text><Text style={styles.infoTexto}>{textoEndereco(pedido.endereco)}</Text>
          {(["Recebido", "Em preparação", "Enviado", "Entregue", "Cancelado"] as const).map(status => <TouchableOpacity key={status} accessibilityRole="radio" accessibilityState={{ checked: (pedido.status ?? "Recebido") === status }} onPress={() => { if (usuario?.tipo === "superadmin") setPerfis(atual => { const perfil = atual[email]; return perfil ? { ...atual, [email]: { ...perfil, pedidos: perfil.pedidos.map(p => p.id === pedido.id ? { ...p, status } : p) } } : atual; }); }}><Text style={styles.link}>{status}</Text></TouchableOpacity>)}
        </View>)}
      </>}
    </>);
  }

  function Pagamento() {
    const total = carrinho.reduce((soma, produto) => soma + produto.preco, 0);
    const finalizar = () => {
      if (!usuario || !carrinho.length) { avisar("Pedido", "Entre na sua conta e adicione produtos ao carrinho."); return; }
      const entrega = dados.enderecos.find(e => e.id === enderecoCompra);
      if (!entrega) { avisar("Endereço", "Selecione um endereço de entrega."); return; }
      if (!formaPagamento) { avisar("Atenção", "Selecione uma forma de pagamento."); return; }
      if (formaPagamento === "cartao" && (!numeroCartao || !validade || !cvv)) { avisar("Atenção", "Preencha os dados do cartão."); return; }
      const pedido: Pedido = { id: Date.now(), data: new Date().toISOString(), itens: carrinho.map(p => ({ ...p })), total, endereco: { ...entrega }, pagamento: formaPagamento };
      atualizarPerfil(d => ({ ...d, pedidos: [pedido, ...d.pedidos], carrinho: [] })); setNumeroCartao(""); setValidade(""); setCvv(""); setTela("sucesso");
    };
    return <View style={styles.container}><ScrollView contentContainerStyle={styles.formContainer}>
      <Text style={styles.logo}>Valentines Beauty</Text><Text style={styles.titulo}>Pagamento</Text><Text style={styles.subtitulo}>Escolha uma forma de pagamento.</Text>
      <View style={styles.totalPagamento}><Text style={styles.totalTexto}>Total</Text><Text style={styles.totalPreco}>{formatarPreco(total)}</Text></View>
      <Text style={styles.label}>Endereço de entrega</Text>
      {!dados.enderecos.length && <Text style={styles.infoTexto}>Cadastre um endereço para concluir a compra.</Text>}
      {dados.enderecos.map(e => <TouchableOpacity key={e.id} accessibilityRole="radio" accessibilityState={{ checked: enderecoCompra === e.id }} style={[styles.pagamentoOpcao, enderecoCompra === e.id && styles.pagamentoSelecionado]} onPress={() => setEnderecoCompra(e.id)}><Text style={styles.infoTexto}>{enderecoCompra === e.id ? "● " : "○ "}{textoEndereco(e)}</Text></TouchableOpacity>)}
      <TouchableOpacity onPress={() => abrirEnderecos("pagamento")}><Text style={styles.link}>Cadastrar ou editar endereço</Text></TouchableOpacity>
      <Text style={styles.label}>Forma de pagamento</Text>
      {(["pix", "cartao", "boleto"] as FormaPagamento[]).map((forma) => <TouchableOpacity key={forma} style={[styles.pagamentoOpcao, formaPagamento === forma && styles.pagamentoSelecionado]} onPress={() => setFormaPagamento(forma)}><Text style={styles.pagamentoTitulo}>{forma === "pix" ? "PIX" : forma === "cartao" ? "Cartão" : "Boleto"}</Text><Text style={styles.pagamentoDescricao}>{forma === "pix" ? "Pagamento rápido e simples." : forma === "cartao" ? "Crédito ou débito." : "Pagamento por boleto."}</Text></TouchableOpacity>)}
      {formaPagamento === "cartao" && <><Text style={styles.label}>Número do cartão</Text><TextInput style={styles.input} placeholder="0000 0000 0000 0000" placeholderTextColor="#AA99A8" value={numeroCartao} onChangeText={setNumeroCartao} keyboardType="number-pad" /><View style={styles.duasColunas}><View style={{ flex: 1 }}><Text style={styles.label}>Validade</Text><TextInput style={styles.input} placeholder="MM/AA" placeholderTextColor="#AA99A8" value={validade} onChangeText={setValidade} /></View><View style={{ flex: 1 }}><Text style={styles.label}>CVV</Text><TextInput style={styles.input} placeholder="CVV" placeholderTextColor="#AA99A8" value={cvv} onChangeText={setCvv} keyboardType="number-pad" secureTextEntry /></View></View></>}
      <TouchableOpacity style={styles.botaoPrincipal} onPress={finalizar}><Text style={styles.botaoTexto}>Confirmar pagamento</Text></TouchableOpacity><TouchableOpacity onPress={() => setTela("carrinho")}><Text style={styles.voltarTexto}>← Voltar ao carrinho</Text></TouchableOpacity><Text style={styles.avisoPagamento}>Tela de pagamento para demonstração. Não realiza transações reais.</Text>
    </ScrollView></View>;
  }

  function Sucesso() { return <View style={styles.container}><View style={styles.sucesso}><Text style={styles.sucessoIcone}>✓</Text><Text style={styles.titulo}>Pedido realizado</Text><Text style={styles.sucessoTexto}>Seu pedido foi registrado com sucesso. Obrigado por escolher a Valentines Beauty.</Text><TouchableOpacity style={styles.botaoPrincipal} onPress={() => setTela("inicio")}><Text style={styles.botaoTexto}>Voltar para o início</Text></TouchableOpacity></View></View>; }

  if (tela === "configuracoes") return Configuracoes();
  if (tela === "notificacoes") return Notificacoes();
  if (tela === "ajuda") return Ajuda();
  if (tela === "sobre") return Sobre();
  if (tela === "loja") return Loja();
  if (tela === "editarPerfil") return EditarPerfil();
  if (tela === "enderecos") return Enderecos();
  if (tela === "pedidos") return Pedidos();
  if (tela === "formas") return Formas();
  if (tela === "splash") return Splash();
  if (tela === "inicio") return Inicio();
  if (tela === "produtos") return Produtos();
  if (tela === "produto") return ProdutoDetalhes();
  if (tela === "favoritos") return Favoritos();
  if (tela === "carrinho") return Carrinho();
  if (tela === "login") return Login();
  if (tela === "cadastro") return Cadastro();
  if (tela === "cadastroDono") return CadastroDono();
  if (tela === "perfil") return Perfil();
  if (tela === "superadmin") return SuperAdmin();
  if (tela === "pagamento") return Pagamento();
  return <Sucesso />;
}

const styles = StyleSheet.create({
  statusFiltro: { flexGrow: 1, flexBasis: 140, marginBottom: 0 },
  statusGrupo: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 12 },
  fotoPerfil: { width: 72, height: 72, borderRadius: 36, resizeMode: "cover" },
  splash: { flex: 1, backgroundColor: "#FCEAF3", alignItems: "center", justifyContent: "center" },
  logoMark: { width: 94, height: 94, borderRadius: 47, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E6B7CF" },
  logoMarkText: { fontSize: 58, lineHeight: 66, color: "#B54E7B", fontWeight: "300" },
  splashLogo: { marginTop: 18, fontSize: 34, fontWeight: "700", color: "#7B3E63", letterSpacing: 0.2 },
  splashSubtitle: { marginTop: 5, fontSize: 14, color: "#A16C89", letterSpacing: 1 },
  splashLine: { width: 38, height: 2, backgroundColor: "#D98EAD", marginTop: 22, borderRadius: 2 },
  loginContainer: { padding: 25, paddingTop: 58, paddingBottom: 45 },
  loginBrand: { alignItems: "center", marginBottom: 28 },
  loginLogoCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#F9E4EE", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E5B5CB" },
  loginLogoHeart: { color: "#B54E7B", fontSize: 45, lineHeight: 52 },
  loginLogo: { marginTop: 10, fontSize: 30, fontWeight: "700", color: "#7B3E63" },
  loginTagline: { color: "#A16C89", fontSize: 13, marginTop: 3 },
  loginCard: { backgroundColor: "#FFFFFF", borderRadius: 24, padding: 22, borderWidth: 1, borderColor: "#F0DDE7", shadowColor: "#7B3E63", shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  profileContainer: { padding: 20, paddingTop: 54, paddingBottom: 120 },
  profileHeader: { marginBottom: 8 },
  profileTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  profileTitle: { fontSize: 29, fontWeight: "700", color: "#543D53" },
  settingsIcon: { fontSize: 23, color: "#8B5A91" },
  profileIdentity: { flexDirection: "row", alignItems: "center", marginTop: 24, marginBottom: 14 },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: "#EAD0DE", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFFFFF", shadowColor: "#7B3E63", shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  avatarText: { color: "#7B3E63", fontSize: 25, fontWeight: "700" },
  identityText: { marginLeft: 15, flex: 1 },
  profileName: { color: "#543D53", fontSize: 20, fontWeight: "700" },
  profileEmail: { color: "#8B7188", fontSize: 13, marginTop: 4 },
  accountBadge: { alignSelf: "flex-start", backgroundColor: "#F5E5ED", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, marginTop: 7 },
  accountBadgeText: { color: "#9B5275", fontSize: 11, fontWeight: "600" },
  profileEdit: { backgroundColor: "#F8EEF3", borderRadius: 17, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 8 },
  profileEditTitle: { color: "#6F4764", fontWeight: "700", fontSize: 15 },
  profileEditText: { color: "#9B7B8D", fontSize: 12, marginTop: 3 },
  profileSection: { color: "#6C4A63", fontSize: 14, fontWeight: "700", marginTop: 22, marginBottom: 9, marginLeft: 3 },
  profileMenuCard: { backgroundColor: "#FFFFFF", borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: "#F0E1E9" },
  profileMenuItem: { minHeight: 67, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F4E8EE" },
  menuIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#F9EAF1", alignItems: "center", justifyContent: "center" },
  menuIconText: { color: "#A44F77", fontSize: 18 },
  menuContent: { flex: 1, marginLeft: 12 },
  menuTitle: { color: "#594253", fontSize: 14, fontWeight: "600" },
  menuSubtitle: { color: "#9B818F", fontSize: 11, marginTop: 3 },
  profileArrow: { color: "#B48AA0", fontSize: 24, marginLeft: 8 },
  ownerCard: { backgroundColor: "#F0E5F4", borderRadius: 18, padding: 17, marginTop: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ownerTitle: { color: "#674A69", fontSize: 14, fontWeight: "700" },
  ownerText: { color: "#8B7188", fontSize: 12, marginTop: 3 },
  logoutButton: { borderWidth: 1, borderColor: "#E5B8C9", borderRadius: 15, paddingVertical: 14, alignItems: "center", marginTop: 25 },
  logoutText: { color: "#A34D68", fontSize: 14, fontWeight: "700" },
  container: { flex: 1, backgroundColor: "#FFF9FC" },
  heroImage: { height: 475, justifyContent: "flex-end" },
  heroImageStyle: { borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  heroOverlay: { backgroundColor: "rgba(73, 45, 67, 0.56)", padding: 28, paddingTop: 70, paddingBottom: 36, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 },
  logo: { fontSize: 23, fontWeight: "bold", color: "#7B4B7A", marginBottom: 35 },
  logoLight: { fontSize: 25, fontWeight: "700", color: "#FFFFFF", marginBottom: 28, letterSpacing: 0.3 },
  ola: { fontSize: 14, color: "#F7EAF3", marginBottom: 10, letterSpacing: 0.5 },
  heroTitulo: { fontSize: 31, fontWeight: "700", color: "#FFFFFF", lineHeight: 38 },
  heroTexto: { fontSize: 15, color: "#76596F", lineHeight: 23, marginTop: 15, marginBottom: 25 },
  heroTextoLight: { fontSize: 15, color: "#F8EFF5", lineHeight: 23, marginTop: 13, marginBottom: 24 },
  botaoPrincipal: { backgroundColor: "#8B5A91", paddingVertical: 15, paddingHorizontal: 25, borderRadius: 15, alignItems: "center" },
  botaoTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  botaoPrincipalLight: { backgroundColor: "#FFF8FB", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, alignItems: "center", alignSelf: "flex-start" },
  botaoTextoDark: { color: "#684C68", fontSize: 15, fontWeight: "700" },
  categoriaArea: { padding: 25 },
  tituloSecao: { fontSize: 22, fontWeight: "bold", color: "#5E3A5E", marginBottom: 15 },
  categorias: { flexDirection: "row", justifyContent: "space-between" },
  categoriaImagem: { width: "31%", height: 120, borderRadius: 17, overflow: "hidden", backgroundColor: "#F1E5EE" },
  categoriaFoto: { width: "100%", height: "100%" },
  categoriaLegenda: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(61, 42, 57, 0.55)", paddingVertical: 8, alignItems: "center" },
  categoriaTexto: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 },
  destaque: { marginHorizontal: 25, marginBottom: 120, backgroundColor: "#FFF3B0", padding: 20, borderRadius: 20 },
  destaqueTitulo: { color: "#735F25", fontSize: 18, fontWeight: "bold" },
  destaqueTexto: { color: "#806F3C", marginTop: 6 },
  topo: { padding: 25, paddingTop: 55, paddingBottom: 16 },
  titulo: { fontSize: 28, fontWeight: "bold", color: "#5E3A5E" },
  subtitulo: { color: "#8B7188", fontSize: 15, marginTop: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", padding: 20, paddingBottom: 110 },
  card: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 20, padding: 10, marginBottom: 18, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  imagemContainer: { position: "relative" },
  imagem: { width: "100%", height: 155, borderRadius: 15 },
  coracao: { position: "absolute", right: 8, top: 8, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 5 },
  coracaoTexto: { fontSize: 18 },
  categoriaCard: { color: "#A47BA1", fontSize: 12, marginTop: 10 },
  nomeProduto: { color: "#543D53", fontSize: 16, fontWeight: "bold", marginTop: 4 },
  preco: { color: "#8B5A91", fontSize: 16, fontWeight: "bold", marginTop: 7 },
  botaoCard: { backgroundColor: "#EADCF0", paddingVertical: 10, borderRadius: 12, marginTop: 10, alignItems: "center" },
  botaoCardTexto: { color: "#765078", fontWeight: "bold", fontSize: 13 },
  voltar: { padding: 25, paddingTop: 55 },
  voltarTexto: { color: "#765078", fontSize: 16, fontWeight: "bold" },
  imagemGrande: { width: "100%", height: 330, resizeMode: "cover" },
  detalhes: { padding: 25, paddingBottom: 120 },
  tituloProduto: { fontSize: 30, fontWeight: "bold", color: "#543D53", marginTop: 5 },
  precoGrande: { fontSize: 24, color: "#8B5A91", fontWeight: "bold", marginTop: 12 },
  descricao: { fontSize: 16, color: "#806F7D", lineHeight: 25, marginVertical: 25 },
  vazio: { alignItems: "center", justifyContent: "center", padding: 40, marginTop: 80 },
  vazioEmoji: { fontSize: 55, marginBottom: 20 },
  vazioTitulo: { fontSize: 20, fontWeight: "bold", color: "#5E3A5E", textAlign: "center" },
  vazioTexto: { color: "#8B7188", textAlign: "center", marginTop: 10, lineHeight: 22 },
  carrinho: { padding: 20, paddingBottom: 120 },
  itemCarrinho: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 10, borderRadius: 18, marginBottom: 12 },
  imagemCarrinho: { width: 75, height: 75, borderRadius: 12, marginRight: 15 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 20, padding: 15, backgroundColor: "#FFF3B0", borderRadius: 15 },
  totalTexto: { fontSize: 18, fontWeight: "bold", color: "#735F25" },
  totalPreco: { fontSize: 18, fontWeight: "bold", color: "#735F25" },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, height: 78, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#F0E4EF", flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingBottom: 8 },
  navItem: { minWidth: 52, alignItems: "center" },
  navIcon: { textAlign: "center", fontSize: 22, color: "#765078", lineHeight: 24 },
  navTexto: { textAlign: "center", color: "#765078", fontSize: 11, marginTop: 3 },

  formContainer: { padding: 25, paddingTop: 60, paddingBottom: 50 },
  label: { color: "#5E3A5E", fontSize: 14, fontWeight: "bold", marginTop: 14, marginBottom: 7 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5D6E5", borderRadius: 14, paddingHorizontal: 15, paddingVertical: 14, fontSize: 15, color: "#543D53" },
  link: { textAlign: "center", color: "#8B5A91", fontWeight: "bold", marginTop: 18 },
  infoBox: { backgroundColor: "#F3EAF5", borderRadius: 18, padding: 18, marginTop: 22 },
  infoTitulo: { color: "#684C68", fontSize: 16, fontWeight: "bold", marginBottom: 8 },
  infoTexto: { color: "#806F7D", marginTop: 5, lineHeight: 20 },
  botaoSecundario: { backgroundColor: "#EADCF0", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 15 },
  botaoSecundarioTexto: { color: "#765078", fontSize: 15, fontWeight: "bold" },
  botaoSair: { backgroundColor: "#F7E0E7", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 12 },
  botaoSairTexto: { color: "#A34D68", fontWeight: "bold" },
  perfilIcone: { fontSize: 55, marginBottom: 10 },
  perfilCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, marginTop: 20 },
  perfilLinha: { color: "#684C68", marginBottom: 10, fontSize: 15 },
  adminBadge: { alignSelf: "flex-start", backgroundColor: "#EADCF0", color: "#765078", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, fontWeight: "bold", marginBottom: 12 },
  adminGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 10 },
  adminCard: { width: "47%", backgroundColor: "#FFFFFF", borderRadius: 18, padding: 18, alignItems: "center", marginBottom: 12 },
  adminNumero: { fontSize: 28, fontWeight: "bold", color: "#8B5A91" },
  adminTexto: { color: "#806F7D", marginTop: 5 },
  totalPagamento: { backgroundColor: "#FFF3B0", borderRadius: 18, padding: 18, marginVertical: 10, flexDirection: "row", justifyContent: "space-between" },
  pagamentoOpcao: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5D6E5", borderRadius: 16, padding: 16, marginBottom: 10 },
  pagamentoSelecionado: { borderColor: "#8B5A91", backgroundColor: "#F3EAF5" },
  pagamentoTitulo: { color: "#5E3A5E", fontSize: 16, fontWeight: "bold" },
  pagamentoDescricao: { color: "#8B7188", marginTop: 4 },
  duasColunas: { flexDirection: "row", gap: 10 },
  avisoPagamento: { textAlign: "center", color: "#9B8A98", fontSize: 12, marginTop: 25, lineHeight: 18 },
  sucesso: { flex: 1, alignItems: "center", justifyContent: "center", padding: 35 },
  sucessoIcone: { width: 85, height: 85, borderRadius: 50, backgroundColor: "#EADCF0", textAlign: "center", paddingTop: 17, fontSize: 45, color: "#8B5A91", fontWeight: "bold", marginBottom: 25 },
  sucessoTexto: { textAlign: "center", color: "#806F7D", lineHeight: 24, fontSize: 15, marginVertical: 20 },
});
