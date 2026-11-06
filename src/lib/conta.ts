import { eq } from "drizzle-orm";
import { z } from "zod";
import { codigoPg, comoSistema, schema, VIOLA_UNICO } from "../db/index.ts";
import { conferirSenha, gerarHashSenha } from "./senha.ts";

/** Endereços que não podem virar página de negócio porque são rotas do próprio site. */
const RESERVADOS = new Set(["painel", "entrar", "cadastro", "sair", "api", "admin", "_next", "reserva", "sobre", "ajuda"]);

export const esquemaSlug = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O endereço precisa de pelo menos 3 caracteres.")
  .max(40)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífen.")
  .refine((s) => !RESERVADOS.has(s), "Esse endereço é reservado.");

const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.email("E-mail inválido.").max(120).transform((e) => e.toLowerCase()),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(200),
  nomeNegocio: z.string().trim().min(2, "Informe o nome do negócio.").max(80),
  slug: esquemaSlug,
});

export type ResultadoConta = { ok: true; usuarioId: string } | { ok: false; erro: string };

/** Expediente inicial de um negócio novo: terça a sexta 9h-12h e 13h-19h, sábado 9h-14h. */
const EXPEDIENTE_PADRAO = [
  ...[2, 3, 4, 5].flatMap((dia) => [
    { diaSemana: dia, inicioMin: 9 * 60, fimMin: 12 * 60 },
    { diaSemana: dia, inicioMin: 13 * 60, fimMin: 19 * 60 },
  ]),
  { diaSemana: 6, inicioMin: 9 * 60, fimMin: 14 * 60 },
];

export async function cadastrar(entrada: z.input<typeof esquemaCadastro>): Promise<ResultadoConta> {
  const v = esquemaCadastro.safeParse(entrada);
  if (!v.success) return { ok: false, erro: v.error.issues[0]?.message ?? "Dados inválidos." };
  const d = v.data;
  const senhaHash = await gerarHashSenha(d.senha);
  try {
    const usuarioId = await comoSistema(async (tx) => {
      const [usuario] = await tx.insert(schema.usuarios).values({ nome: d.nome, email: d.email, senhaHash }).returning();
      const [negocio] = await tx
        .insert(schema.negocios)
        .values({ donoId: usuario.id, nome: d.nomeNegocio, slug: d.slug })
        .returning();
      await tx.insert(schema.expedientes).values(EXPEDIENTE_PADRAO.map((f) => ({ ...f, negocioId: negocio.id })));
      return usuario.id;
    });
    return { ok: true, usuarioId };
  } catch (erro) {
    if (codigoPg(erro) === VIOLA_UNICO) return { ok: false, erro: "Esse e-mail ou endereço de página já está em uso." };
    throw erro;
  }
}

export async function entrar(email: string, senha: string): Promise<ResultadoConta> {
  const [usuario] = await comoSistema((tx) =>
    tx.select().from(schema.usuarios).where(eq(schema.usuarios.email, email.trim().toLowerCase())),
  );
  // Confere a senha mesmo sem usuário, para o tempo de resposta não revelar quais e-mails existem.
  const ok = await conferirSenha(senha, usuario?.senhaHash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  return usuario && ok ? { ok: true, usuarioId: usuario.id } : { ok: false, erro: "E-mail ou senha incorretos." };
}

export async function negocioDoUsuario(usuarioId: string) {
  const [linha] = await comoSistema((tx) =>
    tx
      .select({ negocio: schema.negocios, usuario: { nome: schema.usuarios.nome, email: schema.usuarios.email } })
      .from(schema.negocios)
      .innerJoin(schema.usuarios, eq(schema.usuarios.id, schema.negocios.donoId))
      .where(eq(schema.negocios.donoId, usuarioId)),
  );
  return linha ?? null;
}
