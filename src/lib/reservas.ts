import { and, asc, eq, gt, inArray, isNull, lt, lte, or } from "drizzle-orm";
import { z } from "zod";
import { codigoPg, comoNegocio, comoSistema, schema, VIOLA_SOBREPOSICAO, type Tx } from "../db/index.ts";
import { diasDaJanela, horariosLivres, type Intervalo, type RegrasAgenda } from "./agenda/horarios-livres.ts";
import { formatarReais } from "./dinheiro.ts";
import { enviarEmail } from "./email.ts";
import { provedorAtual } from "./pagamentos/index.ts";
import { formatarDataLonga, formatarHora, instanteLocal, partesLocais, somarDias } from "./tempo.ts";

/** Por quanto tempo uma reserva pendente segura o horário esperando o Pix. */
export const PRAZO_PIX_MIN = 15;

export type CodigoErroReserva =
  | "negocio_inexistente"
  | "servico_invalido"
  | "dados_invalidos"
  | "horario_indisponivel"
  | "pagamento_indisponivel";

export class ErroReserva extends Error {
  constructor(
    readonly codigo: CodigoErroReserva,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

type Negocio = typeof schema.negocios.$inferSelect;

export async function negocioPorSlug(slug: string): Promise<Negocio | null> {
  const [n] = await comoSistema((tx) => tx.select().from(schema.negocios).where(eq(schema.negocios.slug, slug)));
  return n ?? null;
}

async function regrasDoNegocio(tx: Tx, n: Negocio): Promise<RegrasAgenda> {
  const expediente = await tx
    .select({ diaSemana: schema.expedientes.diaSemana, inicioMin: schema.expedientes.inicioMin, fimMin: schema.expedientes.fimMin })
    .from(schema.expedientes);
  return {
    fuso: n.fuso,
    expediente,
    intervaloMin: n.intervaloMin,
    folgaMin: n.folgaMin,
    antecedenciaMin: n.antecedenciaMin,
    janelaDias: n.janelaDias,
  };
}

/** Reservas que seguram horário e bloqueios que encostam no dia pedido (com um dia de folga por causa do fuso). */
async function ocupadosNoDia(tx: Tx, n: Negocio, data: string, agora: Date): Promise<Intervalo[]> {
  const de = instanteLocal(somarDias(data, -1), 0, n.fuso) ?? new Date(`${data}T00:00:00Z`);
  const ate = instanteLocal(somarDias(data, 2), 0, n.fuso) ?? new Date(`${somarDias(data, 2)}T00:00:00Z`);
  const r = schema.reservas;
  const reservas = await tx
    .select({ inicio: r.inicio, fim: r.ocupadoAte })
    .from(r)
    .where(
      and(
        lt(r.inicio, ate),
        gt(r.ocupadoAte, de),
        or(eq(r.status, "confirmada"), and(eq(r.status, "pendente"), gt(r.expiraEm, agora))),
      ),
    );
  const b = schema.bloqueios;
  const bloqueios = await tx.select({ inicio: b.inicio, fim: b.fim }).from(b).where(and(lt(b.inicio, ate), gt(b.fim, de)));
  return [...reservas, ...bloqueios];
}

/** Tudo o que a página pública precisa: serviços, dias abertos e horários livres do dia escolhido. */
export async function agendaPublica(slug: string, escolha: { servicoId?: string; data?: string }, agora = new Date()) {
  const negocio = await negocioPorSlug(slug);
  if (!negocio) return null;
  return comoNegocio(negocio.id, async (tx) => {
    const servicos = await tx
      .select()
      .from(schema.servicos)
      .where(eq(schema.servicos.ativo, true))
      .orderBy(asc(schema.servicos.precoCentavos));
    const regras = await regrasDoNegocio(tx, negocio);
    const dias = diasDaJanela(regras, agora);
    const servico = servicos.find((s) => s.id === escolha.servicoId) ?? null;
    const data = dias.some((d) => d.data === escolha.data) ? escolha.data! : null;
    const horarios =
      servico && data
        ? horariosLivres({ ...regras, data, duracaoMin: servico.duracaoMin, ocupados: await ocupadosNoDia(tx, negocio, data, agora), agora })
        : [];
    return { negocio, servicos, dias, servico, data, horarios };
  });
}

const dadosReserva = z.object({
  servicoId: z.uuid(),
  inicio: z.iso.datetime({ offset: true }),
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.email("E-mail inválido.").max(120),
  telefone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((t) => t || null),
});

export type DadosReserva = z.input<typeof dadosReserva>;

/**
 * Cria a reserva. Com sinal, ela fica pendente segurando o horário por PRAZO_PIX_MIN minutos e
 * recebe uma cobrança Pix; sem sinal, já nasce confirmada.
 *
 * O horário é conferido de novo aqui (não dá para confiar no que veio da tela), e a constraint de
 * exclusão do banco resolve a corrida entre duas pessoas reservando o mesmo horário ao mesmo tempo.
 */
export async function criarReserva(slug: string, entrada: DadosReserva, agora = new Date()): Promise<{ id: string }> {
  const validado = dadosReserva.safeParse(entrada);
  if (!validado.success) throw new ErroReserva("dados_invalidos", validado.error.issues[0]?.message ?? "Dados inválidos.");
  const dados = validado.data;

  const negocio = await negocioPorSlug(slug);
  if (!negocio) throw new ErroReserva("negocio_inexistente", "Agenda não encontrada.");
  const inicio = new Date(dados.inicio);

  let criada: { reserva: typeof schema.reservas.$inferSelect; servico: typeof schema.servicos.$inferSelect };
  try {
    criada = await comoNegocio(negocio.id, async (tx) => {
      // Pendentes vencidas deixam de segurar o horário (a constraint do banco só olha o status).
      await tx
        .update(schema.reservas)
        .set({ status: "expirada" })
        .where(and(eq(schema.reservas.status, "pendente"), lte(schema.reservas.expiraEm, agora)));

      const [servico] = await tx
        .select()
        .from(schema.servicos)
        .where(and(eq(schema.servicos.id, dados.servicoId), eq(schema.servicos.ativo, true)));
      if (!servico) throw new ErroReserva("servico_invalido", "Serviço não encontrado.");

      const regras = await regrasDoNegocio(tx, negocio);
      const data = partesLocais(inicio, negocio.fuso).data;
      const livres = horariosLivres({
        ...regras,
        data,
        duracaoMin: servico.duracaoMin,
        ocupados: await ocupadosNoDia(tx, negocio, data, agora),
        agora,
      });
      const horario = livres.find((h) => h.inicio.getTime() === inicio.getTime());
      if (!horario) throw new ErroReserva("horario_indisponivel", "Esse horário não está mais disponível.");

      const comSinal = servico.sinalCentavos > 0;
      const [reserva] = await tx
        .insert(schema.reservas)
        .values({
          negocioId: negocio.id,
          servicoId: servico.id,
          clienteNome: dados.nome,
          clienteEmail: dados.email,
          clienteTelefone: dados.telefone,
          inicio: horario.inicio,
          fim: horario.fim,
          ocupadoAte: horario.ocupadoAte,
          status: comSinal ? "pendente" : "confirmada",
          sinalCentavos: servico.sinalCentavos,
          expiraEm: comSinal ? new Date(agora.getTime() + PRAZO_PIX_MIN * 60_000) : null,
          confirmadaEm: comSinal ? null : agora,
        })
        .returning();
      return { reserva, servico };
    });
  } catch (erro) {
    if (codigoPg(erro) === VIOLA_SOBREPOSICAO) {
      throw new ErroReserva("horario_indisponivel", "Alguém acabou de reservar esse horário. Escolha outro.");
    }
    throw erro;
  }

  const { reserva, servico } = criada;
  if (reserva.status === "confirmada") {
    await avisarConfirmacao(reserva.id);
    return { id: reserva.id };
  }

  // A chamada ao provedor fica fora da transação: não seguramos o banco esperando a internet.
  const provedor = provedorAtual();
  try {
    const cobranca = await provedor.criarCobrancaPix({
      referencia: reserva.id,
      valorCentavos: reserva.sinalCentavos,
      descricao: `Sinal: ${servico.nome} - ${negocio.nome}`,
      emailPagador: reserva.clienteEmail,
      expiraEm: reserva.expiraEm!,
    });
    await comoNegocio(negocio.id, (tx) =>
      tx.insert(schema.pagamentos).values({
        negocioId: negocio.id,
        reservaId: reserva.id,
        provedor: provedor.nome,
        provedorId: cobranca.id,
        status: "pendente",
        valorCentavos: reserva.sinalCentavos,
        pixCopiaECola: cobranca.copiaECola,
        pixQrBase64: cobranca.qrCodeBase64,
        expiraEm: cobranca.expiraEm,
      }),
    );
  } catch (erro) {
    console.error("Falha ao criar a cobrança Pix", erro);
    await comoNegocio(negocio.id, (tx) =>
      tx.update(schema.reservas).set({ status: "cancelada" }).where(eq(schema.reservas.id, reserva.id)),
    );
    throw new ErroReserva("pagamento_indisponivel", "Não foi possível gerar o Pix agora. Tente de novo em instantes.");
  }
  return { id: reserva.id };
}

/** Página da reserva: o id (UUID aleatório) funciona como a senha de acesso a ela. */
export async function detalheReserva(id: string, agora = new Date()) {
  if (!z.uuid().safeParse(id).success) return null;
  const linhas = await comoSistema((tx) =>
    tx
      .select({
        reserva: schema.reservas,
        servico: { nome: schema.servicos.nome, duracaoMin: schema.servicos.duracaoMin, precoCentavos: schema.servicos.precoCentavos },
        negocio: { nome: schema.negocios.nome, slug: schema.negocios.slug, fuso: schema.negocios.fuso },
        pagamento: schema.pagamentos,
      })
      .from(schema.reservas)
      .innerJoin(schema.servicos, eq(schema.servicos.id, schema.reservas.servicoId))
      .innerJoin(schema.negocios, eq(schema.negocios.id, schema.reservas.negocioId))
      .leftJoin(schema.pagamentos, eq(schema.pagamentos.reservaId, schema.reservas.id))
      .where(eq(schema.reservas.id, id)),
  );
  const linha = linhas[0];
  if (!linha) return null;
  const { reserva } = linha;
  // Pendente vencida aparece como expirada mesmo antes de alguém atualizar a linha.
  const status = reserva.status === "pendente" && reserva.expiraEm && reserva.expiraEm <= agora ? "expirada" : reserva.status;
  return { ...linha, status };
}

export type ResultadoConfirmacao =
  | "confirmada"
  | "ja_processado"
  | "conflito"
  | "nao_aprovado"
  | "desconhecido"
  | "valor_divergente";

/**
 * Chamado pelo webhook (e pelo botão do modo simulado). Idempotente: o mesmo aviso chegando
 * várias vezes confirma a reserva uma vez só.
 *
 * Não confia no corpo do webhook: consulta o pagamento no provedor antes de confirmar.
 */
export async function confirmarPagamento(provedorId: string, agora = new Date()): Promise<ResultadoConfirmacao> {
  const provedor = provedorAtual();
  const situacao = await provedor.consultar(provedorId);

  const resultado = await comoSistema(async (tx): Promise<ResultadoConfirmacao> => {
    const [pagamento] = await tx
      .select()
      .from(schema.pagamentos)
      .where(and(eq(schema.pagamentos.provedor, provedor.nome), eq(schema.pagamentos.provedorId, provedorId)))
      .for("update");
    if (!pagamento) return "desconhecido";
    if (pagamento.status === "pago") return "ja_processado";

    if (situacao.status !== "aprovado") {
      if (situacao.status !== "pendente") {
        await tx.update(schema.pagamentos).set({ status: situacao.status === "expirado" ? "expirado" : "recusado" }).where(eq(schema.pagamentos.id, pagamento.id));
      }
      return "nao_aprovado";
    }
    if (situacao.referencia !== pagamento.reservaId || situacao.valorCentavos < pagamento.valorCentavos) {
      console.warn(`Pagamento ${provedorId} não confere com a reserva ${pagamento.reservaId}`, situacao);
      return "valor_divergente";
    }

    await tx
      .update(schema.pagamentos)
      .set({ status: "pago", pagoEm: situacao.pagoEm ?? agora })
      .where(eq(schema.pagamentos.id, pagamento.id));

    const [reserva] = await tx.select().from(schema.reservas).where(eq(schema.reservas.id, pagamento.reservaId)).for("update");
    if (reserva.status === "confirmada") return "ja_processado";

    // Se o Pix caiu depois do prazo, o horário pode ter sido pego por outra pessoa. O savepoint
    // deixa a constraint de sobreposição falhar sem perder o registro do pagamento.
    try {
      await tx.transaction((sp) =>
        sp
          .update(schema.reservas)
          .set({ status: "confirmada", confirmadaEm: agora, expiraEm: null })
          .where(eq(schema.reservas.id, reserva.id)),
      );
      return "confirmada";
    } catch (erro) {
      if (codigoPg(erro) !== VIOLA_SOBREPOSICAO) throw erro;
      await tx.update(schema.reservas).set({ status: "conflito" }).where(eq(schema.reservas.id, reserva.id));
      return "conflito";
    }
  });

  if (resultado === "confirmada") {
    const [p] = await comoSistema((tx) =>
      tx.select({ reservaId: schema.pagamentos.reservaId }).from(schema.pagamentos).where(eq(schema.pagamentos.provedorId, provedorId)),
    );
    await avisarConfirmacao(p.reservaId).catch((e) => console.error("Falha ao enviar a confirmação", e));
  }
  if (resultado === "conflito") {
    console.warn(`Pix ${provedorId} pago depois que o horário foi ocupado: o sinal precisa ser devolvido.`);
  }
  return resultado;
}

async function avisarConfirmacao(reservaId: string) {
  const d = await detalheReserva(reservaId);
  if (!d) return;
  const quando = `${formatarDataLonga(d.reserva.inicio, d.negocio.fuso)}, às ${formatarHora(d.reserva.inicio, d.negocio.fuso)}`;
  await enviarEmail({
    para: d.reserva.clienteEmail,
    assunto: `Reserva confirmada: ${d.servico.nome} em ${d.negocio.nome}`,
    texto: [
      `Olá, ${d.reserva.clienteNome}!`,
      ``,
      `Sua reserva de ${d.servico.nome} em ${d.negocio.nome} está confirmada para ${quando}.`,
      d.reserva.sinalCentavos > 0 ? `Recebemos o sinal de ${formatarReais(d.reserva.sinalCentavos)}.` : ``,
      ``,
      `Detalhes: ${process.env.APP_URL ?? ""}/${d.negocio.slug}/reserva/${d.reserva.id}`,
    ].join("\n"),
  });
}

/**
 * Lembrete por e-mail das reservas confirmadas das próximas 24 horas. Cada reserva é "reivindicada"
 * com um UPDATE ... RETURNING antes do envio, então duas execuções simultâneas não mandam o mesmo
 * lembrete duas vezes. Se o envio falhar, a reivindicação é desfeita e a próxima rodada tenta de novo.
 */
export async function enviarLembretes(agora = new Date()): Promise<{ enviados: number; falhas: number }> {
  const r = schema.reservas;
  const reivindicadas = await comoSistema((tx) =>
    tx
      .update(r)
      .set({ lembreteEnviadoEm: agora })
      .where(
        and(
          eq(r.status, "confirmada"),
          isNull(r.lembreteEnviadoEm),
          gt(r.inicio, agora),
          lte(r.inicio, new Date(agora.getTime() + 24 * 3_600_000)),
        ),
      )
      .returning({ id: r.id }),
  );

  let enviados = 0;
  let falhas = 0;
  for (const { id } of reivindicadas) {
    const d = await detalheReserva(id, agora);
    if (!d) continue;
    try {
      await enviarEmail({
        para: d.reserva.clienteEmail,
        assunto: `Lembrete: ${d.servico.nome} em ${d.negocio.nome}`,
        texto: `Olá, ${d.reserva.clienteNome}! Passando para lembrar do seu horário: ${formatarDataLonga(d.reserva.inicio, d.negocio.fuso)}, às ${formatarHora(d.reserva.inicio, d.negocio.fuso)}.`,
      });
      enviados++;
    } catch (erro) {
      falhas++;
      console.error(`Falha no lembrete da reserva ${id}`, erro);
      await comoSistema((tx) => tx.update(r).set({ lembreteEnviadoEm: null }).where(eq(r.id, id)));
    }
  }
  return { enviados, falhas };
}

/** Reservas do painel, do dia `de` até `ate` (inclusive), no fuso do negócio. */
export async function reservasDoPeriodo(negocioId: string, fuso: string, de: string, ate: string) {
  const inicio = instanteLocal(de, 0, fuso)!;
  const fim = instanteLocal(somarDias(ate, 1), 0, fuso)!;
  return comoNegocio(negocioId, (tx) =>
    tx
      .select({ reserva: schema.reservas, servico: { nome: schema.servicos.nome } })
      .from(schema.reservas)
      .innerJoin(schema.servicos, eq(schema.servicos.id, schema.reservas.servicoId))
      .where(
        and(
          gt(schema.reservas.inicio, new Date(inicio.getTime() - 1)),
          lt(schema.reservas.inicio, fim),
          inArray(schema.reservas.status, ["pendente", "confirmada", "conflito"]),
        ),
      )
      .orderBy(asc(schema.reservas.inicio)),
  );
}

