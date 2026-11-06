import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { assinaturaValida, mercadoPago } from "../src/lib/pagamentos/mercadopago.ts";

const SEGREDO = "segredo-do-painel";
const assinar = (texto: string) => createHmac("sha256", SEGREDO).update(texto).digest("hex");

describe("assinatura do webhook", () => {
  const ts = "1794000000";
  const v1 = assinar(`id:123456;request-id:req-1;ts:${ts};`);

  it("aceita a assinatura correta", () => {
    expect(assinaturaValida({ assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", segredo: SEGREDO })).toBe(true);
  });

  it("recusa se qualquer parte mudar", () => {
    expect(assinaturaValida({ assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "999999", segredo: SEGREDO })).toBe(false);
    expect(assinaturaValida({ assinatura: `ts=${ts},v1=${v1}`, requestId: "req-2", dataId: "123456", segredo: SEGREDO })).toBe(false);
    expect(assinaturaValida({ assinatura: `ts=1,v1=${v1}`, requestId: "req-1", dataId: "123456", segredo: SEGREDO })).toBe(false);
    expect(assinaturaValida({ assinatura: `ts=${ts},v1=${v1}`, requestId: "req-1", dataId: "123456", segredo: "outro" })).toBe(false);
  });

  it("recusa cabeçalho ausente ou malformado", () => {
    expect(assinaturaValida({ assinatura: null, requestId: "req-1", dataId: "123456", segredo: SEGREDO })).toBe(false);
    expect(assinaturaValida({ assinatura: "lixo", requestId: "req-1", dataId: "123456", segredo: SEGREDO })).toBe(false);
    expect(assinaturaValida({ assinatura: `ts=${ts},v1=zz`, requestId: "req-1", dataId: "123456", segredo: SEGREDO })).toBe(false);
  });

  it("id alfanumérico entra em minúsculas e partes ausentes ficam de fora", () => {
    const v = assinar(`id:abc123;ts:${ts};`);
    expect(assinaturaValida({ assinatura: `ts=${ts}, v1=${v}`, requestId: null, dataId: "ABC123", segredo: SEGREDO })).toBe(true);
  });
});

describe("API de pagamentos", () => {
  function fetchFalso(resposta: unknown, status = 200) {
    const chamadas: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit) => {
      chamadas.push({ url, init });
      return new Response(JSON.stringify(resposta), { status });
    }) as unknown as typeof fetch;
    return { f, chamadas };
  }

  it("cria o Pix com valor em reais, referência, expiração e chave de idempotência", async () => {
    const { f, chamadas } = fetchFalso({
      id: 987,
      status: "pending",
      date_of_expiration: "2026-11-09T23:15:00.000-03:00",
      point_of_interaction: { transaction_data: { qr_code: "000201...", qr_code_base64: "iVBOR" } },
    });
    const mp = mercadoPago({ accessToken: "TEST-token", appUrl: "https://agenda.exemplo", fetch: f });

    const cobranca = await mp.criarCobrancaPix({
      referencia: "reserva-1",
      valorCentavos: 2990,
      descricao: "Sinal: Corte",
      emailPagador: "ana@cliente.dev",
      expiraEm: new Date("2026-11-10T02:15:00Z"),
    });

    expect(cobranca).toEqual({ id: "987", copiaECola: "000201...", qrCodeBase64: "iVBOR", expiraEm: new Date("2026-11-10T02:15:00Z") });
    const { url, init } = chamadas[0];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(init.headers).toMatchObject({ Authorization: "Bearer TEST-token", "X-Idempotency-Key": "reserva-1" });
    expect(JSON.parse(init.body as string)).toEqual({
      transaction_amount: 29.9,
      description: "Sinal: Corte",
      payment_method_id: "pix",
      payer: { email: "ana@cliente.dev" },
      external_reference: "reserva-1",
      date_of_expiration: "2026-11-10T02:15:00.000+00:00",
      notification_url: "https://agenda.exemplo/api/webhooks/mercadopago",
    });
  });

  it("traduz a consulta do pagamento", async () => {
    const { f } = fetchFalso({ id: 987, status: "approved", external_reference: "reserva-1", transaction_amount: 29.9, date_approved: "2026-11-09T23:05:00.000-03:00" });
    expect(await mercadoPago({ accessToken: "t", fetch: f }).consultar("987")).toEqual({
      status: "aprovado",
      referencia: "reserva-1",
      valorCentavos: 2990,
      pagoEm: new Date("2026-11-10T02:05:00Z"),
    });
  });

  it("Pix cancelado por prazo vira expirado; em análise continua pendente", async () => {
    for (const [mp, nosso] of [["cancelled", "expirado"], ["in_process", "pendente"], ["rejected", "recusado"]]) {
      const { f } = fetchFalso({ id: 1, status: mp, transaction_amount: 1 });
      expect((await mercadoPago({ accessToken: "t", fetch: f }).consultar("1")).status).toBe(nosso);
    }
  });

  it("erro da API vira exceção com o status", async () => {
    const { f } = fetchFalso({ message: "invalid token" }, 401);
    await expect(mercadoPago({ accessToken: "t", fetch: f }).consultar("1")).rejects.toMatchObject({ status: 401 });
  });
});
