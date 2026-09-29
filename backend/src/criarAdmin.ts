import { criarUsuario } from "./consultas";

async function gerarAdmin() {
  try {
    await criarUsuario({
      nome: "Super Administrador",
      email: "admin@valenbeauty.com",
      senha: "123456",
      tipo: "superadmin"
    });
    console.log("Conta de Super Admin criada com sucesso!");
    console.log("Email: admin@admin.com");
    console.log("Senha: admin");
  } catch (erro) {
    console.error("Erro ao criar o administrador:", erro);
  }
}

gerarAdmin();