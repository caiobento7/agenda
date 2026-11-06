# Agenda: SaaS de agendamento com Pix

[![CI](https://github.com/caiobento7/agenda/actions/workflows/ci.yml/badge.svg)](https://github.com/caiobento7/agenda/actions/workflows/ci.yml)

Plataforma em que barbearias, estúdios e personal trainers criam a própria página de agendamento. O cliente escolhe o serviço e o horário, paga um **sinal via Pix** para garantir a vaga e recebe confirmação e lembrete por e-mail. O dono vê a agenda num painel.

**Next.js 16 · TypeScript · PostgreSQL · Drizzle · Mercado Pago · Vitest · Playwright**

## O que tem de interessante

### Nenhum horário duplicado, nem com dois cliques ao mesmo tempo

Conferir "o horário está livre?" no código e depois inserir deixa uma janela para duas pessoas pegarem o mesmo horário. Aqui quem garante é o PostgreSQL, com uma **constraint de exclusão** sobre o intervalo de tempo:

```sql
ALTER TABLE reservas ADD CONSTRAINT reservas_sem_sobreposicao
  EXCLUDE USING gist (negocio_id WITH =, periodo WITH &&)
  WHERE (status IN ('pendente', 'confirmada'));
```

Há um teste que dispara cinco reservas simultâneas para o mesmo horário: uma entra, quatro recebem "horário indisponível".

### Sinal via Pix com reserva temporária

1. A reserva nasce **pendente** e segura o horário por 15 minutos.
2. O Mercado Pago gera o QR Code (API de Pagamentos, com `X-Idempotency-Key` igual ao id da reserva).
3. O **webhook** confere a assinatura `x-signature` (HMAC-SHA256) e, mesmo assim, **consulta o pagamento na API** antes de confirmar: o aviso só diz "olhe este pagamento", quem decide é a API.
4. A confirmação é **idempotente**: o mesmo aviso chegando várias vezes, ou ao mesmo tempo, confirma uma vez só (`SELECT ... FOR UPDATE` no pagamento).
5. Se o Pix cai **depois do prazo** e outra pessoa já pegou o horário, a reserva vira `conflito` (o pagamento fica registrado para o sinal ser devolvido), num savepoint que deixa a constraint falhar sem perder o resto da transação.

### Vários negócios no mesmo banco, isolados por RLS

Cada negócio é um "inquilino". As telas rodam com o papel `agenda_app` e o id do negócio na sessão do PostgreSQL; as políticas de **Row Level Security** filtram toda consulta por esse id:

```sql
CREATE POLICY reservas_do_negocio ON reservas TO agenda_app
  USING (negocio_id = negocio_atual()) WITH CHECK (negocio_id = negocio_atual());
```

Ou seja, mesmo que um bug mande o id de um serviço de outro negócio, a linha simplesmente não existe para aquela sessão. Os testes provam que um negócio não lê, não altera e não insere dados de outro.

### Agenda com fuso horário

O expediente é cadastrado no horário local do negócio ("terça, 9h às 12h e 13h às 19h") e as reservas são guardadas como instantes absolutos (`timestamptz`). O cálculo dos horários livres é uma **função pura** (`src/lib/agenda/horarios-livres.ts`) que considera expediente com vários turnos, duração do serviço, folga entre atendimentos, antecedência mínima, janela de dias, bloqueios e reservas. Funciona em fusos com horário de verão: o teste do dia em que o relógio pula de 2h para 3h em Nova York confere que 2h30 não é oferecido.

### Lembretes que não duplicam

Um cron diário (`vercel.json`) chama `/api/cron/lembretes`. Cada reserva é "reivindicada" com `UPDATE ... RETURNING` antes do envio, então duas execuções simultâneas não mandam o mesmo e-mail; se o envio falha, a reivindicação é desfeita e a próxima rodada tenta de novo.

## Rodando

Precisa do Node.js 24. **Não precisa instalar banco**: sem `DATABASE_URL`, o projeto usa o [PGlite](https://pglite.dev), o PostgreSQL compilado para WebAssembly rodando dentro do Node (com a extensão `btree_gist` e RLS, igual ao de produção).

```bash
npm install
npm run seed      # cria o "Studio Exemplo" com três serviços
npm run dev
```

- Página pública: http://localhost:3000/studio-exemplo
- Painel: http://localhost:3000/entrar com `demo@agenda.dev` / `demonstracao`

O Pix começa no **modo simulado**: a página do pagamento mostra o botão "Simular pagamento do Pix", que segue o mesmo caminho do webhook real. Para usar o Mercado Pago, veja o `.env.example` (`PAYMENT_PROVIDER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`).

### Produção (Vercel + Neon)

1. Crie um banco PostgreSQL (Neon, Supabase...) e defina `DATABASE_URL`, `SESSION_SECRET`, `APP_URL` e `CRON_SECRET`.
2. Rode as migrações uma vez: `DATABASE_URL=... npm run db:migrate` (e `npm run seed` se quiser a demonstração).
3. No painel do Mercado Pago, cadastre o webhook em `https://seu-dominio/api/webhooks/mercadopago` (evento "Pagamentos").

## Testes

```bash
npm test          # 60 testes (Vitest): regra de agenda, fuso, reservas, Pix, RLS, lembretes, conta
npm run test:e2e  # Playwright: fluxo completo no navegador, no computador e no celular
```

Os testes de integração usam o PGlite em memória. No CI, a mesma suíte roda também contra um **PostgreSQL 17 de verdade**, e o Playwright sobe o build de produção para testar:

- reservar e pagar o Pix (simulado);
- serviço sem sinal confirmando na hora e o horário sumindo da lista;
- login do dono e a reserva aparecendo no painel;
- cadastro de um negócio novo até o serviço aparecer na página pública.

## Estrutura

```text
drizzle/                         Migrações: tabelas, constraint de exclusão, papel e políticas de RLS
src/db/                          Schema do Drizzle e conexão (PostgreSQL ou PGlite), comoSistema / comoNegocio
src/lib/agenda/horarios-livres.ts  Cálculo dos horários (função pura)
src/lib/reservas.ts              Criar reserva, confirmar pagamento, lembretes
src/lib/pagamentos/              Mercado Pago, provedor simulado e a interface comum
src/lib/tempo.ts                 Datas no fuso do negócio, só com Intl
src/app/[slug]/                  Página pública de agendamento e página do Pix
src/app/painel/                  Painel do dono: agenda, serviços, expediente e bloqueios
src/app/api/                     Webhook do Mercado Pago, cron de lembretes e status da reserva
tests/  e2e/                     Vitest e Playwright
```

## Decisões

- **Dinheiro em centavos inteiros** (`integer`), nunca em ponto flutuante.
- **A chamada ao Mercado Pago fica fora da transação**: o banco não fica travado esperando a internet. Se o Pix não puder ser gerado, a reserva é cancelada e o horário volta.
- **Sessão em cookie `httpOnly`** com JWT assinado (HS256) e senha com **scrypt**; o login confere a senha mesmo para e-mail inexistente, para o tempo de resposta não revelar quem tem conta.
- **Server Actions** para os formulários, sempre pegando o negócio da sessão, nunca do formulário.

---

Feito por [Caio Bento](https://caiobento.vercel.app).
