import { mercadoPago } from "./mercadopago.ts";
import { provedorSimulado } from "./simulado.ts";
import type { ProvedorPagamento } from "./tipos.ts";

let provedorDeTeste: ProvedorPagamento | null = null;

/** Só para testes: troca o provedor (null volta ao configurado). */
export function usarProvedor(p: ProvedorPagamento | null) {
  provedorDeTeste = p;
}

export function provedorAtual(): ProvedorPagamento {
  if (provedorDeTeste) return provedorDeTeste;
  if (process.env.PAYMENT_PROVIDER === "mercadopago") {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Defina MERCADOPAGO_ACCESS_TOKEN para usar o Mercado Pago.");
    return mercadoPago({ accessToken, appUrl: process.env.APP_URL });
  }
  return provedorSimulado;
}

export type { ProvedorPagamento } from "./tipos.ts";
