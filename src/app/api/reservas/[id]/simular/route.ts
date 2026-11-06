import { simularPagamento } from "@/lib/pagamentos/simulado";
import { confirmarPagamento, detalheReserva } from "@/lib/reservas";

/**
 * Só funciona com o provedor simulado: marca o Pix como pago e segue o mesmo caminho do webhook
 * real (consulta o provedor e confirma a reserva).
 */
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const d = await detalheReserva((await params).id);
  if (!d?.pagamento || d.pagamento.provedor !== "simulado") {
    return Response.json({ erro: "Disponível só no modo demonstração." }, { status: 404 });
  }
  if (!(await simularPagamento(d.pagamento.provedorId))) {
    return Response.json({ erro: "O prazo do Pix acabou." }, { status: 409 });
  }
  return Response.json({ resultado: await confirmarPagamento(d.pagamento.provedorId) });
}
