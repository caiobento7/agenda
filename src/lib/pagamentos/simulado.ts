import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { comoSistema, schema } from "../../db/index.ts";
import type { CobrancaPix, PedidoCobranca, ProvedorPagamento, SituacaoPagamento } from "./tipos.ts";

/**
 * Provedor de mentira para desenvolvimento e demonstração: gera um QR Code que não paga nada e
 * guarda o estado no próprio banco. A página da reserva mostra um botão "Simular pagamento" que
 * dispara o mesmo caminho do webhook real.
 */
export const provedorSimulado: ProvedorPagamento = {
  nome: "simulado",

  async criarCobrancaPix(p: PedidoCobranca): Promise<CobrancaPix> {
    const id = `sim_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const copiaECola = `PIX-SIMULADO|${id}|R$${(p.valorCentavos / 100).toFixed(2)}|nao-pague`;
    await comoSistema((tx) =>
      tx.insert(schema.pagamentosSimulados).values({
        id,
        referencia: p.referencia,
        valorCentavos: p.valorCentavos,
        expiraEm: p.expiraEm,
      }),
    );
    const png = await QRCode.toDataURL(copiaECola, { margin: 1, width: 280 });
    return { id, copiaECola, qrCodeBase64: png.replace(/^data:image\/png;base64,/, ""), expiraEm: p.expiraEm };
  },

  async consultar(id: string): Promise<SituacaoPagamento> {
    const [p] = await comoSistema((tx) =>
      tx.select().from(schema.pagamentosSimulados).where(eq(schema.pagamentosSimulados.id, id)),
    );
    if (!p) return { status: "recusado", referencia: null, valorCentavos: 0, pagoEm: null };
    const status = p.pagoEm ? "aprovado" : p.expiraEm < new Date() ? "expirado" : "pendente";
    return { status, referencia: p.referencia, valorCentavos: p.valorCentavos, pagoEm: p.pagoEm };
  },
};

/** Faz de conta que o cliente pagou. Só vale enquanto o Pix não expirou. */
export async function simularPagamento(id: string, agora = new Date()): Promise<boolean> {
  return comoSistema(async (tx) => {
    const [p] = await tx.select().from(schema.pagamentosSimulados).where(eq(schema.pagamentosSimulados.id, id));
    if (!p || p.expiraEm < agora) return false;
    if (!p.pagoEm) await tx.update(schema.pagamentosSimulados).set({ pagoEm: agora }).where(eq(schema.pagamentosSimulados.id, id));
    return true;
  });
}
