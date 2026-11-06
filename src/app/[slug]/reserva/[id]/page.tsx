import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CabecalhoNegocio } from "@/components/negocio";
import { SeloStatus } from "@/components/ui";
import { formatarReais } from "@/lib/dinheiro";
import { detalheReserva } from "@/lib/reservas";
import { formatarDataLonga, formatarHora } from "@/lib/tempo";
import { Acompanhar, CopiarPix, SimularPagamento } from "./acompanhar";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sua reserva", robots: { index: false } };

export default async function PaginaReserva({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const d = await detalheReserva(id);
  if (!d || d.negocio.slug !== slug) notFound();
  const { reserva, servico, negocio, pagamento, status } = d;
  const fuso = negocio.fuso;
  const aguardandoPix = status === "pendente" && pagamento;

  return (
    <div className="min-h-dvh bg-fundo">
      <CabecalhoNegocio nome={negocio.nome} slug={slug} subtitulo="Sua reserva" />
      <main className="relative mx-auto -mt-12 max-w-lg px-4 pb-16">
      <section className="cartao">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{servico.nome}</h1>
            <p className="text-apagado">{negocio.nome}</p>
          </div>
          <SeloStatus status={status} />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-apagado">Quando</dt>
            <dd className="font-medium first-letter:uppercase">
              {formatarDataLonga(reserva.inicio, fuso)}, {formatarHora(reserva.inicio, fuso)}
            </dd>
          </div>
          <div>
            <dt className="text-apagado">Duração</dt>
            <dd className="font-medium">{servico.duracaoMin} min</dd>
          </div>
          <div>
            <dt className="text-apagado">Valor</dt>
            <dd className="font-medium">{formatarReais(servico.precoCentavos)}</dd>
          </div>
          {reserva.sinalCentavos > 0 && (
            <div>
              <dt className="text-apagado">Sinal via Pix</dt>
              <dd className="font-medium">{formatarReais(reserva.sinalCentavos)}</dd>
            </div>
          )}
        </dl>
      </section>

      {aguardandoPix && (
        <section className="cartao mt-4 text-center ring-2 ring-marca/15" aria-labelledby="titulo-pix">
          <h2 id="titulo-pix" className="text-lg font-bold">
            Pague o sinal para confirmar
          </h2>
          <p className="mt-1 text-sm text-apagado">Abra o app do banco, escolha Pix e leia o QR Code ou cole o código.</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem em base64 gerada pelo provedor */}
          <img
            src={`data:image/png;base64,${pagamento.pixQrBase64}`}
            alt="QR Code do Pix"
            width={220}
            height={220}
            className="mx-auto my-5 rounded-2xl border border-linha p-2 shadow-sm"
          />
          <CopiarPix codigo={pagamento.pixCopiaECola} />
          <Acompanhar reservaId={reserva.id} expiraEm={reserva.expiraEm!.toISOString()} />
          {pagamento.provedor === "simulado" && <SimularPagamento reservaId={reserva.id} />}
        </section>
      )}

      {status === "confirmada" && (
        <section className="cartao mt-4 border-emerald-200 bg-emerald-50 text-center">
          <span aria-hidden className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-600/30">
            ✓
          </span>
          <p className="text-lg font-semibold text-emerald-800">Tudo certo! Reserva confirmada.</p>
          <p className="mt-1 text-sm text-emerald-900/80">
            Enviamos a confirmação para {reserva.clienteEmail}. Você recebe um lembrete um dia antes.
          </p>
        </section>
      )}

      {status === "expirada" && (
        <section className="cartao mt-4 text-center">
          <p className="font-semibold">O prazo para pagar o Pix acabou e o horário foi liberado.</p>
          <Link href={`/${slug}`} className="botao mt-4">
            Escolher outro horário
          </Link>
        </section>
      )}

      {status === "conflito" && (
        <section className="cartao mt-4 text-center">
          <p className="font-semibold">Recebemos o Pix depois do prazo e o horário já tinha sido reservado.</p>
          <p className="mt-1 text-sm text-apagado">{negocio.nome} vai devolver o sinal. Se quiser, escolha outro horário.</p>
        </section>
      )}
      </main>
    </div>
  );
}
