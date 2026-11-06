import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { DEMO } from "@/lib/demonstracao";
import { FormularioEntrar } from "../acesso/formularios";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <Logo />
      <div className="cartao mt-6">
        <h1 className="mb-4 text-xl font-bold">Entrar no painel</h1>
        <FormularioEntrar />
      </div>
      <p className="mt-4 text-center text-xs text-apagado">
        Conta de demonstração: {DEMO.email} / {DEMO.senha}
      </p>
    </main>
  );
}
