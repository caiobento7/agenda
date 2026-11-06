import { detalheReserva } from "@/lib/reservas";

export const dynamic = "force-dynamic";

/** Status da reserva para a página do Pix acompanhar o pagamento. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = await detalheReserva((await params).id);
  if (!d) return Response.json({ erro: "Reserva não encontrada." }, { status: 404 });
  return Response.json({ status: d.status }, { headers: { "Cache-Control": "no-store" } });
}
