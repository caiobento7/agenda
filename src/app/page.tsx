import Link from "next/link";
import { Logo } from "@/components/ui";
import { DEMO } from "@/lib/demonstracao";

const recursos = [
  { titulo: "Sinal via Pix", texto: "O cliente garante o horário pagando o sinal. Acabou o furo de quem marca e não aparece." },
  { titulo: "Sem horário duplicado", texto: "Duas pessoas no mesmo horário ao mesmo tempo? O banco de dados deixa só uma passar." },
  { titulo: "Lembrete automático", texto: "Confirmação na hora e lembrete por e-mail um dia antes do atendimento." },
];

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/entrar" className="botao-secundario !py-2">
            Entrar
          </Link>
          <Link href="/cadastro" className="botao !py-2">
            Criar agenda
          </Link>
        </nav>
      </header>

      <section className="py-14 text-center sm:py-24">
        <p className="mx-auto mb-4 inline-flex rounded-full bg-marca-suave px-3 py-1 text-xs font-semibold text-marca-forte">
          Para barbearias, estúdios e personal trainers
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
          Sua página de agendamento, com sinal via Pix
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-apagado">
          O cliente escolhe o serviço e o horário, paga o sinal e recebe a confirmação. Você só abre o painel para ver a agenda do dia.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/${DEMO.slug}`} className="botao !px-6 !py-3">
            Ver página de exemplo
          </Link>
          <Link href="/cadastro" className="botao-secundario !px-6 !py-3">
            Criar a minha
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-16 sm:grid-cols-3">
        {recursos.map((r) => (
          <div key={r.titulo} className="cartao">
            <h2 className="font-semibold">{r.titulo}</h2>
            <p className="mt-1.5 text-sm text-apagado">{r.texto}</p>
          </div>
        ))}
      </section>

      <footer className="mt-auto border-t border-linha py-6 text-center text-sm text-apagado">
        Projeto de portfólio de{" "}
        <a href="https://caiobento.vercel.app" className="font-medium text-marca hover:underline">
          Caio Bento
        </a>{" "}
        ·{" "}
        <a href="https://github.com/caiobento7/agenda" className="font-medium text-marca hover:underline">
          código no GitHub
        </a>
      </footer>
    </main>
  );
}
