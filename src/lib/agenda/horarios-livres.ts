import { diaDaSemana, instanteLocal, partesLocais, somarDias } from "../tempo.ts";

export type Faixa = { diaSemana: number; inicioMin: number; fimMin: number };
export type Intervalo = { inicio: Date; fim: Date };

export type RegrasAgenda = {
  fuso: string;
  expediente: Faixa[];
  /** De quanto em quanto tempo começa um horário oferecido. */
  intervaloMin: number;
  /** Tempo livre depois de cada atendimento. */
  folgaMin: number;
  /** Antecedência mínima para reservar, em minutos. */
  antecedenciaMin: number;
  /** Até quantos dias à frente a agenda fica aberta. */
  janelaDias: number;
};

export type PedidoHorarios = RegrasAgenda & {
  /** Dia pedido, AAAA-MM-DD no fuso do negócio. */
  data: string;
  duracaoMin: number;
  /** Reservas que seguram horário (já com a folga) e bloqueios. */
  ocupados: Intervalo[];
  agora: Date;
};

export type Horario = { inicio: Date; fim: Date; ocupadoAte: Date };

/** Mesma regra usada no banco: [início, fim) se sobrepõe a [início, fim) quando um começa antes do outro acabar. */
export function sobrepoe(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fim && b.inicio < a.fim;
}

/**
 * Horários em que o serviço cabe no dia pedido. É uma função pura: recebe tudo o que precisa e
 * não consulta banco nem relógio, o que deixa os testes simples e determinísticos.
 *
 * Um horário entra na lista quando:
 * - o atendimento inteiro cabe numa faixa do expediente daquele dia da semana;
 * - começa depois da antecedência mínima e dentro da janela de dias aberta;
 * - o atendimento mais a folga não encosta em nenhuma reserva ou bloqueio.
 */
export function horariosLivres(p: PedidoHorarios): Horario[] {
  const hoje = partesLocais(p.agora, p.fuso).data;
  if (p.data < hoje || p.data > somarDias(hoje, p.janelaDias)) return [];

  const limite = p.agora.getTime() + p.antecedenciaMin * 60_000;
  const passo = Math.max(5, p.intervaloMin);
  const dia = diaDaSemana(p.data);
  const vistos = new Set<number>();
  const livres: Horario[] = [];

  for (const faixa of p.expediente.filter((f) => f.diaSemana === dia)) {
    for (let m = faixa.inicioMin; m + p.duracaoMin <= faixa.fimMin; m += passo) {
      const inicio = instanteLocal(p.data, m, p.fuso);
      if (!inicio || inicio.getTime() < limite || vistos.has(inicio.getTime())) continue;

      const fim = new Date(inicio.getTime() + p.duracaoMin * 60_000);
      const ocupadoAte = new Date(fim.getTime() + p.folgaMin * 60_000);
      if (p.ocupados.some((o) => sobrepoe({ inicio, fim: ocupadoAte }, o))) continue;

      vistos.add(inicio.getTime());
      livres.push({ inicio, fim, ocupadoAte });
    }
  }
  return livres.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Os próximos dias da janela, marcando os que têm expediente. */
export function diasDaJanela(regras: Pick<RegrasAgenda, "fuso" | "expediente" | "janelaDias">, agora: Date) {
  const hoje = partesLocais(agora, regras.fuso).data;
  const abertos = new Set(regras.expediente.map((f) => f.diaSemana));
  return Array.from({ length: regras.janelaDias + 1 }, (_, i) => {
    const data = somarDias(hoje, i);
    return { data, aberto: abertos.has(diaDaSemana(data)) };
  });
}
