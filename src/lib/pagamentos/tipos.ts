export type CobrancaPix = {
  /** Id do pagamento no provedor. */
  id: string;
  copiaECola: string;
  /** Imagem PNG do QR Code em base64 (sem o prefixo data:). */
  qrCodeBase64: string;
  expiraEm: Date;
};

export type SituacaoPagamento = {
  status: "pendente" | "aprovado" | "recusado" | "expirado";
  /** O id da reserva que mandamos ao criar a cobrança. */
  referencia: string | null;
  valorCentavos: number;
  pagoEm: Date | null;
};

export type PedidoCobranca = {
  /** Id da reserva: volta no pagamento e também serve de chave de idempotência. */
  referencia: string;
  valorCentavos: number;
  descricao: string;
  emailPagador: string;
  expiraEm: Date;
};

/** O que a aplicação precisa de um provedor de Pix. Trocar de provedor é escrever outra implementação. */
export interface ProvedorPagamento {
  readonly nome: string;
  criarCobrancaPix(pedido: PedidoCobranca): Promise<CobrancaPix>;
  /** Consulta o pagamento direto no provedor: o webhook só avisa, quem decide é esta resposta. */
  consultar(id: string): Promise<SituacaoPagamento>;
}
