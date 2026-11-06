import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Testes com banco usam o PGlite em memória (ou o PostgreSQL do DATABASE_URL, no CI).
    env: { PGLITE_DIR: "memory://", SESSION_SECRET: "segredo-de-teste-com-mais-de-32-caracteres", PAYMENT_PROVIDER: "simulado" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // O PostgreSQL de verdade é um só para todos os arquivos: um arquivo por vez.
    fileParallelism: false,
  },
});
