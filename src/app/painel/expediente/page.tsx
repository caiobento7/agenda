import { Aviso } from "@/components/ui";
import { expedienteDoNegocio } from "@/lib/painel";
import { exigirConta } from "@/lib/sessao";
import { minutosParaHora } from "@/lib/tempo";
import { acaoSalvarExpediente, acaoSalvarRegras } from "../acoes";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const FUSOS = ["America/Sao_Paulo", "America/Manaus", "America/Cuiaba", "America/Recife", "America/Rio_Branco", "America/Noronha"];

type Props = { searchParams: Promise<{ ok?: string; erro?: string }> };

export default async function Expediente({ searchParams }: Props) {
  const { negocio } = await exigirConta();
  const q = await searchParams;
  const faixas = await expedienteDoNegocio(negocio.id);
  const doDia = (dia: number) => faixas.filter((f) => f.diaSemana === dia);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Expediente</h1>
      <div className="mb-4 grid gap-2">
        {q.ok && <Aviso tipo="ok">{q.ok}</Aviso>}
        {q.erro && <Aviso>{q.erro}</Aviso>}
      </div>

      <section className="cartao" aria-labelledby="titulo-semana">
        <h2 id="titulo-semana" className="mb-1 font-semibold">
          Horário de atendimento
        </h2>
        <p className="mb-4 text-sm text-apagado">Deixe em branco os dias fechados. O segundo turno é opcional (ex.: depois do almoço).</p>
        <form action={acaoSalvarExpediente} className="grid gap-2">
          {DIAS.map((nome, dia) => {
            const [t1, t2] = doDia(dia);
            const campo = (n: string, valor?: number) => (
              <input
                name={n}
                type="time"
                step={300}
                defaultValue={valor !== undefined ? minutosParaHora(valor) : ""}
                aria-label={`${nome} ${n.includes("i") ? "início" : "fim"} ${n.endsWith("1") ? "1º turno" : "2º turno"}`}
                className="campo !w-28 !py-1.5"
              />
            );
            return (
              <div key={dia} className="flex flex-wrap items-center gap-2 border-b border-linha pb-2 text-sm last:border-0">
                <span className="w-20 font-medium">{nome}</span>
                {campo(`d${dia}i1`, t1?.inicioMin)}
                <span className="text-apagado">às</span>
                {campo(`d${dia}f1`, t1?.fimMin)}
                <span className="px-1 text-apagado">e</span>
                {campo(`d${dia}i2`, t2?.inicioMin)}
                <span className="text-apagado">às</span>
                {campo(`d${dia}f2`, t2?.fimMin)}
              </div>
            );
          })}
          <button className="botao mt-2 justify-self-start">Salvar expediente</button>
        </form>
      </section>

      <section className="cartao mt-4" aria-labelledby="titulo-regras">
        <h2 id="titulo-regras" className="mb-4 font-semibold">
          Regras da agenda
        </h2>
        <form action={acaoSalvarRegras} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="intervaloMin" className="rotulo">
              Horários a cada (min)
            </label>
            <input id="intervaloMin" name="intervaloMin" type="number" min={5} max={120} step={5} defaultValue={negocio.intervaloMin} className="campo" />
          </div>
          <div>
            <label htmlFor="folgaMin" className="rotulo">
              Folga entre atendimentos (min)
            </label>
            <input id="folgaMin" name="folgaMin" type="number" min={0} max={120} step={5} defaultValue={negocio.folgaMin} className="campo" />
          </div>
          <div>
            <label htmlFor="antecedenciaHoras" className="rotulo">
              Antecedência mínima (horas)
            </label>
            <input id="antecedenciaHoras" name="antecedenciaHoras" type="number" min={0} max={168} defaultValue={Math.round(negocio.antecedenciaMin / 60)} className="campo" />
          </div>
          <div>
            <label htmlFor="janelaDias" className="rotulo">
              Agenda aberta por (dias)
            </label>
            <input id="janelaDias" name="janelaDias" type="number" min={1} max={180} defaultValue={negocio.janelaDias} className="campo" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="fuso" className="rotulo">
              Fuso horário
            </label>
            <select id="fuso" name="fuso" defaultValue={negocio.fuso} className="campo">
              {[...new Set([negocio.fuso, ...FUSOS])].map((f) => (
                <option key={f} value={f}>
                  {f.replace("America/", "").replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <button className="botao justify-self-start">Salvar regras</button>
        </form>
      </section>
    </>
  );
}
