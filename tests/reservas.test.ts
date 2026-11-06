import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { codigoPg, comoNegocio, schema } from "../src/db/index.ts";
import { caixaDeSaida } from "../src/lib/email.ts";
import { usarProvedor } from "../src/lib/pagamentos/index.ts";
import { provedorSimulado, simularPagamento } from "../src/lib/pagamentos/simulado.ts";
import { agendaPublica, confirmarPagamento, criarReserva, enviarLembretes, ErroReserva } from "../src/lib/reservas.ts";
import { AGORA, as, bancoLimpo, minutosDepois, negocioDeTeste, pagamentoDa, provedorFalso, reservaPorId, TERCA } from "./ajuda.ts";

let pix: ReturnType<typeof provedorFalso>;
let ctx: Awaited<ReturnType<typeof negocioDeTeste>>;
const cliente = (nome = "Ana") => ({ nome, email: `${nome.toLowerCase()}@cliente.dev`, telefone: "21999990000" });

beforeEach(async () => {
  await bancoLimpo();
  caixaDeSaida.length = 0;
  pix = provedorFalso();
  usarProvedor(pix.provedor);
  ctx = await negocioDeTeste();
});
afterEach(() => usarProvedor(null));

const reservar = (inicio: Date, servicoId = ctx.comSinal.id, nome = "Ana", agora = AGORA) =>
  criarReserva(ctx.negocio.slug, { servicoId, inicio: inicio.toISOString(), ...cliente(nome) }, agora);

describe("criar reserva", () => {
  it("com sinal: fica pendente segurando o horário por 15 minutos e ganha um Pix", async () => {
    const { id } = await reservar(as("10:00"));

    const reserva = await reservaPorId(id);
    expect(reserva.status).toBe("pendente");
    expect(reserva.expiraEm).toEqual(minutosDepois(AGORA, 15));
    expect(reserva.fim).toEqual(as("10:45"));
    const pagamento = await pagamentoDa(id);
    expect(pagamento).toMatchObject({ status: "pendente", valorCentavos: 2000, provedor: "falso", pixCopiaECola: "pix-pag_1" });
  });

  it("sem sinal: já nasce confirmada e o cliente recebe o e-mail", async () => {
    const { id } = await reservar(as("10:00"), ctx.semSinal.id);

    expect((await reservaPorId(id)).status).toBe("confirmada");
    expect(await pagamentoDa(id)).toBeUndefined();
    expect(caixaDeSaida).toHaveLength(1);
    expect(caixaDeSaida[0].assunto).toBe("Reserva confirmada: Barba em Negócio barbearia-teste");
    expect(caixaDeSaida[0].texto).toContain("terça-feira, 10 de novembro, às 10:00");
  });

  it("recusa horário fora do expediente, fora da grade ou no passado", async () => {
    for (const inicio of [as("08:00"), as("12:00"), as("10:07"), as("10:00", "2026-11-09")]) {
      await expect(reservar(inicio)).rejects.toMatchObject({ codigo: "horario_indisponivel" });
    }
  });

  it("recusa dados inválidos", async () => {
    await expect(
      criarReserva(ctx.negocio.slug, { servicoId: ctx.comSinal.id, inicio: as("10:00").toISOString(), nome: "A", email: "x" }, AGORA),
    ).rejects.toBeInstanceOf(ErroReserva);
  });

  it("o horário pendente fica indisponível para o próximo cliente", async () => {
    await reservar(as("10:00"));
    await expect(reservar(as("10:30"), ctx.comSinal.id, "Bruno")).rejects.toMatchObject({ codigo: "horario_indisponivel" });
    // 10:45 começa quando o primeiro atendimento termina.
    await expect(reservar(as("10:45"), ctx.comSinal.id, "Bruno")).resolves.toHaveProperty("id");
  });

  it("pendente sem pagamento libera o horário depois de 15 minutos", async () => {
    const primeira = await reservar(as("10:00"));
    const depois = minutosDepois(AGORA, 16);

    const segunda = await reservar(as("10:00"), ctx.comSinal.id, "Bruno", depois);

    expect((await reservaPorId(primeira.id)).status).toBe("expirada");
    expect((await reservaPorId(segunda.id)).status).toBe("pendente");
  });

  it("cinco pessoas no mesmo horário ao mesmo tempo: só uma consegue", async () => {
    const tentativas = await Promise.allSettled(
      ["Ana", "Bia", "Caio", "Davi", "Eva"].map((n) => reservar(as("14:00"), ctx.comSinal.id, n)),
    );

    expect(tentativas.filter((t) => t.status === "fulfilled")).toHaveLength(1);
    for (const t of tentativas) {
      if (t.status === "rejected") expect(t.reason).toMatchObject({ codigo: "horario_indisponivel" });
    }
  });

  it("o banco recusa sobreposição mesmo se o código pular a checagem", async () => {
    await reservar(as("10:00"));
    const inserirDireto = comoNegocio(ctx.negocio.id, (tx) =>
      tx.insert(schema.reservas).values({
        negocioId: ctx.negocio.id,
        servicoId: ctx.comSinal.id,
        clienteNome: "Intrusa",
        clienteEmail: "i@x.dev",
        inicio: as("10:30"),
        fim: as("11:15"),
        ocupadoAte: as("11:15"),
        status: "confirmada",
        sinalCentavos: 0,
      }),
    );
    await expect(inserirDireto.then(() => "inseriu", codigoPg)).resolves.toBe("23P01");
  });

  it("a folga do negócio entra no tempo ocupado", async () => {
    await comoNegocio(ctx.negocio.id, (tx) =>
      tx.update(schema.negocios).set({ folgaMin: 15 }).where(eq(schema.negocios.id, ctx.negocio.id)),
    );
    await reservar(as("10:00"));
    await expect(reservar(as("10:45"), ctx.comSinal.id, "Bruno")).rejects.toMatchObject({ codigo: "horario_indisponivel" });
    await expect(reservar(as("11:00"), ctx.comSinal.id, "Bruno")).resolves.toHaveProperty("id");
  });

  it("bloqueio na agenda tira os horários", async () => {
    await comoNegocio(ctx.negocio.id, (tx) =>
      tx.insert(schema.bloqueios).values({ negocioId: ctx.negocio.id, inicio: as("13:00"), fim: as("19:00"), motivo: "Médico" }),
    );
    await expect(reservar(as("14:00"))).rejects.toMatchObject({ codigo: "horario_indisponivel" });
  });

  it("se o Pix não puder ser gerado, a reserva é cancelada e o horário volta", async () => {
    usarProvedor({ ...pix.provedor, criarCobrancaPix: () => Promise.reject(new Error("fora do ar")) });
    await expect(reservar(as("10:00"))).rejects.toMatchObject({ codigo: "pagamento_indisponivel" });
    usarProvedor(pix.provedor);
    await expect(reservar(as("10:00"), ctx.comSinal.id, "Bruno")).resolves.toHaveProperty("id");
  });
});

