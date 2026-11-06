import Link from "next/link";
import type { StatusReserva } from "@/db/schema";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-tinta">
      <span className="grid size-8 place-items-center rounded-lg bg-marca text-white">
        <svg aria-hidden viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4M8.5 14.5l2.2 2.2 4.8-4.8" />
        </svg>
      </span>
      Agenda
    </Link>
  );
}

const estilos: Record<StatusReserva, { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando Pix", classe: "bg-amber-100 text-amber-800" },
  confirmada: { texto: "Confirmada", classe: "bg-emerald-100 text-emerald-800" },
  expirada: { texto: "Expirada", classe: "bg-slate-100 text-slate-600" },
  cancelada: { texto: "Cancelada", classe: "bg-slate-100 text-slate-600" },
  conflito: { texto: "Pago após o prazo: devolver sinal", classe: "bg-rose-100 text-rose-800" },
};

export function SeloStatus({ status }: { status: StatusReserva }) {
  const e = estilos[status];
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${e.classe}`}>{e.texto}</span>;
}

export function Aviso({ tipo = "erro", children }: { tipo?: "erro" | "ok"; children: React.ReactNode }) {
  const classe = tipo === "erro" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <p role={tipo === "erro" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${classe}`}>
      {children}
    </p>
  );
}
