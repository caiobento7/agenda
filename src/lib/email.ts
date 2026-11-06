export type Email = { para: string; assunto: string; texto: string };

/** E-mails "enviados" sem provedor configurado: aparecem no log e ficam aqui (útil em testes). */
export const caixaDeSaida: Email[] = [];

/** Envia pelo Resend quando RESEND_API_KEY existe; senão só registra no log. */
export async function enviarEmail(email: Email): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    caixaDeSaida.push(email);
    console.info(`[e-mail] para ${email.para}: ${email.assunto}`);
    return;
  }
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Agenda <onboarding@resend.dev>",
      to: email.para,
      subject: email.assunto,
      text: email.texto,
    }),
  });
  if (!resposta.ok) throw new Error(`Resend respondeu ${resposta.status}: ${await resposta.text()}`);
}