describe("página pública", () => {
  it("mostra só os horários livres do serviço escolhido", async () => {
    await reservar(as("09:00"));
    const agenda = await agendaPublica(ctx.negocio.slug, { servicoId: ctx.comSinal.id, data: TERCA }, AGORA);

    expect(agenda?.servicos.map((s) => s.nome)).toEqual(["Barba", "Corte"]);
    const horas = agenda!.horarios.map((h) => h.inicio.toISOString());
    expect(horas).not.toContain(as("09:00").toISOString());
    expect(horas).not.toContain(as("09:30").toISOString());
    expect(horas[0]).toBe(as("09:45").toISOString());
  });

  it("endereço inexistente devolve null", async () => {
    expect(await agendaPublica("nao-existe", {}, AGORA)).toBeNull();
  });
});

describe("confirmação do pagamento (webhook)", () => {
  it("pagamento aprovado confirma a reserva e manda o e-mail", async () => {
    const { id } = await reservar(as("10:00"));
    pix.pagar("pag_1");

    expect(await confirmarPagamento("pag_1", minutosDepois(AGORA, 3))).toBe("confirmada");

    const reserva = await reservaPorId(id);
    expect(reserva.status).toBe("confirmada");
    expect(reserva.expiraEm).toBeNull();
    expect((await pagamentoDa(id)).status).toBe("pago");
    expect(caixaDeSaida.map((e) => e.assunto)).toEqual(["Reserva confirmada: Corte em Negócio barbearia-teste"]);
  });

  it("o mesmo aviso repetido confirma uma vez só", async () => {
    await reservar(as("10:00"));
    pix.pagar("pag_1");

    const resultados = [];
    for (let i = 0; i < 3; i++) resultados.push(await confirmarPagamento("pag_1"));

    expect(resultados).toEqual(["confirmada", "ja_processado", "ja_processado"]);
    expect(caixaDeSaida).toHaveLength(1);
  });

  it("avisos simultâneos também confirmam uma vez só", async () => {
    await reservar(as("10:00"));
    pix.pagar("pag_1");

    const resultados = await Promise.all([1, 2, 3, 4].map(() => confirmarPagamento("pag_1")));

    expect(resultados.filter((r) => r === "confirmada")).toHaveLength(1);
    expect(caixaDeSaida).toHaveLength(1);
  });

  it("não confirma se o provedor diz que ainda não foi pago", async () => {
    const { id } = await reservar(as("10:00"));
    expect(await confirmarPagamento("pag_1")).toBe("nao_aprovado");
    expect((await reservaPorId(id)).status).toBe("pendente");
  });

  it("não confirma pagamento com valor menor que o sinal", async () => {
    const { id } = await reservar(as("10:00"));
    pix.pagar("pag_1", { valorCentavos: 100 });
    expect(await confirmarPagamento("pag_1")).toBe("valor_divergente");
    expect((await reservaPorId(id)).status).toBe("pendente");
  });

  it("aviso de pagamento que não é nosso é ignorado", async () => {
    expect(await confirmarPagamento("pag_999")).toBe("desconhecido");
  });

  it("Pix pago depois do prazo ainda confirma se o horário continua livre", async () => {
    const { id } = await reservar(as("10:00"));
    await reservar(as("15:00"), ctx.comSinal.id, "Bruno", minutosDepois(AGORA, 20)); // faz a primeira vencer
    expect((await reservaPorId(id)).status).toBe("expirada");

    pix.pagar("pag_1");
    expect(await confirmarPagamento("pag_1")).toBe("confirmada");
  });

  it("Pix pago depois que outra pessoa pegou o horário vira conflito, para devolver o sinal", async () => {
    const { id } = await reservar(as("10:00"));
    await reservar(as("10:00"), ctx.semSinal.id, "Bruno", minutosDepois(AGORA, 20));

    pix.pagar("pag_1");
    expect(await confirmarPagamento("pag_1")).toBe("conflito");

    expect((await reservaPorId(id)).status).toBe("conflito");
    expect((await pagamentoDa(id)).status).toBe("pago");
  });

  it("fluxo completo com o provedor simulado", async () => {
    usarProvedor(provedorSimulado);
    const { id } = await reservar(as("10:00"));
    const pagamento = await pagamentoDa(id);
    expect(pagamento.provedor).toBe("simulado");
    expect(pagamento.pixQrBase64.length).toBeGreaterThan(100);

    expect(await confirmarPagamento(pagamento.provedorId)).toBe("nao_aprovado");
    expect(await simularPagamento(pagamento.provedorId, AGORA)).toBe(true);
    expect(await confirmarPagamento(pagamento.provedorId)).toBe("confirmada");
  });
});

