"use server";

import { redirect } from "next/navigation";
import { cadastrar, entrar } from "@/lib/conta";
import { encerrarSessao, iniciarSessao } from "@/lib/sessao";

export type EstadoFormulario = { erro: string | null; valores: Record<string, string>; tentativa: number };

const texto = (f: FormData, campo: string) => String(f.get(campo) ?? "");

export async function acaoEntrar(anterior: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const r = await entrar(texto(f, "email"), texto(f, "senha"));
  if (!r.ok) return { erro: r.erro, valores: { email: texto(f, "email") }, tentativa: anterior.tentativa + 1 };
  await iniciarSessao(r.usuarioId);
  redirect("/painel");
}

export async function acaoCadastrar(anterior: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  const valores = { nome: texto(f, "nome"), email: texto(f, "email"), nomeNegocio: texto(f, "nomeNegocio"), slug: texto(f, "slug") };
  const r = await cadastrar({ ...valores, senha: texto(f, "senha") });
  if (!r.ok) return { erro: r.erro, valores, tentativa: anterior.tentativa + 1 };
  await iniciarSessao(r.usuarioId);
  redirect("/painel/servicos?novo=1");
}

export async function acaoSair() {
  await encerrarSessao();
  redirect("/entrar");
}
