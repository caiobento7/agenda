import type { Metadata } from "next";
import { DEMO } from "@/lib/demonstracao";
import { FormularioEntrar } from "../acesso/formularios";
import { MolduraAcesso } from "../acesso/moldura";

export const metadata: Metadata = { title: "Entrar" };

export default function Entrar() {
  return (
    <MolduraAcesso titulo="Bem-vindo de volta" subtitulo="Entre para ver sua agenda e os sinais recebidos.">
      <FormularioEntrar />
      <div className="mt-8 rounded-xl border border-dashed border-linha bg-fundo p-4 text-sm">
        <p className="font-medium">Só quer conhecer?</p>
        <p className="mt-1 text-apagado">
          Use a conta de demonstração: <span className="font-mono text-tinta">{DEMO.email}</span> / senha{" "}
          <span className="font-mono text-tinta">{DEMO.senha}</span>
        </p>
      </div>
    </MolduraAcesso>
  );
}
