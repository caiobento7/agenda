import { assinaturaValida } from "@/lib/pagamentos/mercadopago";
import { confirmarPagamento } from "@/lib/reservas";

/**
 * Notificação de pagamento do Mercado Pago. Responde 200 para avisos repetidos ou que não são
 * nossos (senão o Mercado Pago reenvia sem parar); erro de verdade, como o banco fora do ar, vira
 * 500 e o Mercado Pago tenta de novo mais tarde.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const corpo = (await req.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
  const tipo = url.searchParams.get("type") ?? corpo.type;
  const dataId = url.searchParams.get("data.id") ?? (corpo.data?.id != null ? String(corpo.data.id) : null);
  if (tipo !== "payment" || !dataId) return Response.json({ ignorado: true });

  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (segredo) {
    const valida = assinaturaValida({
      assinatura: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      segredo,
    });
    if (!valida) return Response.json({ erro: "Assinatura inválida." }, { status: 401 });
  }

  // Mesmo sem assinatura, nada é confirmado sem consultar o pagamento direto na API.
  const resultado = await confirmarPagamento(dataId);
  return Response.json({ resultado });
}
