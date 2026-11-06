import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O PGlite carrega o PostgreSQL em WebAssembly: fica fora do bundle e é lido do node_modules.
  serverExternalPackages: ["@electric-sql/pglite"],
  // A checagem de tipos roda à parte (npm run typecheck, também no CI). Em máquina com pouca
  // memória dá para pular a do build com NEXT_SKIP_TYPECHECK=1.
  typescript: { ignoreBuildErrors: process.env.NEXT_SKIP_TYPECHECK === "1" },
};

export default nextConfig;
