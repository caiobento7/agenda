import Link from "next/link";
import { Aviso } from "@/components/ui";
import { formatarReais } from "@/lib/dinheiro";
import { servicosDoNegocio } from "@/lib/painel";
import { exigirConta } from "@/lib/sessao";
import { acaoAlternarServico, acaoSalvarServico } from "../acoes";

type Props = { searchParams: Promise<{ ok?: string; erro?: string; novo?: string; editar?: string }> };

const reais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export default async function Servicos({ searchParams }: Props) {
  const { negocio } = await exigirConta();
  const q = await searchParams;
  const servicos = await servicosDoNegocio(negocio.id);
  const editando = servicos.find((s) => s.id === q.editar);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Serviços</h1>
      <div className="mb-4 grid gap-2">
        {q.novo && <Aviso tipo="ok">Agenda criada! Cadastre seus serviços e confira o expediente.</Aviso>}
        {q.ok && <Aviso tipo="ok">{q.ok}</Aviso>}
        {q.erro && <Aviso>{q.erro}</Aviso>}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <section className="cartao !p-0">
          {servicos.length === 0 ? (
            <p className="p-5 text-sm text-apagado">Nenhum serviço ainda.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {servicos.map((s) => (
                <li key={s.id} className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm ${s.ativo ? "" : "opacity-50"}`}>
                  <span className="flex-1">
                    <span className="font-medium">{s.nome}</span>
                    <span className="block text-apagado">
                      {s.duracaoMin} min · {formatarReais(s.precoCentavos)} ·{" "}
                      {s.sinalCentavos > 0 ? `sinal ${formatarReais(s.sinalCentavos)}` : "sem sinal"}
                    </span>
                  </span>
                  <Link href={`/painel/servicos?editar=${s.id}`} className="text-marca hover:underline">
                    Editar
                  </Link>
                  <form action={acaoAlternarServico}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="ativo" value={s.ativo ? "0" : "1"} />
                    <button className="text-apagado hover:text-tinta">{s.ativo ? "Pausar" : "Reativar"}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cartao" aria-labelledby="titulo-form">
          <h2 id="titulo-form" className="mb-3 font-semibold">
            {editando ? `Editar ${editando.nome}` : "Novo serviço"}
          </h2>
          <form key={editando?.id ?? "novo"} action={acaoSalvarServico} className="grid gap-3">
            {editando && <input type="hidden" name="id" value={editando.id} />}
            <div>
              <label htmlFor="nome" className="rotulo">
                Nome
              </label>
              <input id="nome" name="nome" required defaultValue={editando?.nome} className="campo" placeholder="Corte masculino" />
            </div>
            <div>
              <label htmlFor="duracaoMin" className="rotulo">
                Duração (minutos)
              </label>
              <input id="duracaoMin" name="duracaoMin" type="number" min={5} max={600} step={5} required defaultValue={editando?.duracaoMin ?? 45} className="campo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="preco" className="rotulo">
                  Preço (R$)
                </label>
                <input id="preco" name="preco" inputMode="decimal" required defaultValue={editando ? reais(editando.precoCentavos) : ""} className="campo" placeholder="60,00" />
              </div>
              <div>
                <label htmlFor="sinal" className="rotulo">
                  Sinal Pix (R$)
                </label>
                <input id="sinal" name="sinal" inputMode="decimal" defaultValue={editando ? reais(editando.sinalCentavos) : ""} className="campo" placeholder="20,00" />
              </div>
            </div>
            <p className="text-xs text-apagado">Sem sinal, a reserva é confirmada na hora.</p>
            <button className="botao">{editando ? "Salvar" : "Adicionar serviço"}</button>
            {editando && (
              <Link href="/painel/servicos" className="text-center text-sm text-apagado hover:underline">
                Cancelar edição
              </Link>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
