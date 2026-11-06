"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Consulta o status a cada 3 segundos e recarrega a página quando o Pix é confirmado ou vence. */
export function Acompanhar({ reservaId, expiraEm }: { reservaId: string; expiraEm: string }) {
  const router = useRouter();
  const [restante, setRestante] = useState(() => Math.max(0, new Date(expiraEm).getTime() - Date.now()));

  useEffect(() => {
    const relogio = setInterval(() => setRestante(Math.max(0, new Date(expiraEm).getTime() - Date.now())), 1000);
    const consulta = setInterval(async () => {
      const resposta = await fetch(`/api/reservas/${reservaId}`, { cache: "no-store" }).catch(() => null);
      const corpo = resposta?.ok ? ((await resposta.json()) as { status: string }) : null;
      if (corpo && corpo.status !== "pendente") router.refresh();
    }, 3000);
    return () => {
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [reservaId, expiraEm, router]);

  const min = Math.floor(restante / 60000);
  const seg = Math.floor((restante % 60000) / 1000);
  return (
    <p className="mt-4 text-sm text-apagado" aria-live="polite">
      {restante > 0 ? (
        <>
          Esperando o pagamento… o horário fica guardado por mais{" "}
          <strong className="tabular-nums text-tinta">
            {min}:{String(seg).padStart(2, "0")}
          </strong>
        </>
      ) : (
        "O prazo acabou."
      )}
    </p>
  );
}

export function CopiarPix({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="flex gap-2">
      <input readOnly value={codigo} aria-label="Código Pix copia e cola" className="campo font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="botao-secundario shrink-0"
        onClick={async () => {
          await navigator.clipboard.writeText(codigo);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        }}
      >
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

/** Só no modo demonstração: faz de conta que o Pix foi pago e dispara a mesma confirmação do webhook. */
export function SimularPagamento({ reservaId }: { reservaId: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  return (
    <div className="mt-5 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p>Modo demonstração: este Pix não cobra nada.</p>
      <button
        type="button"
        disabled={enviando}
        className="botao mt-2 !bg-amber-600 hover:!bg-amber-700"
        onClick={async () => {
          setEnviando(true);
          await fetch(`/api/reservas/${reservaId}/simular`, { method: "POST" });
          router.refresh();
        }}
      >
        {enviando ? "Confirmando…" : "Simular pagamento do Pix"}
      </button>
    </div>
  );
}
