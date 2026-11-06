import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";

const criadoEm = () => timestamp("criado_em", { withTimezone: true }).notNull().defaultNow();

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: criadoEm(),
});

/** Cada negócio (barbearia, estúdio, personal) é um "inquilino": os dados dele ficam isolados por RLS. */
export const negocios = pgTable("negocios", {
  id: uuid("id").primaryKey().defaultRandom(),
  donoId: uuid("dono_id")
    .notNull()
    .references(() => usuarios.id),
  nome: text("nome").notNull(),
  slug: text("slug").notNull().unique(),
  /** Fuso IANA do negócio: o expediente é cadastrado no horário local dele. */
  fuso: text("fuso").notNull().default("America/Sao_Paulo"),
  /** De quanto em quanto tempo começa um horário oferecido (ex.: 9:00, 9:15, 9:30). */
  intervaloMin: smallint("intervalo_min").notNull().default(15),
  /** Tempo livre depois de cada atendimento (limpeza, deslocamento). */
  folgaMin: smallint("folga_min").notNull().default(0),
  /** Não aceita reserva para daqui a menos que isso. */
  antecedenciaMin: integer("antecedencia_min").notNull().default(60),
  /** Até quantos dias à frente a agenda fica aberta. */
  janelaDias: smallint("janela_dias").notNull().default(30),
  criadoEm: criadoEm(),
});

export const servicos = pgTable(
  "servicos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocios.id),
    nome: text("nome").notNull(),
    duracaoMin: smallint("duracao_min").notNull(),
    precoCentavos: integer("preco_centavos").notNull(),
    /** Sinal pago via Pix para garantir o horário. Zero = reserva confirmada na hora. */
    sinalCentavos: integer("sinal_centavos").notNull().default(0),
    ativo: boolean("ativo").notNull().default(true),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("servicos_negocio_idx").on(t.negocioId),
    check("servicos_duracao_ck", sql`${t.duracaoMin} between 5 and 600`),
    check("servicos_sinal_ck", sql`${t.sinalCentavos} between 0 and ${t.precoCentavos}`),
  ],
);

/** Expediente semanal, no horário local do negócio. Um dia pode ter mais de uma faixa (manhã e tarde). */
export const expedientes = pgTable(
  "expedientes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocios.id),
    /** 0 = domingo ... 6 = sábado. */
    diaSemana: smallint("dia_semana").notNull(),
    inicioMin: smallint("inicio_min").notNull(),
    fimMin: smallint("fim_min").notNull(),
  },
  (t) => [
    index("expedientes_negocio_idx").on(t.negocioId),
    check("expedientes_dia_ck", sql`${t.diaSemana} between 0 and 6`),
    check("expedientes_faixa_ck", sql`0 <= ${t.inicioMin} and ${t.inicioMin} < ${t.fimMin} and ${t.fimMin} <= 1440`),
  ],
);

/** Folgas, feriados e compromissos: períodos em que a agenda fica fechada. */
export const bloqueios = pgTable(
  "bloqueios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocios.id),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    motivo: text("motivo"),
  },
  (t) => [index("bloqueios_negocio_idx").on(t.negocioId), check("bloqueios_periodo_ck", sql`${t.inicio} < ${t.fim}`)],
);

export const STATUS_RESERVA = ["pendente", "confirmada", "expirada", "cancelada", "conflito"] as const;
export type StatusReserva = (typeof STATUS_RESERVA)[number];

export const reservas = pgTable(
  "reservas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocios.id),
    servicoId: uuid("servico_id")
      .notNull()
      .references(() => servicos.id),
    clienteNome: text("cliente_nome").notNull(),
    clienteEmail: text("cliente_email").notNull(),
    clienteTelefone: text("cliente_telefone"),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    /** Fim do atendimento mais a folga: é até aqui que o horário fica ocupado. */
    ocupadoAte: timestamp("ocupado_ate", { withTimezone: true }).notNull(),
    status: text("status", { enum: STATUS_RESERVA }).notNull(),
    sinalCentavos: integer("sinal_centavos").notNull(),
    /** Reserva pendente segura o horário só até aqui; depois disso o horário volta a ficar livre. */
    expiraEm: timestamp("expira_em", { withTimezone: true }),
    confirmadaEm: timestamp("confirmada_em", { withTimezone: true }),
    lembreteEnviadoEm: timestamp("lembrete_enviado_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [
    index("reservas_negocio_inicio_idx").on(t.negocioId, t.inicio),
    check("reservas_periodo_ck", sql`${t.inicio} < ${t.fim} and ${t.fim} <= ${t.ocupadoAte}`),
  ],
);

export const pagamentos = pgTable(
  "pagamentos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    negocioId: uuid("negocio_id")
      .notNull()
      .references(() => negocios.id),
    reservaId: uuid("reserva_id")
      .notNull()
      .unique()
      .references(() => reservas.id),
    provedor: text("provedor").notNull(),
    /** Id do pagamento no provedor (Mercado Pago). É por ele que o webhook encontra a reserva. */
    provedorId: text("provedor_id").notNull(),
    status: text("status", { enum: ["pendente", "pago", "recusado", "expirado"] }).notNull(),
    valorCentavos: integer("valor_centavos").notNull(),
    pixCopiaECola: text("pix_copia_e_cola").notNull(),
    pixQrBase64: text("pix_qr_base64").notNull(),
    expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
    pagoEm: timestamp("pago_em", { withTimezone: true }),
    criadoEm: criadoEm(),
  },
  (t) => [index("pagamentos_provedor_idx").on(t.provedor, t.provedorId)],
);

/** Estado do provedor simulado (modo demonstração). Fica no banco para funcionar em vários servidores. */
export const pagamentosSimulados = pgTable("pagamentos_simulados", {
  id: text("id").primaryKey(),
  referencia: text("referencia").notNull(),
  valorCentavos: integer("valor_centavos").notNull(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  pagoEm: timestamp("pago_em", { withTimezone: true }),
});
