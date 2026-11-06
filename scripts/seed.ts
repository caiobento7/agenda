import { garantirDemonstracao, DEMO } from "../src/lib/demonstracao.ts";

const resultado = await garantirDemonstracao();
console.log(
  resultado === "criado"
    ? `Demonstração criada: /${DEMO.slug} (painel: ${DEMO.email} / ${DEMO.senha})`
    : `A demonstração já existia: /${DEMO.slug}`,
);
process.exit(0);
