CREATE TABLE "bloqueios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"motivo" text,
	CONSTRAINT "bloqueios_periodo_ck" CHECK ("bloqueios"."inicio" < "bloqueios"."fim")
);
--> statement-breakpoint
CREATE TABLE "expedientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"dia_semana" smallint NOT NULL,
	"inicio_min" smallint NOT NULL,
	"fim_min" smallint NOT NULL,
	CONSTRAINT "expedientes_dia_ck" CHECK ("expedientes"."dia_semana" between 0 and 6),
	CONSTRAINT "expedientes_faixa_ck" CHECK (0 <= "expedientes"."inicio_min" and "expedientes"."inicio_min" < "expedientes"."fim_min" and "expedientes"."fim_min" <= 1440)
);
--> statement-breakpoint
CREATE TABLE "negocios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dono_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"slug" text NOT NULL,
	"fuso" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"intervalo_min" smallint DEFAULT 15 NOT NULL,
	"folga_min" smallint DEFAULT 0 NOT NULL,
	"antecedencia_min" integer DEFAULT 60 NOT NULL,
	"janela_dias" smallint DEFAULT 30 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "negocios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"reserva_id" uuid NOT NULL,
	"provedor" text NOT NULL,
	"provedor_id" text NOT NULL,
	"status" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"pix_copia_e_cola" text NOT NULL,
	"pix_qr_base64" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"pago_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagamentos_reserva_id_unique" UNIQUE("reserva_id")
);
--> statement-breakpoint
CREATE TABLE "pagamentos_simulados" (
	"id" text PRIMARY KEY NOT NULL,
	"referencia" text NOT NULL,
	"valor_centavos" integer NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"pago_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"servico_id" uuid NOT NULL,
	"cliente_nome" text NOT NULL,
	"cliente_email" text NOT NULL,
	"cliente_telefone" text,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"ocupado_ate" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"sinal_centavos" integer NOT NULL,
	"expira_em" timestamp with time zone,
	"confirmada_em" timestamp with time zone,
	"lembrete_enviado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservas_periodo_ck" CHECK ("reservas"."inicio" < "reservas"."fim" and "reservas"."fim" <= "reservas"."ocupado_ate")
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"negocio_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"duracao_min" smallint NOT NULL,
	"preco_centavos" integer NOT NULL,
	"sinal_centavos" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "servicos_duracao_ck" CHECK ("servicos"."duracao_min" between 5 and 600),
	CONSTRAINT "servicos_sinal_ck" CHECK ("servicos"."sinal_centavos" between 0 and "servicos"."preco_centavos")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedientes" ADD CONSTRAINT "expedientes_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negocios" ADD CONSTRAINT "negocios_dono_id_usuarios_id_fk" FOREIGN KEY ("dono_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_reserva_id_reservas_id_fk" FOREIGN KEY ("reserva_id") REFERENCES "public"."reservas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_negocio_id_negocios_id_fk" FOREIGN KEY ("negocio_id") REFERENCES "public"."negocios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bloqueios_negocio_idx" ON "bloqueios" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "expedientes_negocio_idx" ON "expedientes" USING btree ("negocio_id");--> statement-breakpoint
CREATE INDEX "pagamentos_provedor_idx" ON "pagamentos" USING btree ("provedor","provedor_id");--> statement-breakpoint
CREATE INDEX "reservas_negocio_inicio_idx" ON "reservas" USING btree ("negocio_id","inicio");--> statement-breakpoint
CREATE INDEX "servicos_negocio_idx" ON "servicos" USING btree ("negocio_id");