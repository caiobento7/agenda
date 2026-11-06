import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const N = 16384;

function derivar(senha: string, sal: Buffer, n: number): Promise<Buffer> {
  return new Promise((ok, falha) => scrypt(senha, sal, 64, { N: n, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? falha(e) : ok(k))));
}

/** scrypt com sal aleatório. Formato guardado: scrypt$N$sal$hash (base64). */
export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, N);
  return `scrypt$${N}$${sal.toString("base64")}$${hash.toString("base64")}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [algoritmo, n, sal, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !n || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = await derivar(senha, Buffer.from(sal, "base64"), Number(n));
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("Defina SESSION_SECRET com pelo menos 32 caracteres.");
    return new TextEncoder().encode("segredo-so-para-desenvolvimento-local-000");
  }
  return new TextEncoder().encode(segredo);
}

export const DURACAO_SESSAO_DIAS = 30;

/** Token da sessão do painel: JWT assinado (HS256) com o id do usuário. */
export async function criarTokenSessao(usuarioId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(usuarioId)
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_SESSAO_DIAS}d`)
    .sign(chave());
}

export async function lerTokenSessao(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
