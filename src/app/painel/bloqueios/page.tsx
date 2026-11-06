import { Aviso } from "@/components/ui";
import { bloqueiosFuturos } from "@/lib/painel";
import { exigirConta } from "@/lib/sessao";
import { formatarDataLonga, formatarHora, partesLocais } from "@/lib/tempo";
import { acaoCriarBloqueio, acaoRemoverBloqueio } from "../acoes";

type Props = { searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function Bloqueios({ searchParams }: Props) {
  const { negocio } = await exigirConta();
  const q = await searchParams;
  const bloqueios = await bloqueiosFuturos(negocio.id);
  const fuso = negocio.fuso;
  const hoje = partesLocais(new Date(), fuso).data;

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">Bloqueios</h1>
      <p className="mb-4 text-sm text-apagado">Folgas, feriados e compromissos: nesses períodos ninguém consegue reservar.</p>
      <div className="mb-4 grid gap-2">
        {q.ok && <Aviso tipo="ok">{q.ok}</Aviso>}
        {q.erro && <Aviso>{q.erro}</Aviso>}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <section className="cartao !p-0">
          {bloqueios.length === 0 ? (
            <p className="p-5 text-sm text-apagado">Nenhum bloqueio futuro.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {bloqueios.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex-1">
                    <span className="inline-block font-medium first-letter:uppercase">{formatarDataLonga(b.inicio, fuso)}</span>
                    <span className="text-apagado">
                      {" "}
                      · {formatarHora(b.inicio, fuso)} às {formatarHora(b.fim, fuso)}
                      {b.motivo ? ` · ${b.motivo}` : ""}
                    </span>
                  </span>
                  <form action={acaoRemoverBloqueio}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="text-apagado hover:text-rose-700">Remover</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cartao" aria-labelledby="titulo-novo">
          <h2 id="titulo-novo" className="mb-3 font-semibold">
            Novo bloqueio
          </h2>
          <form action={acaoCriarBloqueio} className="grid gap-3">
            <div>
              <label htmlFor="data" className="rotulo">
                Dia
              </label>
              <input id="data" name="data" type="date" min={hoje} required className="campo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="inicio" className="rotulo">
                  De
                </label>
                <input id="inicio" name="inicio" type="time" className="campo" />
              </div>
              <div>
                <label htmlFor="fim" className="rotulo">
                  Até
                </label>
                <input id="fim" name="fim" type="time" className="campo" />
              </div>
            </div>
            <p className="text-xs text-apagado">Sem horário, o dia inteiro fica bloqueado.</p>
            <div>
              <label htmlFor="motivo" className="rotulo">
                Motivo <span className="font-normal text-apagado">(opcional)</span>
              </label>
              <input id="motivo" name="motivo" maxLength={80} className="campo" placeholder="Feriado" />
            </div>
            <button className="botao">Bloquear</button>
          </form>
        </section>
      </div>
    </>
  );
}
