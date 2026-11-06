import { eq } from "drizzle-orm";
import { comoNegocio, comoSistema, schema } from "../db/index.ts";
import { cadastrar } from "./conta.ts";

/** Conta de demonstração. A senha é pública de propósito: está no README. */
export const DEMO = {
  email: "demo@agenda.dev",
  senha: "demonstracao",
  slug: "studio-exemplo",
};

/** Cria o "Studio Exemplo" com três serviços, se ainda não existir. Pode rodar quantas vezes quiser. */
export async function garantirDemonstracao(): Promise<"criado" | "ja_existia"> {
  const [existente] = await comoSistema((tx) => tx.select().from(schema.negocios).where(eq(schema.negocios.slug, DEMO.slug)));
  if (existente) return "ja_existia";

  const r = await cadastrar({ nome: "Demonstração", email: DEMO.email, senha: DEMO.senha, nomeNegocio: "Studio Exemplo", slug: DEMO.slug });
  if (!r.ok) throw new Error(r.erro);
  const [negocio] = await comoSistema((tx) => tx.select().from(schema.negocios).where(eq(schema.negocios.slug, DEMO.slug)));
  await comoNegocio(negocio.id, (tx) =>
    tx.insert(schema.servicos).values([
      { negocioId: negocio.id, nome: "Corte", duracaoMin: 45, precoCentavos: 6000, sinalCentavos: 2000 },
      { negocioId: negocio.id, nome: "Corte + barba", duracaoMin: 75, precoCentavos: 9000, sinalCentavos: 3000 },
      { negocioId: negocio.id, nome: "Barba", duracaoMin: 30, precoCentavos: 4000, sinalCentavos: 0 },
    ]),
  );
  await comoNegocio(negocio.id, (tx) => tx.update(schema.negocios).set({ folgaMin: 10 }).where(eq(schema.negocios.id, negocio.id)));
  return "criado";
}
