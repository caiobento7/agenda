import { Grade, Logo } from "./ui";

/** Faixa colorida do topo das páginas do cliente, com o nome do negócio. */
export function CabecalhoNegocio({ nome, subtitulo, slug }: { nome: string; subtitulo: string; slug: string }) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-marca-forte via-marca to-teal-500 text-white">
      <Grade />
      <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-teal-300/25 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-4 pb-20 pt-5">
        <Logo href={`/${slug}`} claro />
        <div className="mt-8 flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-xl font-bold ring-1 ring-white/25 backdrop-blur">
            {iniciais}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{nome}</h1>
            <p className="mt-0.5 text-white/80">{subtitulo}</p>
          </div>
        </div>
        <ul className="mt-5 flex flex-wrap gap-2 text-xs font-medium">
          {["Confirmação na hora", "Sinal seguro via Pix", "Lembrete por e-mail"].map((s) => (
            <li key={s} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20 backdrop-blur">
              <svg aria-hidden viewBox="0 0 20 20" className="size-3.5" fill="currentColor">
                <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" />
              </svg>
              {s}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