describe("isolamento entre negócios (RLS)", () => {
  it("um negócio não enxerga nem altera dados de outro", async () => {
    const outro = await negocioDeTeste("estudio-b");
    await reservar(as("10:00"), ctx.semSinal.id);
    await criarReserva(outro.negocio.slug, { servicoId: outro.semSinal.id, inicio: as("10:00").toISOString(), ...cliente("Bia") }, AGORA);

    await comoNegocio(ctx.negocio.id, async (tx) => {
      const reservas = await tx.select({ negocioId: schema.reservas.negocioId }).from(schema.reservas);
      expect(reservas.map((r) => r.negocioId)).toEqual([ctx.negocio.id]);

      const servicoDoOutro = await tx.select().from(schema.servicos).where(eq(schema.servicos.id, outro.semSinal.id));
      expect(servicoDoOutro).toEqual([]);

      const alterados = await tx
        .update(schema.servicos)
        .set({ precoCentavos: 1 })
        .where(eq(schema.servicos.id, outro.semSinal.id))
        .returning();
      expect(alterados).toEqual([]);
    });

    const inserirNoOutro = comoNegocio(ctx.negocio.id, (tx) =>
      tx.insert(schema.servicos).values({ negocioId: outro.negocio.id, nome: "Invasão", duracaoMin: 30, precoCentavos: 1 }),
    );
    await expect(inserirNoOutro.then(() => "inseriu", codigoPg)).resolves.toBe("42501");

    const [servico] = await comoNegocio(outro.negocio.id, (tx) =>
      tx.select().from(schema.servicos).where(eq(schema.servicos.id, outro.semSinal.id)),
    );
    expect(servico.precoCentavos).toBe(4000);
  });
});

describe("lembretes", () => {
  it("manda um lembrete por reserva confirmada das próximas 24 horas, uma vez só", async () => {
    await reservar(as("10:00"), ctx.semSinal.id, "Ana"); // amanhã de manhã: entra
    await reservar(as("10:00", "2026-11-12"), ctx.semSinal.id, "Bia"); // daqui a 2 dias: fica para depois
    const pendente = await reservar(as("14:00"), ctx.comSinal.id, "Caio"); // não pagou: sem lembrete
    expect((await reservaPorId(pendente.id)).status).toBe("pendente");
    caixaDeSaida.length = 0;

    expect(await enviarLembretes(AGORA)).toEqual({ enviados: 1, falhas: 0 });
    expect(caixaDeSaida.map((e) => e.para)).toEqual(["ana@cliente.dev"]);
    expect(await enviarLembretes(minutosDepois(AGORA, 60))).toEqual({ enviados: 0, falhas: 0 });
  });
});
