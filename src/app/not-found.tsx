import Link from "next/link";
import { Logo } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-apagado">Confira o endereço da agenda que você recebeu.</p>
      <Link href="/" className="botao mt-6">
        Ir para o início
      </Link>
    </main>
  );
}
