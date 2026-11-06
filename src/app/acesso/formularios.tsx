"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/ui";
import { acaoCadastrar, acaoEntrar, type EstadoFormulario } from "./acoes";

const inicial: EstadoFormulario = { erro: null, valores: {}, tentativa: 0 };

function Campo(p: { nome: string; rotulo: string; tipo?: string; valor?: string; dica?: string; auto?: string; min?: number }) {
  return (
    <div>
      <label htmlFor={p.nome} className="rotulo">
        {p.rotulo}
      </label>
      <input
        id={p.nome}
        name={p.nome}
        type={p.tipo ?? "text"}
        defaultValue={p.valor}
        required
        minLength={p.min}
        autoComplete={p.auto}
        className="campo"
      />
      {p.dica && <p className="mt-1 text-xs text-apagado">{p.dica}</p>}
    </div>
  );
}

export function FormularioEntrar() {
  const [estado, acao, enviando] = useActionState(acaoEntrar, inicial);
  return (
    <form key={estado.tentativa} action={acao} className="grid gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo nome="email" rotulo="E-mail" tipo="email" valor={estado.valores.email} auto="email" />
      <Campo nome="senha" rotulo="Senha" tipo="password" auto="current-password" />
      <button className="botao mt-1" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-apagado">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-marca hover:underline">
          Criar agenda
        </Link>
      </p>
    </form>
  );
}

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(acaoCadastrar, inicial);
  const v = estado.valores;
  return (
    <form key={estado.tentativa} action={acao} className="grid gap-3">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo nome="nome" rotulo="Seu nome" valor={v.nome} auto="name" />
      <Campo nome="email" rotulo="E-mail" tipo="email" valor={v.email} auto="email" />
      <Campo nome="senha" rotulo="Senha" tipo="password" auto="new-password" min={8} dica="Pelo menos 8 caracteres." />
      <Campo nome="nomeNegocio" rotulo="Nome do negócio" valor={v.nomeNegocio} />
      <Campo nome="slug" rotulo="Endereço da sua página" valor={v.slug} dica="Ex.: barbearia-do-ze. Só letras minúsculas, números e hífen." />
      <button className="botao mt-1" disabled={enviando}>
        {enviando ? "Criando…" : "Criar minha agenda"}
      </button>
      <p className="text-center text-sm text-apagado">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-marca hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
