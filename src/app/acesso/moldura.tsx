import { Grade, Logo } from "@/components/ui";

const vantagens = [
  "Página de agendamento pronta para mandar no WhatsApp",
  "Sinal via Pix: o cliente que paga, aparece",
  "Lembrete automático um dia antes",
];

function Check() {
  return (
    <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.86a.75.75 0 0 0-1.22-.88l-3.48 4.83-1.8-1.8a.75.75 0 1 0-1.06 1.06l2.42 2.42a.75.75 0 0 0 1.14-.09l4-5.54Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Cartõezinhos ilustrando o produto no lado colorido da tela de acesso. */
function Ilustracao() {
  return (
    <div className="relative mt-10 h-52" aria-hidden>
      <div className="absolute left-0 top-0 w-64 -rotate-2 rounded-2xl bg-white p-4 text-tinta shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Corte + barba</p>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Confirmada</span>
        </div>
        <p className="mt-1 text-xs text-apagado">Sábado, 14 de novembro · 10:30</p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {["09:00", "09:45", "10:30", "11:15"].map((h) => (
            <span
              key={h}
              className={`rounded-md py-1 text-center text-[10px] font-medium ${h === "10:30" ? "bg-marca text-white" : "border border-linha text-apagado"}`}
            >
              {h}
            </span>
          ))}
        </div>
      </div>
      <div className="absolute right-0 top-24 w-56 rotate-2 rounded-2xl bg-white/95 p-4 text-tinta shadow-2xl shadow-black/20 xl:right-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-marca-suave text-marca">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 3v18M7 8l5-5 5 5" />
            </svg>
          </span>
          <div>
            <p className="text-xs text-apagado">Pix recebido</p>
            <p className="font-bold">R$ 30,00</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-apagado">Sinal de Ana Souza · agora</p>
      </div>
    </div>
  );
}

/** Tela de entrar / criar conta: lado colorido com a proposta do produto e o formulário ao lado. */
export function MolduraAcesso({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-marca-forte via-marca to-teal-500 p-12 text-white lg:flex lg:flex-col">
        <Grade />
        <div aria-hidden className="absolute -bottom-32 -left-24 size-96 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative">
          <Logo claro />
        </div>
        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Agenda cheia, sem cliente que some.</h2>
          <ul className="mt-6 grid gap-3 text-[15px] text-white/90">
            {vantagens.map((v) => (
              <li key={v} className="flex gap-2.5">
                <Check />
                {v}
              </li>
            ))}
          </ul>
          <Ilustracao />
        </div>
        <p className="relative text-sm text-white/70">Feito para barbearias, estúdios e personal trainers.</p>
      </aside>

      <section className="flex flex-col bg-white px-5 py-8 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{titulo}</h1>
          <p className="mb-7 mt-2 text-apagado">{subtitulo}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
