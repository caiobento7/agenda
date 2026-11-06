"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icones: Record<string, string> = {
  agenda: "M3 9.5h18M8 2.5v4M16 2.5v4M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18V7a2.5 2.5 0 0 1 2.5-2.5Z",
  servicos: "M4 7h16M4 12h16M4 17h10",
  expediente: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  bloqueios: "M5.6 5.6l12.8 12.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
};

const itens = [
  { href: "/painel", rotulo: "Agenda", icone: icones.agenda },
  { href: "/painel/servicos", rotulo: "Serviços", icone: icones.servicos },
  { href: "/painel/expediente", rotulo: "Expediente", icone: icones.expediente },
  { href: "/painel/bloqueios", rotulo: "Bloqueios", icone: icones.bloqueios },
];

export function NavPainel() {
  const atual = usePathname();
  return (
    <nav aria-label="Seções do painel" className="-mx-4 mt-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="inline-flex gap-1 rounded-xl bg-white/10 p-1 ring-1 ring-white/15 backdrop-blur">
        {itens.map((i) => {
          const ativo = atual === i.href;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                  ativo ? "bg-white text-marca-forte shadow-md shadow-black/10" : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={i.icone} />
                </svg>
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
