import { describe, expect, it } from "vitest";
import { diasDaJanela, horariosLivres, type PedidoHorarios } from "../src/lib/agenda/horarios-livres.ts";
import { instanteLocal } from "../src/lib/tempo.ts";

const SP = "America/Sao_Paulo";
const em = (data: string, hora: string, fuso = SP) => {
  const [h, m] = hora.split(":").map(Number);
  return instanteLocal(data, h * 60 + m, fuso)!;
};
const horas = (lista: { inicio: Date }[], fuso = SP) =>
  lista.map((h) => new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" }).format(h.inicio));

// Terça, 10/11/2026. Expediente de terça: 9h às 12h e 13h às 18h.
const base: PedidoHorarios = {
  fuso: SP,
  data: "2026-11-10",
  expediente: [
    { diaSemana: 2, inicioMin: 9 * 60, fimMin: 12 * 60 },
    { diaSemana: 2, inicioMin: 13 * 60, fimMin: 18 * 60 },
  ],
  intervaloMin: 30,
  folgaMin: 0,
  antecedenciaMin: 60,
  janelaDias: 30,
  duracaoMin: 60,
  ocupados: [],
  agora: em("2026-11-09", "20:00"),
};

describe("horariosLivres", () => {
  it("oferece os horários em que o serviço inteiro cabe no expediente", () => {
    expect(horas(horariosLivres(base))).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00",
      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
    ]);
  });

  it("tira os horários que encostam numa reserva", () => {
    const livres = horariosLivres({ ...base, ocupados: [{ inicio: em("2026-11-10", "10:00"), fim: em("2026-11-10", "11:00") }] });
    // 9:30 acabaria às 10:30, dentro da reserva; 11:00 começa exatamente quando ela termina.
    expect(horas(livres).slice(0, 3)).toEqual(["09:00", "11:00", "13:00"]);
  });

  it("respeita a folga depois de cada atendimento", () => {
    const livres = horariosLivres({
      ...base,
      folgaMin: 15,
      ocupados: [{ inicio: em("2026-11-10", "11:00"), fim: em("2026-11-10", "12:00") }],
    });
    // 9:30 + 60min + 15min de folga = 10:45, ainda livre; 10:00 terminaria a folga às 11:15.
    expect(horas(livres).slice(0, 3)).toEqual(["09:00", "09:30", "13:00"]);
    expect(livres[0].ocupadoAte.toISOString()).toBe(em("2026-11-10", "10:15").toISOString());
  });

  it("não oferece nada antes da antecedência mínima", () => {
    const livres = horariosLivres({ ...base, agora: em("2026-11-10", "13:10"), antecedenciaMin: 120 });
    expect(horas(livres)[0]).toBe("15:30");
  });

  it("dia sem expediente fica vazio", () => {
    expect(horariosLivres({ ...base, data: "2026-11-08" })).toEqual([]);
  });

  it("não oferece dias passados nem além da janela", () => {
    expect(horariosLivres({ ...base, data: "2026-11-03" })).toEqual([]);
    expect(horariosLivres({ ...base, janelaDias: 0 })).toEqual([]);
  });

  it("bloqueio de agenda funciona igual a uma reserva", () => {
    const livres = horariosLivres({ ...base, ocupados: [{ inicio: em("2026-11-10", "13:00"), fim: em("2026-11-10", "18:00") }] });
    expect(horas(livres).at(-1)).toBe("11:00");
  });

  it("guarda os horários em UTC, prontos para o banco", () => {
    expect(horariosLivres(base)[0].inicio.toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });

  it("no dia em que o horário de verão começa, pula o horário que não existe", () => {
    const ny = "America/New_York";
    const livres = horariosLivres({
      ...base,
      fuso: ny,
      data: "2026-03-08",
      expediente: [{ diaSemana: 0, inicioMin: 60, fimMin: 4 * 60 }],
      intervaloMin: 30,
      duracaoMin: 30,
      agora: em("2026-03-07", "12:00", ny),
    });
    expect(horas(livres, ny)).toEqual(["01:00", "01:30", "03:00", "03:30"]);
  });
});

describe("diasDaJanela", () => {
  it("lista os dias abertos e fechados a partir de hoje", () => {
    const dias = diasDaJanela({ fuso: SP, expediente: base.expediente, janelaDias: 6 }, em("2026-11-09", "20:00"));
    expect(dias.map((d) => `${d.data.slice(8)}${d.aberto ? "" : "x"}`)).toEqual(["09x", "10", "11x", "12x", "13x", "14x", "15x"]);
  });
});
