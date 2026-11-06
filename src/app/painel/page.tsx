import { SeloStatus } from "@/components/ui";
import { formatarReais } from "@/lib/dinheiro";
import { reservasDoPeriodo } from "@/lib/reservas";
import { exigirConta } from "@/lib/sessao";
import { formatarDataLonga, formatarHora, partesLocais, somarDias } from "@/lib/tempo";
import { acaoCancelarReserva } from "./acoes";

const DIAS = 14;

export default async function Agenda() {
  const { negocio } = await exigirConta();
  const hoje = partesLocais(new Date(), negocio.fuso).data;
  const linhas = await reservasDoPeriodo(negocio.id, negocio.fuso, hoje, somarDias(hoje, DIAS - 1));
  const porDia = new Map<string, typeof linhas>();
  for (const l of linhas) {
    const dia = partesLocais(l.reserva.inicio, negocio.fuso).data;
    porDia.set(dia, [...(porDia.get(dia) ?? []), l]);
  }
  const confirmadas = linhas.filter((l) => l.reserva.status === "confirmada");
  const sinais = confirmadas.reduce((t, l) => t + l.reserva.sinalCentavos, 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-apagado">Próximos {DIAS} dias</p>
        </div>
        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-apagado">Confirmadas</dt>
            <dd className="text-xl font-bold">{confirmadas.length}</dd>
          </div>
          <div>
            <dt className="text-apagado">Sinais recebidos</dt>
            <dd className="text-xl font-bold">{formatarReais(sinais)}</dd>
          </div>
        </dl>
      </div>

      {porDia.size === 0 && (
        <div className="cartao text-center text-apagado">
          Nenhuma reserva nos próximos dias. Divulgue sua página: <strong className="text-tinta">/{negocio.slug}</strong>
        </div>
      )}

      <div className="grid gap-4">
        {[...porDia].map(([dia, reservas]) => (
          <section key={dia} className="cartao !p-0" aria-label={dia}>
            <h2 className="border-b border-linha px-5 py-3 text-sm font-semibold first-letter:uppercase">
              {formatarDataLonga(reservas[0].reserva.inicio, negocio.fuso)}
            </h2>
            <ul className="divide-y divide-linha">
              {reservas.map(({ reserva, servico }) => (
                <li key={reserva.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
                  <span className="w-24 font-semibold tabular-nums">
                    {formatarHora(reserva.inicio, negocio.fuso)}–{formatarHora(reserva.fim, negocio.fuso)}
                  </span>
                  <span className="min-w-40 flex-1">
                    <span className="font-medium">{reserva.clienteNome}</span>
                    <span className="text-apagado"> · {servico.nome}</span>
                    <span className="block text-xs text-apagado">
                      {reserva.clienteEmail}
                      {reserva.clienteTelefone ? ` · ${reserva.clienteTelefone}` : ""}
                    </span>
                  </span>
                  <SeloStatus status={reserva.status} />
                  {reserva.status === "confirmada" && (
                    <form action={acaoCancelarReserva}>
                      <input type="hidden" name="id" value={reserva.id} />
                      <button className="text-xs text-apagado underline hover:text-rose-700">Cancelar</button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
