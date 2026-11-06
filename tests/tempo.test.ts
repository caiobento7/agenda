import { describe, expect, it } from "vitest";
import { diaDaSemana, ehDataValida, horaParaMinutos, instanteLocal, partesLocais, somarDias } from "../src/lib/tempo.ts";

describe("instanteLocal", () => {
  it("converte o horário de São Paulo (UTC-3) para o instante certo", () => {
    expect(instanteLocal("2026-11-10", 9 * 60, "America/Sao_Paulo")?.toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });

  it("volta para as mesmas partes locais", () => {
    const inicio = instanteLocal("2026-11-10", 13 * 60 + 30, "America/Sao_Paulo")!;
    expect(partesLocais(inicio, "America/Sao_Paulo")).toEqual({ data: "2026-11-10", minutos: 810, diaSemana: 2 });
  });

  it("acompanha o horário de verão: Nova York muda de UTC-4 para UTC-5", () => {
    expect(instanteLocal("2026-10-30", 9 * 60, "America/New_York")?.toISOString()).toBe("2026-10-30T13:00:00.000Z");
    expect(instanteLocal("2026-11-02", 9 * 60, "America/New_York")?.toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("devolve null para um horário que não existe (o relógio pula de 2h para 3h)", () => {
    expect(instanteLocal("2026-03-08", 2 * 60 + 30, "America/New_York")).toBeNull();
  });

  it("perto da meia-noite o dia local é diferente do dia em UTC", () => {
    const instante = new Date("2026-11-11T01:30:00Z");
    expect(partesLocais(instante, "America/Sao_Paulo").data).toBe("2026-11-10");
  });
});

describe("datas", () => {
  it("soma dias atravessando o mês e o ano", () => {
    expect(somarDias("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("dia da semana", () => {
    expect(diaDaSemana("2026-11-08")).toBe(0);
    expect(diaDaSemana("2026-11-14")).toBe(6);
  });

  it("valida data", () => {
    expect(ehDataValida("2026-02-28")).toBe(true);
    expect(ehDataValida("2026-02-30")).toBe(false);
    expect(ehDataValida("10/11/2026")).toBe(false);
  });

  it("lê hora digitada", () => {
    expect(horaParaMinutos("9:00")).toBe(540);
    expect(horaParaMinutos("18:30")).toBe(1110);
    expect(horaParaMinutos("24:00")).toBe(1440);
    expect(horaParaMinutos("25:00")).toBeNull();
    expect(horaParaMinutos("9h")).toBeNull();
  });
});
