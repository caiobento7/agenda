"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  alternarServico,
  cancelarReserva,
  criarBloqueio,
  removerBloqueio,
  salvarExpediente,
  salvarRegras,
  salvarServico,
  type FaixaTexto,
  type Resultado,
} from "@/lib/painel";
import { exigirConta } from "@/lib/sessao";

/**
 * O id do negócio sempre vem da sessão, nunca do formulário. E mesmo que viesse, as operações
 * rodam com RLS: um id de outro negócio simplesmente não seria encontrado.
 */
const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "");

function voltar(caminho: string, r: Resultado, mensagemOk: string): never {
  revalidatePath(caminho);
  const q = r.ok ? `ok=${encodeURIComponent(mensagemOk)}` : `erro=${encodeURIComponent(r.erro)}`;
  redirect(`${caminho}?${q}`);
}

export async function acaoSalvarServico(f: FormData) {
  const { negocio } = await exigirConta();
  const id = texto(f, "id") || undefined;
  const r = await salvarServico(negocio.id, { nome: texto(f, "nome"), duracaoMin: texto(f, "duracaoMin"), preco: texto(f, "preco"), sinal: texto(f, "sinal") }, id);
  voltar("/painel/servicos", r, id ? "Serviço atualizado." : "Serviço criado.");
}

export async function acaoAlternarServico(f: FormData) {
  const { negocio } = await exigirConta();
  await alternarServico(negocio.id, texto(f, "id"), texto(f, "ativo") === "1");
  revalidatePath("/painel/servicos");
}

export async function acaoSalvarExpediente(f: FormData) {
  const { negocio } = await exigirConta();
  const faixas: FaixaTexto[] = [];
  for (let dia = 0; dia < 7; dia++) {
    for (const turno of ["1", "2"]) {
      faixas.push({ diaSemana: dia, inicio: texto(f, `d${dia}i${turno}`), fim: texto(f, `d${dia}f${turno}`) });
    }
  }
  voltar("/painel/expediente", await salvarExpediente(negocio.id, faixas), "Expediente salvo.");
}

export async function acaoSalvarRegras(f: FormData) {
  const { negocio } = await exigirConta();
  const r = await salvarRegras(negocio.id, {
    intervaloMin: texto(f, "intervaloMin"),
    folgaMin: texto(f, "folgaMin"),
    antecedenciaMin: Number(texto(f, "antecedenciaHoras")) * 60,
    janelaDias: texto(f, "janelaDias"),
    fuso: texto(f, "fuso"),
  });
  voltar("/painel/expediente", r, "Regras salvas.");
}

export async function acaoCriarBloqueio(f: FormData) {
  const { negocio } = await exigirConta();
  const r = await criarBloqueio(negocio.id, negocio.fuso, {
    data: texto(f, "data"),
    inicio: texto(f, "inicio"),
    fim: texto(f, "fim"),
    motivo: texto(f, "motivo"),
  });
  voltar("/painel/bloqueios", r, "Bloqueio criado.");
}

export async function acaoRemoverBloqueio(f: FormData) {
  const { negocio } = await exigirConta();
  await removerBloqueio(negocio.id, texto(f, "id"));
  revalidatePath("/painel/bloqueios");
}

export async function acaoCancelarReserva(f: FormData) {
  const { negocio } = await exigirConta();
  await cancelarReserva(negocio.id, texto(f, "id"));
  revalidatePath("/painel");
}
