import { beforeEach, describe, expect, it } from "vitest";
import { comoNegocio, schema } from "../src/db/index.ts";
import { cadastrar, entrar, negocioDoUsuario } from "../src/lib/conta.ts";
import { formatarReais, lerReais } from "../src/lib/dinheiro.ts";
import { salvarExpediente, salvarServico, servicosDoNegocio } from "../src/lib/painel.ts";
import { criarTokenSessao, lerTokenSessao } from "../src/lib/senha.ts";
import { bancoLimpo } from "./ajuda.ts";

const dados = { nome: "Carla", email: "Carla@Studio.dev", senha: "uma-senha-boa", nomeNegocio: "Studio Carla", slug: "studio-carla" };

beforeEach(async () => {
  await bancoLimpo();
});

describe("cadastro e login", () => {
  it("cria o usuário, o negócio e um expediente padrão", async () => {
    const r = await cadastrar(dados);
    expect(r.ok).toBe(true);
    const conta = await negocioDoUsuario((r as { usuarioId: string }).usuarioId);
    expect(conta?.negocio.slug).toBe("studio-carla");
    expect(conta?.usuario.email).toBe("carla@studio.dev");
    const expediente = await comoNegocio(conta!.negocio.id, (tx) => tx.select().from(schema.expedientes));
    expect(expediente.length).toBe(9);
  });

  it("e-mail e endereço não se repetem", async () => {
    await cadastrar(dados);
    expect(await cadastrar({ ...dados, slug: "outro" })).toEqual({ ok: false, erro: "Esse e-mail ou endereço de página já está em uso." });
    expect(await cadastrar({ ...dados, email: "x@y.dev" })).toMatchObject({ ok: false });
  });

  it("valida endereço da página e senha", async () => {
    expect(await cadastrar({ ...dados, slug: "painel" })).toEqual({ ok: false, erro: "Esse endereço é reservado." });
    expect(await cadastrar({ ...dados, slug: "Studio Carla" })).toMatchObject({ ok: false, erro: "Use só letras minúsculas, números e hífen." });
    expect(await cadastrar({ ...dados, senha: "curta" })).toMatchObject({ ok: false });
  });

  it("entra com a senha certa, sem diferenciar maiúsculas no e-mail", async () => {
    const r = await cadastrar(dados);
    expect(await entrar("CARLA@studio.dev", "uma-senha-boa")).toEqual(r);
    expect(await entrar("carla@studio.dev", "errada")).toEqual({ ok: false, erro: "E-mail ou senha incorretos." });
    expect(await entrar("ninguem@studio.dev", "uma-senha-boa")).toEqual({ ok: false, erro: "E-mail ou senha incorretos." });
  });

  it("token de sessão assinado", async () => {
    const token = await criarTokenSessao("usuario-1");
    expect(await lerTokenSessao(token)).toBe("usuario-1");
    expect(await lerTokenSessao(token.slice(0, -2) + "xx")).toBeNull();
    expect(await lerTokenSessao(undefined)).toBeNull();
  });
});

describe("painel", () => {
  async function negocio() {
    const r = await cadastrar(dados);
    return (await negocioDoUsuario((r as { usuarioId: string }).usuarioId))!.negocio;
  }

  it("cadastra serviço com preço e sinal em reais", async () => {
    const n = await negocio();
    expect(await salvarServico(n.id, { nome: "Escova", duracaoMin: "40", preco: "79,90", sinal: "20" })).toEqual({ ok: true });
    const [s] = await servicosDoNegocio(n.id);
    expect(s).toMatchObject({ nome: "Escova", duracaoMin: 40, precoCentavos: 7990, sinalCentavos: 2000 });
  });

  it("recusa sinal maior que o preço e valor malformado", async () => {
    const n = await negocio();
    expect(await salvarServico(n.id, { nome: "Escova", duracaoMin: 40, preco: "50", sinal: "60" })).toMatchObject({ ok: false });
    expect(await salvarServico(n.id, { nome: "Escova", duracaoMin: 40, preco: "abc", sinal: "" })).toMatchObject({ ok: false });
  });

  it("troca o expediente e recusa faixas que se cruzam", async () => {
    const n = await negocio();
    expect(
      await salvarExpediente(n.id, [
        { diaSemana: 1, inicio: "09:00", fim: "12:00" },
        { diaSemana: 1, inicio: "11:00", fim: "15:00" },
      ]),
    ).toEqual({ ok: false, erro: "Duas faixas do mesmo dia estão se cruzando." });
    expect(await salvarExpediente(n.id, [{ diaSemana: 1, inicio: "08:00", fim: "17:30" }, { diaSemana: 3, inicio: "", fim: "" }])).toEqual({ ok: true });
    const expediente = await comoNegocio(n.id, (tx) => tx.select().from(schema.expedientes));
    expect(expediente.map((f) => [f.diaSemana, f.inicioMin, f.fimMin])).toEqual([[1, 480, 1050]]);
  });
});

describe("dinheiro", () => {
  it("formata e lê reais em centavos", () => {
    expect(formatarReais(2990)).toBe("R$ 29,90");
    expect(lerReais("29,90")).toBe(2990);
    expect(lerReais("R$ 29.9")).toBe(2990);
    expect(lerReais("30")).toBe(3000);
    expect(lerReais("1.234,56")).toBeNull();
    expect(lerReais("-5")).toBeNull();
  });
});
