import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { negocioDoUsuario } from "./conta.ts";
import { criarTokenSessao, DURACAO_SESSAO_DIAS, lerTokenSessao } from "./senha.ts";

const COOKIE = "agenda_sessao";

export async function iniciarSessao(usuarioId: string) {
  (await cookies()).set(COOKIE, await criarTokenSessao(usuarioId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_SESSAO_DIAS * 24 * 3600,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

/** Dono logado e o negócio dele. Sem sessão válida, manda para o login. */
export async function exigirConta() {
  const usuarioId = await lerTokenSessao((await cookies()).get(COOKIE)?.value);
  const conta = usuarioId ? await negocioDoUsuario(usuarioId) : null;
  if (!conta) redirect("/entrar");
  return conta;
}
