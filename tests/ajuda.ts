import { eq, sql } from "drizzle-orm";
import { banco, comoNegocio, comoSistema, schema } from "../src/db/index.ts";
import { cadastrar } from "../src/lib/conta.ts";
import type { ProvedorPagamento, SituacaoPagamento } from "../src/lib/pagamentos/tipos.ts";
import { instanteLocal } from "../src/lib/tempo.ts";

/**
 * Banco migrado e vazio. Um banco só por arquivo de teste (PGlite em memória, ou o PostgreSQL do
 * CI), com as tabelas esvaziadas antes de cada teste: abrir um PGlite novo a cada teste gasta
 * memória demais.
 */
export async function bancoLimpo() {
  process.env.MIGRAR_AO_INICIAR = "1";
  const db = await banco();
  await db.execute(
    sql`truncate usuarios, negocios, servicos, expedientes, bloqueios, reservas, pagamentos, pagamentos_simulados cascade`,
  );
  return db;
}

/** Segunda-feira, 09/11/2026, 20h em São Paulo. A terça seguinte tem expediente 9h-12h e 13h-19h. */
export const AGORA = instanteLocal("2026-11-09", 20 * 60, "America/Sao_Paulo")!;
export const TERCA = "2026-11-10";
export const as = (hora: string, data = TERCA) => {
  const [h, m] = hora.split(":").map(Number);
  return instanteLocal(data, h * 60 + m, "America/Sao_Paulo")!;
};
export const minutosDepois = (base: Date, min: number) => new Date(base.getTime() + min * 60_000);

export async function negocioDeTeste(slug = "barbearia-teste") {
  const r = await cadastrar({ nome: "Dona", email: `${slug}@teste.dev`, senha: "senha-forte-1", nomeNegocio: `Negócio ${slug}`, slug });
  if (!r.ok) throw new Error(r.erro);
  const [negocio] = await comoSistema((tx) => tx.select().from(schema.negocios).where(eq(schema.negocios.slug, slug)));
  const [comSinal, semSinal] = await comoNegocio(negocio.id, (tx) =>
    tx
      .insert(schema.servicos)
      .values([
        { negocioId: negocio.id, nome: "Corte", duracaoMin: 45, precoCentavos: 6000, sinalCentavos: 2000 },
        { negocioId: negocio.id, nome: "Barba", duracaoMin: 30, precoCentavos: 4000, sinalCentavos: 0 },
      ])
      .returning(),
  );
  return { negocio, comSinal, semSinal };
}

/** Provedor de Pix controlado pelo teste: cada cobrança começa pendente e o teste decide o resto. */
export function provedorFalso() {
  const pagamentos = new Map<string, SituacaoPagamento>();
  let n = 0;
  const provedor: ProvedorPagamento = {
    nome: "falso",
    async criarCobrancaPix(p) {
      const id = `pag_${++n}`;
      pagamentos.set(id, { status: "pendente", referencia: p.referencia, valorCentavos: p.valorCentavos, pagoEm: null });
      return { id, copiaECola: `pix-${id}`, qrCodeBase64: "iVBORw0KGgo=", expiraEm: p.expiraEm };
    },
    async consultar(id) {
      return pagamentos.get(id) ?? { status: "recusado", referencia: null, valorCentavos: 0, pagoEm: null };
    },
  };
  const pagar = (id: string, mudar: Partial<SituacaoPagamento> = {}) =>
    pagamentos.set(id, { ...pagamentos.get(id)!, status: "aprovado", pagoEm: new Date(), ...mudar });
  return { provedor, pagar, pagamentos };
}

export async function pagamentoDa(reservaId: string) {
  const [p] = await comoSistema((tx) => tx.select().from(schema.pagamentos).where(eq(schema.pagamentos.reservaId, reservaId)));
  return p;
}

export async function reservaPorId(id: string) {
  const [r] = await comoSistema((tx) => tx.select().from(schema.reservas).where(eq(schema.reservas.id, id)));
  return r;
}
