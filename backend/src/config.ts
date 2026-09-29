import "dotenv/config";
import { z } from "zod";

const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3333),
  JWT_SECRET: z.string().min(16, "precisa ter pelo menos 16 caracteres"),
  JWT_EXPIRES_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  DATABASE_PATH: z.string().default("./data/valentines.db"),
  UPLOADS_DIR: z.string().default("./uploads"),
  CORS_ORIGIN: z.string().default("*"),
  ADMIN_NAME: z.string().default("Super Administrador"),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(6, "precisa ter pelo menos 6 caracteres"),
});

const resultado = esquema.safeParse(process.env);
if (!resultado.success) {
  console.error("Configuração inválida. Copie .env.example para .env e revise:");
  for (const erro of resultado.error.issues) console.error(`- ${erro.path.join(".")}: ${erro.message}`);
  process.exit(1);
}

export const config = resultado.data;

if (
  config.NODE_ENV === "production" &&
  (config.ADMIN_PASSWORD === "123456" || config.JWT_SECRET.startsWith("troque-este-segredo"))
) {
  console.error("Em produção, troque JWT_SECRET e ADMIN_PASSWORD pelos seus próprios valores.");
  process.exit(1);
}
