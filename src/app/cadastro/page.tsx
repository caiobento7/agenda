import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { FormularioCadastro } from "../acesso/formularios";

export const metadata: Metadata = { title: "Criar agenda" };

export default function Cadastro() {
  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <Logo />
      <div className="cartao mt-6">
        <h1 className="mb-1 text-xl font-bold">Criar sua agenda</h1>
        <p className="mb-4 text-sm text-apagado">Leva um minuto. Depois é só cadastrar os serviços.</p>
        <FormularioCadastro />
      </div>
    </main>
  );
}
