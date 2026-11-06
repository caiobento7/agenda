import { defineConfig, devices } from "@playwright/test";

const PORTA = 3100;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  // Os testes reservam horários da mesma agenda: um de cada vez, para não disputarem o mesmo horário.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORTA}`, trace: "retain-on-failure", locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  // Sobe o build de produção com um PGlite novo, cria a demonstração e usa o Pix simulado.
  webServer: {
    command: `node scripts/seed.ts && npx next start -p ${PORTA}`,
    port: PORTA,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      PGLITE_DIR: "./.pglite-e2e",
      PAYMENT_PROVIDER: "simulado",
      SESSION_SECRET: "segredo-dos-testes-de-ponta-a-ponta-123",
      APP_URL: `http://localhost:${PORTA}`,
    },
  },
});
