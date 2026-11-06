"use server";

import { redirect } from "next/navigation";
import { criarReserva, ErroReserva } from "@/lib/reservas";

export async function reservar(slug: string, formData: FormData) {
  const servicoId = String(formData.get("servicoId") ?? "");
  const inicio = String(formData.get("inicio") ?? "");
  const data = String(formData.get("data") ?? "");
  let destino: string;
  try {
    const { id } = await criarReserva(slug, {
      servicoId,
      inicio,
      nome: String(formData.get("nome") ?? ""),
      email: String(formData.get("email") ?? ""),
      telefone: String(formData.get("telefone") ?? ""),
    });
    destino = `/${slug}/reserva/${id}`;
  } catch (erro) {
    if (!(erro instanceof ErroReserva)) throw erro;
    const voltar = new URLSearchParams({ servico: servicoId, data, erro: erro.message });
    if (erro.codigo === "dados_invalidos") voltar.set("hora", inicio);
    destino = `/${slug}?${voltar}`;
  }
  redirect(destino);
}
