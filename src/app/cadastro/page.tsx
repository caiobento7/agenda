import type { Metadata } from "next";
import { FormularioCadastro } from "../acesso/formularios";
import { MolduraAcesso } from "../acesso/moldura";

export const metadata: Metadata = { title: "Criar agenda" };

export default function Cadastro() {
  return (
    <MolduraAcesso titulo="Crie sua agenda" subtitulo="Leva um minuto. Depois é só cadastrar os serviços e divulgar o link.">
      <FormularioCadastro />
    </MolduraAcesso>
  );
}
