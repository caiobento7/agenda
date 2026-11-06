import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import { exigirConta } from "@/lib/sessao";
import { acaoSair } from "../acesso/acoes";
import { NavPainel } from "./nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel", robots: { index: false } };

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { negocio, usuario } = await exigirConta();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-linha bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Logo href="/painel" />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-apagado sm:inline">{usuario.nome}</span>
            <Link href={`/${negocio.slug}`} target="_blank" className="botao-secundario !py-1.5">
              Minha página ↗
            </Link>
            <form action={acaoSair}>
              <button className="text-apagado hover:text-tinta">Sair</button>
            </form>
          </div>
        </div>
        <NavPainel />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
