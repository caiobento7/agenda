import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migrarPg } from "drizzle-orm/node-postgres/migrator";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migrarPglite } from "drizzle-orm/pglite/migrator";
import pg from "pg";
import * as schema from "./schema.ts";

export type Banco = PgDatabase<PgQueryResultHKT, typeof schema>;
export type Tx = Parameters<Parameters<Banco["transaction"]>[0]>[0];

const pastaMigracoes = path.join(process.cwd(), "drizzle");

/**
 * Com DATABASE_URL, conecta num PostgreSQL normal (Neon, Supabase, Docker...).
 * Sem ela, usa o PGlite: o mesmo PostgreSQL compilado para WebAssembly, rodando dentro do Node.
 * Assim dá para desenvolver e testar sem instalar banco nenhum.
 */
async function conectar(): Promise<Banco> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 5 });
    const db = drizzlePg(pool, { schema });
    // Em produção as migrações rodam antes, com npm run db:migrate (ver README).
    if (process.env.MIGRAR_AO_INICIAR === "1") await migrarPg(db, { migrationsFolder: pastaMigracoes });
    return db as unknown as Banco;
  }
  const pasta = process.env.PGLITE_DIR ?? "./.pglite";
  const cliente = await PGlite.create(pasta === "memory://" ? undefined : pasta, { extensions: { btree_gist } });
  const db = drizzlePglite(cliente, { schema });
  await migrarPglite(db, { migrationsFolder: pastaMigracoes });
  return db as unknown as Banco;
}

// Guardado no globalThis para o recarregamento do `next dev` não abrir um banco novo a cada edição.
const global = globalThis as { __agendaBanco?: Promise<Banco> };

export function banco(): Promise<Banco> {
  global.__agendaBanco ??= conectar();
  return global.__agendaBanco;
}

/**
 * Transação do sistema: webhook, lembretes, login e cadastro. Roda como dono das tabelas,
 * sem o filtro de RLS, porque precisa achar dados sem saber de qual negócio eles são.
 */
export async function comoSistema<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await banco();
  return db.transaction(fn);
}

/**
 * Transação no contexto de um negócio: troca para o papel agenda_app e grava o id do negócio na
 * sessão. A partir daí o PostgreSQL só mostra e só aceita linhas desse negócio (RLS).
 */
export async function comoNegocio<T>(negocioId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const db = await banco();
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role agenda_app`);
    await tx.execute(sql`select set_config('app.negocio_id', ${negocioId}, true)`);
    return fn(tx);
  });
}

/** Código de erro do PostgreSQL, procurando também nas causas (o Drizzle embrulha o erro original). */
export function codigoPg(erro: unknown): string | undefined {
  let atual: unknown = erro;
  for (let i = 0; i < 5 && atual && typeof atual === "object"; i++) {
    const codigo = (atual as { code?: unknown }).code;
    if (typeof codigo === "string") return codigo;
    atual = (atual as { cause?: unknown }).cause;
  }
  return undefined;
}

export const VIOLA_SOBREPOSICAO = "23P01";
export const VIOLA_UNICO = "23505";

export { schema };
