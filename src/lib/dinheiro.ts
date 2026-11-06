const reais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 2990 -> "R$ 29,90". Dinheiro sempre em centavos inteiros, nunca em ponto flutuante. */
export function formatarReais(centavos: number): string {
  return reais.format(centavos / 100).replace(/ /g, " ");
}

/** "29,90", "29.90" ou "29" -> 2990. Devolve null se não for um valor válido. */
export function lerReais(texto: string): number | null {
  const limpo = texto.trim().replace(/^R\$\s*/i, "");
  if (!/^\d{1,7}([.,]\d{1,2})?$/.test(limpo)) return null;
  const [inteiro, fracao = ""] = limpo.replace(",", ".").split(".");
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
}
