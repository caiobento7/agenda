import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoNegocio } from "@/components/negocio";
import { Aviso } from "@/components/ui";
import { formatarReais } from "@/lib/dinheiro";
import { agendaPublica, negocioPorSlug, PRAZO_PIX_MIN } from "@/lib/reservas";
import { formatarDataLonga, formatarHora, instanteLocal, partesLocais } from "@/lib/tempo";
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

/** Cartão de um passo, com o número num círculo que fica marcado quando o passo já foi feito. */
function Passo(p: { numero: number; titulo: string; feito: boolean; id: string; children: React.ReactNode; detalhe?: string }) {
  return (
    <section className="cartao" aria-labelledby={p.id}>
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
            p.feito ? "bg-marca text-white" : "bg-marca-suave text-marca-forte"
          }`}
        >
          {p.feito ? "✓" : p.numero}
        </span>
        <div>
          <h2 id={p.id} className="font-semibold">
            {p.titulo}
          </h2>
          {p.detalhe && <p className="text-sm text-apagado first-letter:uppercase">{p.detalhe}</p>}
        </div>
      </div>
      {p.children}
    </section>
  );
}

function IconeServico() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12" />
    </svg>
  );
}

export default async function PaginaPublica({ params, searchParams }: Props) {
  const { slug } = await params;
  const escolha = await searchParams;
  const agenda = await agendaPublica(slug, { servicoId: escolha.servico, data: escolha.data });
  if (!agenda) notFound();
  const { negocio, servicos, dias, servico, data, horarios } = agenda;
  const horario = horarios.find((h) => h.inicio.toISOString() === escolha.hora) ?? null;
  const fuso = negocio.fuso;
  const link = (q: Record<string, string>) => `/${slug}?${new URLSearchParams(q)}`;
  const diaPorExtenso = data ? formatarDataLonga(instanteLocal(data, 12 * 60, fuso)!, fuso) : null;

  const turnos = [
    { nome: "Manhã", lista: horarios.filter((h) => partesLocais(h.inicio, fuso).minutos < 12 * 60) },
    { nome: "Tarde", lista: horarios.filter((h) => { const m = partesLocais(h.inicio, fuso).minutos; return m >= 12 * 60 && m < 18 * 60; }) },
    { nome: "Noite", lista: horarios.filter((h) => partesLocais(h.inicio, fuso).minutos >= 18 * 60) },
  ].filter((t) => t.lista.length > 0);

  return (
    <div className="min-h-dvh bg-fundo">
      <CabecalhoNegocio nome={negocio.nome} slug={slug} subtitulo="Agende online em menos de um minuto." />

      <div className="relative mx-auto -mt-12 grid max-w-5xl gap-5 px-4 pb-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {escolha.erro && <Aviso>{escolha.erro}</Aviso>}

          <Passo numero={1} titulo="Serviço" id="passo-servico" feito={!!servico}>
            {servicos.length === 0 && <p className="text-sm text-apagado">Nenhum serviço disponível no momento.</p>}
            <ul className="grid gap-2.5">
              {servicos.map((s) => {
                const ativo = s.id === servico?.id;
                return (
                  <li key={s.id}>
                    <Link
                      href={link(data ? { servico: s.id, data } : { servico: s.id })}
                      aria-current={ativo ? "true" : undefined}
                      className={`group flex items-center gap-4 rounded-xl border px-4 py-3.5 transition ${
                        ativo ? "border-marca bg-marca-suave/50 ring-2 ring-marca/15" : "border-linha hover:border-marca/60 hover:bg-fundo"
                      }`}
                    >
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-xl transition ${
                          ativo ? "bg-marca text-white" : "bg-fundo text-marca group-hover:bg-marca-suave"
                        }`}
                      >
                        <IconeServico />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{s.nome}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                          <span className="rounded-full bg-fundo px-2 py-0.5 text-apagado ring-1 ring-linha">{s.duracaoMin} min</span>
                          <span
                            className={`rounded-full px-2 py-0.5 ring-1 ${
                              s.sinalCentavos > 0 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                            }`}
                          >
                            {s.sinalCentavos > 0 ? `sinal de ${formatarReais(s.sinalCentavos)} via Pix` : "sem sinal"}
                          </span>
                        </span>
                      </span>
                      <span className="text-right font-bold">{formatarReais(s.precoCentavos)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Passo>

          {servico && (
            <Passo numero={2} titulo="Dia" id="passo-dia" feito={!!data} detalhe={diaPorExtenso ?? "Escolha um dos próximos dias."}>
              <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
                {dias.slice(0, DIAS_VISIVEIS).map((d) => {
                  const meioDia = instanteLocal(d.data, 12 * 60, fuso)!;
                  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, weekday: "short" }).format(meioDia).replace(".", "");
                  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, day: "2-digit" }).format(meioDia);
                  const mes = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, month: "short" }).format(meioDia).replace(".", "");
                  const ativo = d.data === data;
                  const classe = `flex w-[4.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2.5 transition ${
                    ativo
                      ? "border-marca bg-gradient-to-b from-marca to-marca-forte text-white shadow-md shadow-marca/25"
                      : d.aberto
                        ? "border-linha bg-white hover:border-marca/60"
                        : "border-dashed border-linha text-slate-300"
                  }`;
                  const conteudo = (
                    <>
                      <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">{semana}</span>
                      <span className={`text-xl font-bold leading-tight ${d.aberto ? "" : "line-through"}`}>{dia}</span>
                      <span className="text-[11px] opacity-70">{mes}</span>
                    </>
                  );
                  return (
                    <li key={d.data}>
                      {d.aberto ? (
                        <Link href={link({ servico: servico.id, data: d.data })} aria-current={ativo ? "date" : undefined} className={classe}>
                          {conteudo}
                        </Link>
                      ) : (
                        <span className={classe} title="Fechado">
                          {conteudo}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Passo>
          )}

          {servico && data && (
            <Passo numero={3} titulo="Horário" id="passo-horario" feito={!!horario} detalhe={`${servico.nome} · ${servico.duracaoMin} min`}>
              {horarios.length === 0 ? (
                <p className="rounded-xl bg-fundo px-4 py-6 text-center text-sm text-apagado">Nenhum horário livre neste dia. Tente outro.</p>
              ) : (
                <div className="grid gap-4">
                  {turnos.map((t) => (
                    <div key={t.nome}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-apagado">{t.nome}</p>
                      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {t.lista.map((h) => {
                          const iso = h.inicio.toISOString();
                          const ativo = iso === horario?.inicio.toISOString();
                          return (
                            <li key={iso}>
                              <Link
                                href={link({ servico: servico.id, data, hora: iso })}
                                aria-current={ativo ? "time" : undefined}
                                className={`block rounded-lg border py-2 text-center text-sm font-semibold tabular-nums transition ${
                                  ativo ? "border-marca bg-marca text-white shadow-md shadow-marca/25" : "border-linha bg-white hover:border-marca hover:text-marca"
                                }`}
                              >
                                {formatarHora(h.inicio, fuso)}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Passo>
          )}

          {servico && data && horario && (
            <Passo
              numero={4}
              titulo="Seus dados"
              id="passo-dados"
              feito={false}
              detalhe={`${servico.nome}, ${formatarDataLonga(horario.inicio, fuso)}, às ${formatarHora(horario.inicio, fuso)}.`}
            >
              <form action={reservar.bind(null, slug)} className="grid gap-3">
                <input type="hidden" name="servicoId" value={servico.id} />
                <input type="hidden" name="inicio" value={horario.inicio.toISOString()} />
                <input type="hidden" name="data" value={data} />
                <div>
                  <label htmlFor="nome" className="rotulo">
                    Nome
                  </label>
                  <input id="nome" name="nome" required minLength={2} maxLength={80} autoComplete="name" className="campo !py-3" placeholder="Seu nome completo" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="rotulo">
                      E-mail
                    </label>
                    <input id="email" name="email" type="email" required autoComplete="email" className="campo !py-3" placeholder="voce@exemplo.com" />
                  </div>
                  <div>
                    <label htmlFor="telefone" className="rotulo">
                      WhatsApp <span className="font-normal text-apagado">(opcional)</span>
                    </label>
                    <input id="telefone" name="telefone" type="tel" autoComplete="tel" className="campo !py-3" placeholder="(21) 99999-0000" />
                  </div>
                </div>
                <button type="submit" className="botao mt-2 w-full !py-3.5 text-base shadow-lg shadow-marca/25">
                  {servico.sinalCentavos > 0 ? `Reservar e pagar sinal de ${formatarReais(servico.sinalCentavos)}` : "Confirmar reserva"}
                </button>
                {servico.sinalCentavos > 0 && (
                  <p className="text-center text-xs text-apagado">
                    O horário fica guardado por {PRAZO_PIX_MIN} minutos enquanto você paga o Pix. O restante é pago no atendimento.
                  </p>
                )}
              </form>
            </Passo>
          )}
        </div>

        <aside className="cartao hidden lg:sticky lg:top-6 lg:block" aria-label="Resumo do agendamento">
          <h2 className="font-semibold">Seu agendamento</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            {[
              ["Serviço", servico?.nome],
              ["Dia", diaPorExtenso],
              ["Horário", horario ? `${formatarHora(horario.inicio, fuso)} às ${formatarHora(horario.fim, fuso)}` : null],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="flex justify-between gap-3">
                <dt className="text-apagado">{rotulo}</dt>
                <dd className={`text-right font-medium first-letter:uppercase ${valor ? "" : "text-slate-300"}`}>{valor ?? "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 border-t border-dashed border-linha pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-apagado">Valor</span>
              <span className="font-semibold">{servico ? formatarReais(servico.precoCentavos) : "—"}</span>
            </div>
            <div className="mt-2 flex justify-between rounded-lg bg-marca-suave/60 px-3 py-2">
              <span className="font-medium text-marca-forte">Agora, via Pix</span>
              <span className="font-bold text-marca-forte">{servico ? formatarReais(servico.sinalCentavos) : "—"}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-apagado">Cancelamentos e dúvidas: fale direto com {negocio.nome}.</p>
        </aside>
      </div>
    </div>
  );
}
