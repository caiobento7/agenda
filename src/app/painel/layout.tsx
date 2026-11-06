import type { Metadata } from "next";
import Link from "next/link";
import { Grade, Logo } from "@/components/ui";
import { exigirConta } from "@/lib/sessao";
import { acaoSair } from "../acesso/acoes";
import { NavPainel } from "./nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { negocio, usuario } = await exigirConta();
  const iniciais = usuario.nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-dvh bg-fundo">
      <header className="relative overflow-hidden bg-gradient-to-br from-marca-forte via-marca to-teal-500 text-white">
        <Grade />
        <div aria-hidden className="absolute -right-24 -top-24 size-80 rounded-full bg-teal-300/25 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 pb-5 pt-4">
          <div className="flex items-center justify-between gap-3">
            <Logo href="/painel" claro />
            <div className="flex items-center gap-2 text-sm">
              <Link
                href={`/${negocio.slug}`}
                target="_blank"
                className="hidden rounded-lg bg-white/15 px-3 py-1.5 font-medium backdrop-blur transition hover:bg-white/25 sm:inline-flex"
              >
                Ver minha página ↗
              </Link>
              <span className="grid size-8 place-items-center rounded-full bg-white/20 text-xs font-bold" title={usuario.nome}>
                {iniciais}
              </span>
              <form action={acaoSair}>
                <button className="rounded-lg px-2 py-1.5 text-white/80 transition hover:bg-white/10 hover:text-white">Sair</button>
              </form>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm text-white/70">Painel de</p>
            <p className="text-2xl font-bold tracking-tight sm:text-3xl">{negocio.nome}</p>
            <Link href={`/${negocio.slug}`} target="_blank" className="mt-1 inline-block font-mono text-sm text-white/80 hover:text-white sm:hidden">
              /{negocio.slug} ↗
            </Link>
          </div>

          <NavPainel />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-12 pt-8">{children}</main>
    </div>
  );
}
