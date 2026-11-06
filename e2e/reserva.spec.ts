import { expect, test, type Page } from "@playwright/test";

const unico = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** Escolhe serviço, o primeiro dia aberto e o primeiro horário livre. Devolve o horário escolhido. */
async function escolherHorario(page: Page, servico: string) {
  await page.goto("/studio-exemplo");
  await page.locator("a", { has: page.getByText(servico, { exact: true }) }).click();
  const regiaoDia = page.getByRole("region", { name: "Dia", exact: true });
  await expect(regiaoDia).toBeVisible();
  const dias = await regiaoDia.getByRole("link").evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
  // O primeiro dia aberto pode não ter mais horário (já passou do expediente): tenta os seguintes.
  for (const dia of dias) {
    await page.goto(dia);
    const horarios = page.getByRole("region", { name: "Horário", exact: true }).getByRole("link");
    await expect(page.getByRole("region", { name: "Horário", exact: true })).toBeVisible();
    if ((await horarios.count()) === 0) continue;
    const hora = (await horarios.first().textContent())!.trim();
    await horarios.first().click();
    await expect(page.getByRole("region", { name: "Seus dados", exact: true })).toBeVisible();
    return hora;
  }
  throw new Error("Nenhum horário livre na agenda de demonstração.");
}

test("cliente reserva, paga o sinal via Pix e a reserva é confirmada", async ({ page }) => {
  await escolherHorario(page, "Corte");
  await page.getByLabel("Nome").fill("Cliente Pix");
  await page.getByLabel("E-mail").fill(`pix${unico()}@teste.dev`);
  await page.getByRole("button", { name: /Reservar e pagar sinal de R\$ 20,00/ }).click();

  await expect(page).toHaveURL(/\/studio-exemplo\/reserva\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Aguardando Pix")).toBeVisible();
  await expect(page.getByRole("img", { name: "QR Code do Pix" })).toBeVisible();
  await expect(page.getByLabel("Código Pix copia e cola")).toHaveValue(/^PIX-SIMULADO/);

  await page.getByRole("button", { name: "Simular pagamento do Pix" }).click();
  await expect(page.getByText("Tudo certo! Reserva confirmada.")).toBeVisible();
  await expect(page.getByText("Confirmada", { exact: true })).toBeVisible();
});

test("serviço sem sinal confirma na hora e o horário some da lista", async ({ page }) => {
  const hora = await escolherHorario(page, "Barba");
  const paginaDoDia = page.url().replace(/&hora=.*$/, "");
  await page.getByLabel("Nome").fill("Cliente Barba");
  await page.getByLabel("E-mail").fill(`barba${unico()}@teste.dev`);
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByText("Tudo certo! Reserva confirmada.")).toBeVisible();

  await page.goto(paginaDoDia);
  await expect(page.getByRole("region", { name: "Horário", exact: true }).getByRole("link", { name: hora, exact: true })).toHaveCount(0);
});

test("dono entra no painel e vê a reserva", async ({ page }) => {
  const email = `painel${unico()}@teste.dev`;
  await escolherHorario(page, "Barba");
  await page.getByLabel("Nome").fill("Cliente do Painel");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByText("Tudo certo! Reserva confirmada.")).toBeVisible();

  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill("demo@agenda.dev");
  await page.getByLabel("Senha").fill("demonstracao");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByText(email)).toBeVisible();
});

test("senha errada não entra e painel sem login volta para o login", async ({ page }) => {
  await page.goto("/painel");
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel("E-mail").fill("demo@agenda.dev");
  await page.getByLabel("Senha").fill("errada123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
});

test("novo negócio cria a agenda, cadastra um serviço e ele aparece na página pública", async ({ page }) => {
  const slug = `estudio-${unico()}`;
  await page.goto("/cadastro");
  await page.getByLabel("Seu nome").fill("Rita");
  await page.getByLabel("E-mail").fill(`${slug}@teste.dev`);
  await page.getByLabel("Senha").fill("senha-da-rita");
  await page.getByLabel("Nome do negócio").fill("Estúdio da Rita");
  await page.getByLabel("Endereço da sua página").fill(slug);
  await page.getByRole("button", { name: "Criar minha agenda" }).click();

  await expect(page.getByText("Agenda criada!")).toBeVisible();
  await page.getByLabel("Nome").fill("Design de sobrancelha");
  await page.getByLabel("Duração (minutos)").fill("40");
  await page.getByLabel("Preço (R$)").fill("55,00");
  await page.getByLabel("Sinal Pix (R$)").fill("15,00");
  await page.getByRole("button", { name: "Adicionar serviço" }).click();
  await expect(page.getByText("Serviço criado.")).toBeVisible();

  await page.goto(`/${slug}`);
  await expect(page.getByRole("heading", { name: "Estúdio da Rita" })).toBeVisible();
  await expect(page.locator("a", { has: page.getByText("Design de sobrancelha", { exact: true }) })).toContainText("R$ 55,00");
});
