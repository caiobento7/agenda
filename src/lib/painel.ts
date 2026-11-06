import { asc, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { comoNegocio, schema } from "../db/index.ts";
import { lerReais } from "./dinheiro.ts";
import { horaParaMinutos, instanteLocal } from "./tempo.ts";

/**
 * Operações do painel. Todas rodam em comoNegocio: mesmo que alguém mande o id de um serviço de
 * outro negócio, o RLS do PostgreSQL faz a linha simplesmente não existir para esta sessão.
 */

export type Resultado = { ok: true } | { ok: false; erro: string };

export function servicosDoNegocio(negocioId: string) {
  return comoNegocio(negocioId, (tx) => tx.select().from(schema.servicos).orderBy(asc(schema.servicos.criadoEm)));
}

const esquemaServico = z.object({
  nome: z.string().trim().min(2, "Informe o nome do serviço.").max(60),
  duracaoMin: z.coerce.number().int().min(5, "Duração mínima de 5 minutos.").max(600),
  preco: z.string(),
  sinal: z.string(),
});

export async function salvarServico(negocioId: string, entrada: z.input<typeof esquemaServico>, servicoId?: string): Promise<Resultado> {
  const v = esquemaServico.safeParse(entrada);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  const preco = lerReais(v.data.preco);
  const sinal = v.data.sinal.trim() === "" ? 0 : lerReais(v.data.sinal);
  if (preco === null || sinal === null) return { ok: false, erro: "Valor inválido. Use o formato 49,90." };
  if (sinal > preco) return { ok: false, erro: "O sinal não pode ser maior que o preço." };
  const valores = { nome: v.data.nome, duracaoMin: v.data.duracaoMin, precoCentavos: preco, sinalCentavos: sinal };
  await comoNegocio(negocioId, async (tx) => {
    if (servicoId) await tx.update(schema.servicos).set(valores).where(eq(schema.servicos.id, servicoId));
    else await tx.insert(schema.servicos).values({ ...valores, negocioId });
  });
  return { ok: true };
}

export async function alternarServico(negocioId: string, servicoId: string, ativo: boolean) {
  await comoNegocio(negocioId, (tx) => tx.update(schema.servicos).set({ ativo }).where(eq(schema.servicos.id, servicoId)));
}

export function expedienteDoNegocio(negocioId: string) {
  return comoNegocio(negocioId, (tx) =>
    tx.select().from(schema.expedientes).orderBy(asc(schema.expedientes.diaSemana), asc(schema.expedientes.inicioMin)),
  );
}

export type FaixaTexto = { diaSemana: number; inicio: string; fim: string };

/** Troca o expediente inteiro de uma vez. Faixas do mesmo dia não podem se cruzar. */
export async function salvarExpediente(negocioId: string, faixas: FaixaTexto[]): Promise<Resultado> {
  const lidas: { diaSemana: number; inicioMin: number; fimMin: number }[] = [];
  for (const f of faixas) {
    if (!f.inicio && !f.fim) continue;
    const inicioMin = horaParaMinutos(f.inicio);
    const fimMin = horaParaMinutos(f.fim);
    if (inicioMin === null || fimMin === null) return { ok: false, erro: `Horário inválido: "${f.inicio}" - "${f.fim}". Use 09:00.` };
    if (inicioMin >= fimMin) return { ok: false, erro: `O fim precisa ser depois do início (${f.inicio} - ${f.fim}).` };
    lidas.push({ diaSemana: f.diaSemana, inicioMin, fimMin });
  }
  for (const a of lidas) {
    for (const b of lidas) {
      if (a !== b && a.diaSemana === b.diaSemana && a.inicioMin < b.fimMin && b.inicioMin < a.fimMin) {
        return { ok: false, erro: "Duas faixas do mesmo dia estão se cruzando." };
      }
    }
  }
  await comoNegocio(negocioId, async (tx) => {
    await tx.delete(schema.expedientes);
    if (lidas.length) await tx.insert(schema.expedientes).values(lidas.map((f) => ({ ...f, negocioId })));
  });
  return { ok: true };
}

export function bloqueiosFuturos(negocioId: string, agora = new Date()) {
  return comoNegocio(negocioId, (tx) =>
    tx.select().from(schema.bloqueios).where(gt(schema.bloqueios.fim, agora)).orderBy(asc(schema.bloqueios.inicio)),
  );
}

export async function criarBloqueio(
  negocioId: string,
  fuso: string,
  e: { data: string; inicio: string; fim: string; motivo: string },
): Promise<Resultado> {
  const inicioMin = horaParaMinutos(e.inicio || "00:00");
  const fimMin = horaParaMinutos(e.fim || "24:00");
  if (inicioMin === null || fimMin === null || inicioMin >= fimMin) return { ok: false, erro: "Período inválido." };
  const inicio = instanteLocal(e.data, inicioMin, fuso);
  const fim = fimMin === 1440 ? instanteLocal(proximoDia(e.data), 0, fuso) : instanteLocal(e.data, fimMin, fuso);
  if (!inicio || !fim) return { ok: false, erro: "Data inválida." };
  await comoNegocio(negocioId, (tx) =>
    tx.insert(schema.bloqueios).values({ negocioId, inicio, fim, motivo: e.motivo.trim().slice(0, 80) || null }),
  );
  return { ok: true };
}

function proximoDia(data: string) {
  const [a, m, d] = data.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + 1)).toISOString().slice(0, 10);
}

export async function removerBloqueio(negocioId: string, bloqueioId: string) {
  await comoNegocio(negocioId, (tx) => tx.delete(schema.bloqueios).where(eq(schema.bloqueios.id, bloqueioId)));
}

export async function cancelarReserva(negocioId: string, reservaId: string) {
  await comoNegocio(negocioId, (tx) =>
    tx
      .update(schema.reservas)
      .set({ status: "cancelada" })
      .where(eq(schema.reservas.id, reservaId)),
  );
}

const esquemaRegras = z.object({
  intervaloMin: z.coerce.number().int().min(5).max(120),
  folgaMin: z.coerce.number().int().min(0).max(120),
  antecedenciaMin: z.coerce.number().int().min(0).max(7 * 24 * 60),
  janelaDias: z.coerce.number().int().min(1).max(180),
  fuso: z.string().refine((f) => {
    try {
      new Intl.DateTimeFormat("pt-BR", { timeZone: f });
      return true;
    } catch {
      return false;
    }
  }, "Fuso horário inválido."),
});

export async function salvarRegras(negocioId: string, entrada: z.input<typeof esquemaRegras>): Promise<Resultado> {
  const v = esquemaRegras.safeParse(entrada);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Valores inválidos." };
  await comoNegocio(negocioId, (tx) => tx.update(schema.negocios).set(v.data).where(eq(schema.negocios.id, negocioId)));
  return { ok: true };
}
