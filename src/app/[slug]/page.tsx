import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso, Logo } from "@/components/ui";
import { formatarReais } from "@/lib/dinheiro";
import { agendaPublica, negocioPorSlug, PRAZO_PIX_MIN } from "@/lib/reservas";
import { formatarDataLonga, formatarHora, instanteLocal } from "@/lib/tempo";
import { reservar } from "./acoes";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ servico?: string; data?: string; hora?: string; erro?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const negocio = await negocioPorSlug((await params).slug);
  return { title: negocio ? `Agendar em ${negocio.nome}` : "Agenda não encontrada" };
}

const DIAS_VISIVEIS = 14;

export default async function PaginaPublica({ params, searchParams }: Props) {
  const { slug } = await params;
  const escolha = await searchParams;
  const agenda = await agendaPublica(slug, { servicoId: escolha.servico, data: escolha.data });
  if (!agenda) notFound();
  const { negocio, servicos, dias, servico, data, horarios } = agenda;
  const horario = horarios.find((h) => h.inicio.toISOString() === escolha.hora) ?? null;
  const fuso = negocio.fuso;
  const link = (q: Record<string, string>) => `/${slug}?${new URLSearchParams(q)}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between">
        <Logo />
      </header>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{negocio.nome}</h1>
        <p className="mt-1 text-apagado">Escolha o serviço, o dia e o horário.</p>
      </div>

      {escolha.erro && (
        <div className="mb-4">
          <Aviso>{escolha.erro}</Aviso>
        </div>
      )}

      <section className="cartao" aria-labelledby="passo-servico">
        <h2 id="passo-servico" className="mb-3 font-semibold">
          1. Serviço
        </h2>
        {servicos.length === 0 && <p className="text-sm text-apagado">Nenhum serviço disponível no momento.</p>}
        <ul className="grid gap-2">
          {servicos.map((s) => {
            const ativo = s.id === servico?.id;
            return (
              <li key={s.id}>
                <Link
                  href={link(data ? { servico: s.id, data } : { servico: s.id })}
                  aria-current={ativo ? "true" : undefined}
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                    ativo ? "border-marca bg-marca-suave/60" : "border-linha hover:border-marca"
                  }`}
                >
                  <span>
                    <span className="block font-medium">{s.nome}</span>
                    <span className="text-sm text-apagado">
                      {s.duracaoMin} min · {s.sinalCentavos > 0 ? `sinal de ${formatarReais(s.sinalCentavos)} via Pix` : "sem sinal"}
                    </span>
                  </span>
                  <span className="font-semibold">{formatarReais(s.precoCentavos)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {servico && (
        <section className="cartao mt-4" aria-labelledby="passo-dia">
          <h2 id="passo-dia" className="mb-3 font-semibold">
            2. Dia
          </h2>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {dias.slice(0, DIAS_VISIVEIS).map((d) => {
              const meioDia = instanteLocal(d.data, 12 * 60, fuso)!;
              const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, weekday: "short" }).format(meioDia).replace(".", "");
              const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit", month: "2-digit" }).format(meioDia);
              const ativo = d.data === data;
              const classe = `flex w-16 shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-sm transition ${
                ativo ? "border-marca bg-marca text-white" : d.aberto ? "border-linha hover:border-marca" : "border-linha text-slate-300"
              }`;
              return (
                <li key={d.data}>
                  {d.aberto ? (
                    <Link href={link({ servico: servico.id, data: d.data })} aria-current={ativo ? "date" : undefined} className={classe}>
                      <span className="capitalize">{semana}</span>
                      <span className="font-semibold">{dia}</span>
                    </Link>
                  ) : (
                    <span className={classe} title="Fechado">
                      <span className="capitalize">{semana}</span>
                      <span className="font-semibold line-through">{dia}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {servico && data && (
        <section className="cartao mt-4" aria-labelledby="passo-horario">
          <h2 id="passo-horario" className="mb-1 font-semibold">
            3. Horário
          </h2>
          <p className="mb-3 text-sm text-apagado first-letter:uppercase">{formatarDataLonga(instanteLocal(data, 12 * 60, fuso)!, fuso)}</p>
          {horarios.length === 0 ? (
            <p className="text-sm text-apagado">Nenhum horário livre neste dia. Tente outro.</p>
          ) : (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {horarios.map((h) => {
                const iso = h.inicio.toISOString();
                const ativo = iso === horario?.inicio.toISOString();
                return (
                  <li key={iso}>
                    <Link
                      href={link({ servico: servico.id, data, hora: iso })}
                      aria-current={ativo ? "time" : undefined}
                      className={`block rounded-lg border py-2 text-center text-sm font-medium tabular-nums transition ${
                        ativo ? "border-marca bg-marca text-white" : "border-linha hover:border-marca"
                      }`}
                    >
                      {formatarHora(h.inicio, fuso)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {servico && data && horario && (
        <section className="cartao mt-4" aria-labelledby="passo-dados">
          <h2 id="passo-dados" className="mb-1 font-semibold">
            4. Seus dados
          </h2>
          <p className="mb-4 text-sm text-apagado">
            {servico.nome}, {formatarDataLonga(horario.inicio, fuso)}, às {formatarHora(horario.inicio, fuso)}.
          </p>
          <form action={reservar.bind(null, slug)} className="grid gap-3">
            <input type="hidden" name="servicoId" value={servico.id} />
            <input type="hidden" name="inicio" value={horario.inicio.toISOString()} />
            <input type="hidden" name="data" value={data} />
            <div>
              <label htmlFor="nome" className="rotulo">
                Nome
              </label>
              <input id="nome" name="nome" required minLength={2} maxLength={80} autoComplete="name" className="campo" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className="rotulo">
                  E-mail
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className="campo" />
              </div>
              <div>
                <label htmlFor="telefone" className="rotulo">
                  WhatsApp <span className="font-normal text-apagado">(opcional)</span>
                </label>
                <input id="telefone" name="telefone" type="tel" autoComplete="tel" className="campo" />
              </div>
            </div>
            <button type="submit" className="botao mt-1 !py-3">
              {servico.sinalCentavos > 0 ? `Reservar e pagar sinal de ${formatarReais(servico.sinalCentavos)}` : "Confirmar reserva"}
            </button>
            {servico.sinalCentavos > 0 && (
              <p className="text-center text-xs text-apagado">
                O horário fica guardado por {PRAZO_PIX_MIN} minutos enquanto você paga o Pix.
              </p>
            )}
          </form>
        </section>
      )}
    </main>
  );
}
