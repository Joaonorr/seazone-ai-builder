# Seazone — Guia Digital do Hóspede

Aplicação desenvolvida para o desafio técnico de AI Builder da Seazone.

Cada imóvel possui um guia próprio acessível por código, reunindo as informações
operacionais da estadia, um Guia de Experiências gerado por IA e contextualizado
pela localização real do imóvel, e um Assistente Virtual que responde em
streaming usando apenas os dados persistidos daquele imóvel.

**Aplicação:** `PENDING_DEPLOY_URL`

## Rotas de avaliação

| Rota | Conteúdo |
| --- | --- |
| `/FLN001` | Apartamento Beira-Mar Florianópolis — Florianópolis/SC |
| `/GRM001` | Chalé Serra Gramado — Gramado/RS |
| `/` | Home mínima com acesso aos dois imóveis de demonstração |

Qualquer outro código exibe uma tela de "imóvel não encontrado" (ver
[Limitações conhecidas](#limitações-conhecidas)).

## Funcionalidades

### Guia do imóvel

Página renderizada no servidor a partir do `propertyCode` da URL: foto principal,
tipo, quartos, banheiros, capacidade, amenidades, rede e senha do Wi-Fi, tipo e
instruções de acesso, código de acesso quando existente, estacionamento (bloco
exibido apenas quando o imóvel possui vaga), horários de check-in/check-out,
regras da estadia, endereço completo e contato do anfitrião.

### Guia de Experiências

Gerado sob demanda pela primeira vez que um imóvel sem guia é acessado, a partir
do endereço real da propriedade. A saída é estruturada e validada antes de ser
gravada: mensagem de boas-vindas, 4–5 restaurantes, 3–4 atrações, 3–6 serviços
essenciais (farmácia, supermercado e hospital obrigatórios) e uma dica sazonal.

O guia é persistido por imóvel e reaproveitado nos acessos seguintes — não há
regeneração a cada visita. Enquanto a geração ocorre, a seção exibe um skeleton;
em caso de falha, exibe um bloco de erro com botão de nova tentativa, sem afetar
o restante da página.

### Assistente Virtual

Chat com respostas em streaming. A cada mensagem, o servidor reconsulta a
`Property` e o `ExperienceGuide` persistido do imóvel identificado pela URL e
monta o contexto — o navegador nunca envia dados do imóvel. O system prompt
define esse contexto como única fonte de verdade e determina que informações
ausentes sejam declaradas como ausentes, não inferidas.

## Stack

- Next.js 16.3 (App Router, Turbopack) e React 19.2
- TypeScript 5 em modo estrito
- Tailwind CSS 4
- PostgreSQL 17
- Prisma 7.9 com `@prisma/adapter-pg`
- AI SDK 7 (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) com Google Gemini
- Zod 4 para validação de saída da LLM e de payloads de API
- Node.js 22, Docker e Docker Compose

## Arquitetura

```
Browser
   │
   ▼
Next.js App Router
   │
   ├── /[propertyCode]  Server Component ──► Prisma ──► PostgreSQL
   │        │
   │        ├── ilha: Experience Guide ──► POST /api/.../experience-guide
   │        │                                  └─► Gemini (generateText + schema)
   │        │                                        └─► validação ──► persistência
   │        │
   │        └── ilha: Guest Assistant ────► POST /api/.../chat
   │                                           ├─► Prisma (Property + ExperienceGuide)
   │                                           └─► Gemini (streamText)
   │                                                 └─► UI message stream (SSE) ──► cliente
   ▼
```

Toda consulta ao banco e toda chamada ao provedor de IA ocorrem no servidor.
Os Client Components existem apenas onde há interatividade: a geração do Guia de
Experiências e o chat.

Detalhes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Fluxo da aplicação

1. `/{propertyCode}` resolve o imóvel por `Property.code` (único) incluindo a
   relação `ExperienceGuide`.
2. Código inexistente renderiza a tela de imóvel não encontrado.
3. Guia presente e válido é renderizado no servidor; guia ausente monta o Client
   Component que dispara `POST /api/properties/{propertyCode}/experience-guide`.
4. O serviço reconsulta o imóvel, gera o conteúdo, valida contra o schema Zod e
   persiste com `upsert` sobre a chave única `propertyId`.
5. O chat envia as últimas mensagens para `POST /api/properties/{propertyCode}/chat`;
   o servidor reconstrói o contexto a partir do banco e devolve um stream SSE.

## Integração com IA

- Provider: Google Gemini via AI SDK.
- Modelo padrão: `gemini-3.5-flash`, sobrescrito por `AI_MODEL`.
- Guia de Experiências: `generateText` com `Output.object` e schema Zod estrito —
  não há parsing de texto livre. Prompt versionado em
  [`src/lib/experience-guide/prompt.ts`](src/lib/experience-guide/prompt.ts).
- Assistente: `streamText` com system prompt versionado em
  [`src/lib/guest-assistant/prompt.ts`](src/lib/guest-assistant/prompt.ts).
- O prompt do Guia de Experiências recebe apenas nome do imóvel, endereço,
  bairro, cidade, estado e data de referência. Senha do Wi-Fi, códigos de acesso
  e telefone do anfitrião não entram nesse prompt.

Detalhes: [`docs/AI_GUIDELINES.md`](docs/AI_GUIDELINES.md).

## Execução

### Com Docker Compose (recomendado)

```bash
cp .env.example .env
# preencher GEMINI_API_KEY
docker compose up --build
```

O Compose sobe quatro serviços em ordem: `postgres` (com healthcheck) →
`migrate` (`prisma migrate deploy`) → `bootstrap` (seed dos imóveis) → `app`
(`next dev`). Banco novo fica pronto sem passo manual adicional.

Aplicação em `http://localhost:3000`. O `DATABASE_URL` dos containers é montado
pelo próprio Compose; o `.env` é usado para `GEMINI_API_KEY` e, opcionalmente,
`AI_MODEL`, `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB`.

O Compose é um ambiente reproduzível de desenvolvimento local — o serviço `app`
roda em modo dev com bind mount do código. Não é uma configuração de produção.

### Sem Compose

Requer Node.js 22 e um PostgreSQL alcançável.

```bash
npm ci
npm run db:generate
npx prisma migrate deploy
npm run db:seed      # necessário em banco vazio
npm run dev
```

Com `DATABASE_URL`, `GEMINI_API_KEY` e, opcionalmente, `AI_MODEL` no ambiente ou
em `.env`.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL. Fora do Compose, aponta para qualquer PostgreSQL compatível. |
| `GEMINI_API_KEY` | Sim | Chave da API Google Gemini. Usada exclusivamente no servidor. |
| `AI_MODEL` | Não | Modelo Gemini. Padrão: `gemini-3.5-flash`. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Não | Sobrescrevem as credenciais do PostgreSQL do Compose. |

Nenhuma dessas variáveis é exposta ao cliente. `.env` não é versionado.

Limites de requisição e custo dependem da conta e do projeto configurados no
provedor.

## Banco de dados

Dois modelos: `Property` (`code` único) e `ExperienceGuide` (`propertyId` único,
relação 1–1 com `Property`, `onDelete: Cascade`). Schema em
[`prisma/schema.prisma`](prisma/schema.prisma), migrations versionadas em
[`prisma/migrations/`](prisma/migrations/).

O seed ([`prisma/seed.ts`](prisma/seed.ts)) é idempotente: usa `upsert` com
`update: {}` para FLN001 e GRM001. Não apaga nem sobrescreve registros
existentes, e pode ser reexecutado com segurança.

```bash
npm run db:migrate:deploy   # aplica migrations
npm run db:seed             # cria FLN001 e GRM001 se ausentes
npm run db:studio           # inspeção
```

## Testes e validação

```bash
npm test              # node:test, 25 testes
npm run lint
npx tsc --noEmit
npm run build
```

`npm test` requer `DATABASE_URL` apontando para um PostgreSQL com as migrations
aplicadas: um dos arquivos é um teste de integração real. Ele cria e remove o
próprio imóvel temporário, sem tocar em FLN001 ou GRM001.

A suíte cobre:

- schema do Guia de Experiências: limites, campos obrigatórios, rejeição de
  Markdown, URLs, telefones, preços e horários;
- construção do prompt de geração, incluindo a exclusão de Wi-Fi, senhas,
  códigos e telefone mesmo quando presentes no objeto de entrada;
- serviço do guia: reuso do guia existente sem chamar a IA, persistência de
  modelo e versão do prompt, saída inválida não persistida, imóvel inexistente,
  falha de geração;
- concorrência da persistência contra PostgreSQL real: duas gerações simultâneas
  resultam em um único registro e o primeiro conteúdo prevalece;
- system prompt do assistente: cobertura das quatro perguntas obrigatórias, não
  mistura de contexto entre FLN001 e GRM001, política anti-alucinação e
  proteção contra prompt injection;
- Route Handler do chat: 400 para payload inválido, `system` e código inválido,
  404 para imóvel inexistente, 503 sem exposição de detalhes técnicos, rejeição
  de contexto vindo do navegador, propagação de `request.signal`;
- streaming: entrega de múltiplos chunks antes da conclusão e sanitização de erro
  assíncrono do provider;
- formato dos logs e limpeza de Markdown residual na renderização.

## Estrutura do projeto

```
src/
  app/
    page.tsx                              home com os imóveis de demonstração
    [propertyCode]/                       guia do imóvel + ilhas interativas
    api/properties/[propertyCode]/
      experience-guide/route.ts           geração e persistência do guia
      chat/route.ts                       chat com streaming
  lib/
    ai.ts                                 provider e modelo Gemini (server-only)
    prisma.ts                             singleton do Prisma Client
    properties.ts                         consulta e normalização do imóvel
    experience-guide/                     prompt, schema, service, errors
    guest-assistant/                      prompt, schema, service, handler, errors
prisma/                                   schema, migrations, seed
tests/                                    node:test
docs/                                     arquitetura e diretrizes de IA
```

## Decisões técnicas

**Banco e IA apenas no servidor.** Chaves de API e string de conexão nunca
alcançam o cliente, e o contexto enviado ao modelo é controlado integralmente
pelo servidor. `src/lib/ai.ts` é marcado com `server-only`.

**Guia de Experiências gerado uma vez e persistido.** A geração ocorre somente
quando não existe guia para o imóvel. Isso garante conteúdo estável entre
acessos, elimina latência de LLM nas visitas seguintes, reduz custo e faz com
que o Assistente Virtual responda a partir exatamente do mesmo conteúdo exibido
ao hóspede.

**Saída estruturada em vez de parsing de texto.** O modelo produz um objeto
conforme schema Zod estrito; a validação acontece antes da persistência e uma
saída inválida nunca é gravada.

**Contexto do chat reconstruído no servidor.** O cliente envia apenas o histórico
de mensagens (`role` e `content`); o `propertyCode` vem do segmento da URL e os
dados do imóvel são reconsultados a cada requisição. Contexto de imóvel enviado
pelo navegador é rejeitado pelo schema.

**Streaming.** Cliente (`useChat`) → Route Handler → `streamText` → UI message
stream → renderização progressiva. `request.signal` é repassado ao provider,
então cancelar a resposta encerra a geração.

**Histórico de conversa não persistido.** As mensagens existem apenas na sessão
do cliente e são reenviadas como contexto (últimas 20, até 2.000 caracteres cada).
Decisão de escopo do desafio.

**Concorrência resolvida no banco.** A escrita do guia usa `upsert` com
`update: {}` sobre a chave única `propertyId`: se duas requisições gerarem
conteúdo simultaneamente, apenas o primeiro é persistido e ambas recebem esse
registro. Não há lock nem fila.

**Sem serviço externo de Places, Maps ou geocodificação.** O modelo é instruído a
sugerir estabelecimentos reais e coerentes com a localização informada, e as
distâncias são estimativas aproximadas. Isso é declarado na própria interface.

## Tratamento de erros

| Cenário | Comportamento |
| --- | --- |
| Código de imóvel inexistente | Tela de imóvel não encontrado com link para a home |
| Banco indisponível na página | Error boundary da rota com botão de nova tentativa |
| Falha ou indisponibilidade do provider na geração | Bloco de erro apenas na seção de experiências, com nova tentativa; o restante do guia permanece utilizável |
| Rate limit do provider na geração | HTTP 429 com mensagem pública neutra |
| Saída inválida da LLM | Rejeitada pela validação e não persistida |
| Payload inválido no chat | HTTP 400 com mensagem genérica |
| Imóvel inexistente no chat | HTTP 404 |
| Falha do chat antes de abrir o stream | HTTP 503 com mensagem pública |
| Falha depois de abrir o stream | Evento de erro com mensagem fixa e botão de nova tentativa na interface |
| Informação ausente no contexto | O assistente declara que não possui a informação |

Erros são registrados como JSON em `stderr` contendo apenas evento, código do
imóvel, modelo, classificação e duração. Prompts, mensagens, respostas brutas do
provider e credenciais nunca são registrados.

## Limitações conhecidas

### Soft 404 para código inexistente

Na versão do Next.js utilizada pelo projeto (16.3.0), `notFound()` dentro da rota
dinâmica apresentou uma regressão de renderização em produção, resultando em body
vazio. O fallback é, portanto, renderizado diretamente pela página, preservando a
experiência do hóspede. Como efeito colateral, esse cenário responde HTTP 200 em
vez de 404. A alternativa evita introduzir APIs experimentais ou acoplamento de
infraestrutura apenas para recuperar o status HTTP.

### Escopo

Decisões conscientes de escopo do desafio, não pendências de implementação:

- não há autenticação — o guia é público por código, conforme o modelo proposto;
- não há painel administrativo nem edição de conteúdo;
- o histórico do chat não é persistido;
- não há regeneração ou expiração do Guia de Experiências;
- apenas FLN001 e GRM001 existem como fixtures.

Em produção, o acesso público por código seria substituído por links assinados
com expiração ou autenticação vinculada à reserva. Fora do escopo atual.

## Documentação técnica

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — divisão de responsabilidades,
  fronteiras server/client, fluxo de geração e persistência, concorrência,
  streaming e ambiente Docker.
- [`docs/AI_GUIDELINES.md`](docs/AI_GUIDELINES.md) — provider e modelo, prompts e
  suas versões, dados que entram e que são excluídos do contexto, schema de
  saída, política anti-alucinação, streaming e tratamento de falhas.
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — requisitos funcionais do
  desafio e critérios de aceite.

## Deploy

A URL pública está no topo deste documento.

O deploy requer um PostgreSQL alcançável com as migrations aplicadas
(`prisma migrate deploy`) e o seed executado uma vez, além de `DATABASE_URL` e
`GEMINI_API_KEY` configuradas como variáveis de ambiente do servidor.
