import { enviarLembretes } from "@/lib/reservas";

export const dynamic = "force-dynamic";

/** Chamada pelo cron da Vercel (vercel.json), que manda o CRON_SECRET no cabeçalho Authorization. */
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return Response.json({ erro: "Não autorizado." }, { status: 401 });
  }
  return Response.json(await enviarLembretes());
}
