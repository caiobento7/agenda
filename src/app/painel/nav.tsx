"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const itens = [
  { href: "/painel", rotulo: "Agenda" },
  { href: "/painel/servicos", rotulo: "Serviços" },
  { href: "/painel/expediente", rotulo: "Expediente" },
  { href: "/painel/bloqueios", rotulo: "Bloqueios" },
];

export function NavPainel() {
  const atual = usePathname();
  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
      {itens.map((i) => {
        const ativo = atual === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo ? "page" : undefined}
            className={`border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              ativo ? "border-marca text-marca" : "border-transparent text-apagado hover:text-tinta"
            }`}
          >
            {i.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
