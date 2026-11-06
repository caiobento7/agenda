"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/ui";
import { acaoCadastrar, acaoEntrar, type EstadoFormulario } from "./acoes";

const inicial: EstadoFormulario = { erro: null, valores: {}, tentativa: 0 };

type PropsCampo = {
  nome: string;
  rotulo: string;
  tipo?: string;
  valor?: string;
  dica?: string;
  auto?: string;
  min?: number;
  placeholder?: string;
  /** Texto fixo antes do campo, como o começo do endereço da página. */
  prefixo?: string;
};

function Campo(p: PropsCampo) {
  const entrada = (
    <input
      id={p.nome}
      name={p.nome}
      type={p.tipo ?? "text"}
      defaultValue={p.valor}
      required
      minLength={p.min}
      autoComplete={p.auto}
      placeholder={p.placeholder}
      aria-describedby={p.dica ? `${p.nome}-dica` : undefined}
      className={p.prefixo ? "min-w-0 flex-1 bg-transparent py-3 pr-3 text-sm outline-none" : "campo !py-3"}
    />
  );
  return (
    <div>
      <label htmlFor={p.nome} className="rotulo">
        {p.rotulo}
      </label>
      {p.prefixo ? (
        <div className="flex items-center rounded-lg border border-linha bg-white transition focus-within:border-marca focus-within:ring-2 focus-within:ring-marca/20">
          <span className="select-none pl-3 text-sm text-apagado">{p.prefixo}</span>
          {entrada}
        </div>
      ) : (
        entrada
      )}
      {p.dica && (
        <p id={`${p.nome}-dica`} className="mt-1.5 text-xs text-apagado">
          {p.dica}
        </p>
      )}
    </div>
  );
}

function Separador({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-center gap-3 text-sm text-apagado before:h-px before:flex-1 before:bg-linha after:h-px after:flex-1 after:bg-linha">
      {children}
    </p>
  );
}

export function FormularioEntrar() {
  const [estado, acao, enviando] = useActionState(acaoEntrar, inicial);
  return (
    <form key={estado.tentativa} action={acao} className="grid gap-4">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <Campo nome="email" rotulo="E-mail" tipo="email" valor={estado.valores.email} auto="email" placeholder="voce@exemplo.com" />
      <Campo nome="senha" rotulo="Senha" tipo="password" auto="current-password" placeholder="Sua senha" />
      <button className="botao mt-1 w-full !py-3 shadow-lg shadow-marca/20" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
      <Separador>ou</Separador>
      <Link href="/cadastro" className="botao-secundario w-full !py-3">
        Criar uma agenda nova
      </Link>
    </form>
  );
}

export function FormularioCadastro() {
  const [estado, acao, enviando] = useActionState(acaoCadastrar, inicial);
  const v = estado.valores;
  return (
    <form key={estado.tentativa} action={acao} className="grid gap-4">
      {estado.erro && <Aviso>{estado.erro}</Aviso>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo nome="nome" rotulo="Seu nome" valor={v.nome} auto="name" placeholder="Rita Souza" />
        <Campo nome="nomeNegocio" rotulo="Nome do negócio" valor={v.nomeNegocio} placeholder="Estúdio da Rita" />
      </div>
      <Campo nome="email" rotulo="E-mail" tipo="email" valor={v.email} auto="email" placeholder="voce@exemplo.com" />
      <Campo nome="senha" rotulo="Senha" tipo="password" auto="new-password" min={8} dica="Pelo menos 8 caracteres." />
      <Campo
        nome="slug"
        rotulo="Endereço da sua página"
        valor={v.slug}
        prefixo="agenda/"
        placeholder="estudio-da-rita"
        dica="Só letras minúsculas, números e hífen. É o link que você manda para os clientes."
      />
      <button className="botao mt-1 w-full !py-3 shadow-lg shadow-marca/20" disabled={enviando}>
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
