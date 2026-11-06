import Link from "next/link";
import { Grade, Logo } from "@/components/ui";
import { DEMO } from "@/lib/demonstracao";

const recursos = [
  {
    titulo: "Sinal via Pix",
    texto: "O cliente garante o horário pagando o sinal. Acabou o furo de quem marca e não aparece.",
    icone: "M12 3v18M7 8l5-5 5 5M5 21h14",
  },
  {
    titulo: "Sem horário duplicado",
    texto: "Duas pessoas no mesmo horário ao mesmo tempo? O banco de dados deixa só uma passar.",
    icone: "M3 9.5h18M8 2.5v4M16 2.5v4M5.5 4.5h13A2.5 2.5 0 0 1 21 7v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18V7a2.5 2.5 0 0 1 2.5-2.5ZM9 14.5l2 2 4-4",
  },
  {
    titulo: "Lembrete automático",
    texto: "Confirmação na hora e lembrete por e-mail um dia antes do atendimento.",
    icone: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
  },
];

const passos = [
  { titulo: "Crie sua agenda", texto: "Cadastre serviços, preços, sinal e o horário de atendimento." },
  { titulo: "Mande o link", texto: "Coloque no Instagram e no WhatsApp: o cliente agenda sozinho." },
  { titulo: "Receba o sinal", texto: "O Pix confirma a reserva e o horário aparece no seu painel." },
];

/** Prévia ilustrativa da página de agendamento, ao lado do título. */
function Previa() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden>
      <div className="rotate-1 rounded-3xl bg-white p-5 text-tinta shadow-2xl shadow-black/25">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-marca text-sm font-bold text-white">SE</span>
          <div>
            <p className="font-semibold leading-tight">Studio Exemplo</p>
            <p className="text-xs text-apagado">Agende online em menos de um minuto</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-marca bg-marca-suave/50 px-3 py-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Corte + barba</span>
            <span className="font-bold">R$ 90,00</span>
          </div>
          <p className="mt-0.5 text-xs text-apagado">75 min · sinal de R$ 30,00 via Pix</p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {[
            ["SEX", "13"],
            ["SÁB", "14"],
            ["TER", "17"],
            ["QUA", "18"],
          ].map(([s, d], i) => (
            <span
              key={d}
              className={`flex flex-1 flex-col items-center rounded-lg border py-1.5 ${i === 1 ? "border-marca bg-marca text-white" : "border-linha"}`}
            >
              <span className="text-[9px] font-medium opacity-80">{s}</span>
              <span className="text-sm font-bold">{d}</span>
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {["09:00", "09:30", "10:30", "11:00", "13:00", "14:15", "15:00", "16:30"].map((h) => (
            <span
              key={h}
              className={`rounded-md border py-1 text-center text-[11px] font-semibold ${h === "10:30" ? "border-marca bg-marca text-white" : "border-linha text-apagado"}`}
            >
              {h}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-marca py-2.5 text-center text-sm font-semibold text-white">Reservar e pagar sinal de R$ 30,00</p>
      </div>
      <div className="absolute -bottom-14 -left-4 -rotate-3 rounded-2xl bg-white px-4 py-3 text-tinta shadow-xl shadow-black/20 sm:-left-12">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-600 text-white">✓</span>
          <div>
            <p className="text-xs text-apagado">Pix recebido</p>
            <p className="text-sm font-bold">Reserva confirmada</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Inicio() {
  return (
    <div className="min-h-dvh bg-fundo">
      <header className="relative overflow-hidden bg-gradient-to-br from-marca-forte via-marca to-teal-500 text-white">
        <Grade />
        <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-teal-300/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-40 -left-20 size-96 rounded-full bg-teal-900/30 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-5">
          <nav className="flex items-center justify-between py-5">
            <Logo claro />
            <div className="flex items-center gap-2">
              <Link href="/entrar" className="rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10">
                Entrar
              </Link>
              <Link href="/cadastro" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-marca-forte shadow-sm transition hover:bg-teal-50">
                Criar agenda
              </Link>
            </div>
          </nav>

          <div className="grid items-center gap-14 pb-24 pt-10 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-16">
            <div>
              <p className="mb-5 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25 backdrop-blur">
                Para barbearias, estúdios e personal trainers
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Sua página de agendamento, com sinal via Pix
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/85">
                O cliente escolhe o serviço e o horário, paga o sinal e recebe a confirmação. Você só abre o painel para ver a agenda do dia.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={`/${DEMO.slug}`} className="rounded-xl bg-white px-6 py-3.5 font-semibold text-marca-forte shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-teal-50">
                  Ver página de exemplo
                </Link>
                <Link href="/cadastro" className="rounded-xl px-6 py-3.5 font-semibold text-white ring-1 ring-white/40 transition hover:bg-white/10">
                  Criar a minha
                </Link>
              </div>
              <p className="mt-6 text-sm text-white/70">Na demonstração o Pix é simulado: nada é cobrado.</p>
            </div>
            <Previa />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5">
        <section className="relative -mt-12 grid gap-4 sm:grid-cols-3" aria-label="Recursos">
          {recursos.map((r) => (
            <div key={r.titulo} className="cartao">
              <span className="grid size-11 place-items-center rounded-xl bg-marca-suave text-marca">
                <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={r.icone} />
                </svg>
              </span>
              <h2 className="mt-4 font-semibold">{r.titulo}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-apagado">{r.texto}</p>
            </div>
          ))}
        </section>

        <section className="py-20" aria-labelledby="como-funciona">
          <p className="text-center text-sm font-semibold uppercase tracking-wider text-marca">Como funciona</p>
          <h2 id="como-funciona" className="mt-2 text-center text-3xl font-bold tracking-tight">
            Do link ao Pix em três passos
          </h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {passos.map((p, i) => (
              <li key={p.titulo} className="relative text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-gradient-to-br from-marca to-marca-forte text-lg font-bold text-white shadow-lg shadow-marca/30">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{p.titulo}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-apagado">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="relative mb-16 overflow-hidden rounded-3xl bg-gradient-to-br from-marca-forte via-marca to-teal-500 px-6 py-12 text-center text-white sm:px-12">
          <Grade />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Experimente como cliente e como dono</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Faça uma reserva na página de exemplo e depois entre no painel com {DEMO.email} / {DEMO.senha}.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={`/${DEMO.slug}`} className="rounded-xl bg-white px-6 py-3 font-semibold text-marca-forte shadow-lg shadow-black/15 transition hover:bg-teal-50">
                Agendar como cliente
              </Link>
              <Link href="/entrar" className="rounded-xl px-6 py-3 font-semibold ring-1 ring-white/40 transition hover:bg-white/10">
                Entrar no painel
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-linha bg-white py-6 text-center text-sm text-apagado">
        Projeto de portfólio de{" "}
        <a href="https://caiobento.vercel.app" className="font-medium text-marca hover:underline">
          Caio Bento
        </a>{" "}
        ·{" "}
        <a href="https://github.com/caiobento7/agenda" className="font-medium text-marca hover:underline">
          código no GitHub
        </a>
      </footer>
    </div>
  );
}
