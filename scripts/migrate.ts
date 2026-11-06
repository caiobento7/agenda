// Aplica as migrações no PostgreSQL do DATABASE_URL (produção). Com o PGlite isso acontece sozinho.
process.env.MIGRAR_AO_INICIAR = "1";
const { banco } = await import("../src/db/index.ts");
export {};
await banco();
console.log("Migrações aplicadas.");
process.exit(0);
