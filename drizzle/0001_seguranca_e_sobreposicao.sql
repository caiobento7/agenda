-- 1. Dois atendimentos do mesmo negócio nunca se sobrepõem: quem garante é o banco.
--    Mesmo com duas pessoas clicando no mesmo horário ao mesmo tempo, só uma reserva entra.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "reservas"
  ADD COLUMN "periodo" tstzrange GENERATED ALWAYS AS (tstzrange("inicio", "ocupado_ate", '[)')) STORED;
--> statement-breakpoint
-- Só reservas que seguram o horário contam: pendentes (dentro do prazo do Pix) e confirmadas.
ALTER TABLE "reservas"
  ADD CONSTRAINT "reservas_sem_sobreposicao"
  EXCLUDE USING gist ("negocio_id" WITH =, "periodo" WITH &&)
  WHERE ("status" IN ('pendente', 'confirmada'));
--> statement-breakpoint

-- 2. Isolamento entre negócios com Row Level Security.
--    As telas de cada negócio rodam com o papel agenda_app e o id do negócio na sessão
--    (app.negocio_id). As políticas abaixo filtram todas as consultas por esse id, então um
--    bug no código não consegue vazar a agenda de um negócio para outro.
--    Rotinas do sistema (webhook, lembretes, login) rodam com o dono das tabelas, que não é
--    filtrado por RLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'agenda_app') THEN
    CREATE ROLE agenda_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT agenda_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO agenda_app;
--> statement-breakpoint
GRANT SELECT, UPDATE ON "negocios" TO agenda_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "servicos", "expedientes", "bloqueios", "reservas", "pagamentos" TO agenda_app;
--> statement-breakpoint
CREATE FUNCTION negocio_atual() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.negocio_id', true), '')::uuid $$;
--> statement-breakpoint
ALTER TABLE "negocios" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- Nome, endereço da página e fuso de qualquer negócio são públicos; alterar, só o próprio.
CREATE POLICY "negocios_leitura" ON "negocios" FOR SELECT TO agenda_app USING (true);
--> statement-breakpoint
CREATE POLICY "negocios_alteracao" ON "negocios" FOR UPDATE TO agenda_app
  USING ("id" = negocio_atual()) WITH CHECK ("id" = negocio_atual());
--> statement-breakpoint
ALTER TABLE "servicos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "servicos_do_negocio" ON "servicos" TO agenda_app
  USING ("negocio_id" = negocio_atual()) WITH CHECK ("negocio_id" = negocio_atual());
--> statement-breakpoint
ALTER TABLE "expedientes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "expedientes_do_negocio" ON "expedientes" TO agenda_app
  USING ("negocio_id" = negocio_atual()) WITH CHECK ("negocio_id" = negocio_atual());
--> statement-breakpoint
ALTER TABLE "bloqueios" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "bloqueios_do_negocio" ON "bloqueios" TO agenda_app
  USING ("negocio_id" = negocio_atual()) WITH CHECK ("negocio_id" = negocio_atual());
--> statement-breakpoint
ALTER TABLE "reservas" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "reservas_do_negocio" ON "reservas" TO agenda_app
  USING ("negocio_id" = negocio_atual()) WITH CHECK ("negocio_id" = negocio_atual());
--> statement-breakpoint
ALTER TABLE "pagamentos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "pagamentos_do_negocio" ON "pagamentos" TO agenda_app
  USING ("negocio_id" = negocio_atual()) WITH CHECK ("negocio_id" = negocio_atual());
