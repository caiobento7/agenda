import { createHmac, timingSafeEqual } from "node:crypto";
import type { CobrancaPix, PedidoCobranca, ProvedorPagamento, SituacaoPagamento } from "./tipos.ts";

const API = "https://api.mercadopago.com";

type Opcoes = {
  accessToken: string;
  /** URL pública do site; o Mercado Pago avisa os pagamentos em /api/webhooks/mercadopago. */
  appUrl?: string;
  fetch?: typeof fetch;
};

type PagamentoMp = {
  id: number | string;
  status: string;
  external_reference?: string | null;
  transaction_amount: number;
  date_approved?: string | null;
  date_of_expiration?: string | null;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
};

export class ErroMercadoPago extends Error {
  constructor(
    readonly status: number,
    readonly corpo: string,
  ) {
    super(`Mercado Pago respondeu ${status}`);
  }
}

/** Pagamento Pix via API de Pagamentos do Mercado Pago (POST /v1/payments). */
export function mercadoPago({ accessToken, appUrl, fetch: f = fetch }: Opcoes): ProvedorPagamento {
  async function chamar(caminho: string, init: RequestInit = {}): Promise<PagamentoMp> {
    const resposta = await f(`${API}${caminho}`, {
      ...init,
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
    });
    if (!resposta.ok) throw new ErroMercadoPago(resposta.status, await resposta.text());
    return (await resposta.json()) as PagamentoMp;
  }

  return {
    nome: "mercadopago",

    async criarCobrancaPix(p: PedidoCobranca): Promise<CobrancaPix> {
      const corpo = {
        transaction_amount: p.valorCentavos / 100,
        description: p.descricao,
        payment_method_id: "pix",
        payer: { email: p.emailPagador },
        external_reference: p.referencia,
        // O Pix expira junto com a reserva pendente: depois disso o horário volta a ficar livre.
        date_of_expiration: p.expiraEm.toISOString().replace("Z", "+00:00"),
        ...(appUrl ? { notification_url: `${appUrl}/api/webhooks/mercadopago` } : {}),
      };
      // Mesma chave de idempotência = mesmo pagamento, se a requisição for repetida.
      const mp = await chamar("/v1/payments", {
        method: "POST",
        headers: { "X-Idempotency-Key": p.referencia },
        body: JSON.stringify(corpo),
      });
      const pix = mp.point_of_interaction?.transaction_data;
      if (!pix?.qr_code || !pix.qr_code_base64) throw new Error("O Mercado Pago não devolveu o QR Code do Pix.");
      return {
        id: String(mp.id),
        copiaECola: pix.qr_code,
        qrCodeBase64: pix.qr_code_base64,
        expiraEm: mp.date_of_expiration ? new Date(mp.date_of_expiration) : p.expiraEm,
      };
    },

    async consultar(id: string): Promise<SituacaoPagamento> {
      const mp = await chamar(`/v1/payments/${encodeURIComponent(id)}`);
      return {
        status: traduzirStatus(mp.status),
        referencia: mp.external_reference ?? null,
        valorCentavos: Math.round(mp.transaction_amount * 100),
        pagoEm: mp.date_approved ? new Date(mp.date_approved) : null,
      };
    },
  };
}

function traduzirStatus(status: string): SituacaoPagamento["status"] {
  switch (status) {
    case "approved":
      return "aprovado";
    case "rejected":
    case "refunded":
    case "charged_back":
      return "recusado";
    case "cancelled":
      // Pix não pago dentro do prazo é cancelado pelo Mercado Pago.
      return "expirado";
    default:
      return "pendente";
  }
}

/**
 * Confere a assinatura do webhook (cabeçalho x-signature: "ts=...,v1=...").
 * O Mercado Pago assina o texto "id:{data.id};request-id:{x-request-id};ts:{ts};" com HMAC-SHA256
 * usando a chave secreta do painel. Partes ausentes ficam de fora do texto.
 */
export function assinaturaValida(p: {
  assinatura: string | null;
  requestId: string | null;
  dataId: string | null;
  segredo: string;
}): boolean {
  if (!p.assinatura) return false;
  const partes = Object.fromEntries(
    p.assinatura.split(",").map((parte) => {
      const [chave, ...valor] = parte.split("=");
      return [chave.trim(), valor.join("=").trim()];
    }),
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;

  let texto = "";
  if (p.dataId) texto += `id:${/^[a-z0-9]+$/i.test(p.dataId) ? p.dataId.toLowerCase() : p.dataId};`;
  if (p.requestId) texto += `request-id:${p.requestId};`;
  texto += `ts:${ts};`;

  const esperado = createHmac("sha256", p.segredo).update(texto).digest();
  const recebido = Buffer.from(v1, "hex");
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
