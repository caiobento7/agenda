/**
 * Datas no fuso do negócio, só com a API Intl do JavaScript.
 *
 * O expediente é cadastrado em horário local ("seg a sex, 9h às 18h em São Paulo"), mas as
 * reservas são guardadas como instantes absolutos (timestamptz). Estas funções fazem a ponte,
 * inclusive em fusos com horário de verão, onde um dia pode ter 23 ou 25 horas.
 */

export type PartesLocais = {
  /** AAAA-MM-DD no fuso do negócio. */
  data: string;
  /** Minutos desde a meia-noite local. */
  minutos: number;
  /** 0 = domingo ... 6 = sábado. */
  diaSemana: number;
};

const formatadores = new Map<string, Intl.DateTimeFormat>();

function formatador(fuso: string) {
  let f = formatadores.get(fuso);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: fuso,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatadores.set(fuso, f);
  }
  return f;
}

function campos(instante: Date, fuso: string) {
  const p = Object.fromEntries(formatador(fuso).formatToParts(instante).map((x) => [x.type, x.value]));
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, minuto: +p.minute, segundo: +p.second };
}

export function partesLocais(instante: Date, fuso: string): PartesLocais {
  const c = campos(instante, fuso);
  const data = `${c.ano}-${String(c.mes).padStart(2, "0")}-${String(c.dia).padStart(2, "0")}`;
  return { data, minutos: c.hora * 60 + c.minuto, diaSemana: diaDaSemana(data) };
}

/** Quantos minutos o fuso está adiantado em relação ao UTC naquele instante (São Paulo: -180). */
function deslocamentoMin(instante: Date, fuso: string) {
  const c = campos(instante, fuso);
  const comoSeFosseUtc = Date.UTC(c.ano, c.mes - 1, c.dia, c.hora, c.minuto, c.segundo);
  return Math.round((comoSeFosseUtc - Math.floor(instante.getTime() / 1000) * 1000) / 60000);
}

/**
 * O instante em que o relógio do negócio marca `data` às `minutos` da meia-noite.
 * Devolve null se esse horário não existe naquele dia (o pulo do início do horário de verão).
 */
export function instanteLocal(data: string, minutos: number, fuso: string): Date | null {
  const [ano, mes, dia] = data.split("-").map(Number);
  const ingenuo = Date.UTC(ano, mes - 1, dia, 0, minutos);
  // Duas passadas acertam o deslocamento mesmo quando ele muda perto do horário pedido.
  let palpite = ingenuo - deslocamentoMin(new Date(ingenuo), fuso) * 60000;
  palpite = ingenuo - deslocamentoMin(new Date(palpite), fuso) * 60000;
  const resultado = new Date(palpite);
  const conferido = partesLocais(resultado, fuso);
  return conferido.data === data && conferido.minutos === minutos ? resultado : null;
}

export function diaDaSemana(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function somarDias(data: string, dias: number): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia + dias)).toISOString().slice(0, 10);
}

export function ehDataValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  return somarDias(data, 0) === data;
}

export function formatarHora(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(instante);
}

export function formatarDataLonga(instante: Date, fuso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, weekday: "long", day: "numeric", month: "long" }).format(
    instante,
  );
}

export function minutosParaHora(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function horaParaMinutos(hora: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}
