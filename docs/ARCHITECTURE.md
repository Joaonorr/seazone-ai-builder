# Arquitetura

Documento de decisões e responsabilidades. Para instruções de execução, ver o
[README](../README.md); para prompts, contexto e política de IA, ver
[AI_GUIDELINES.md](AI_GUIDELINES.md).

## Divisão de responsabilidades

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Rota / apresentação | `src/app/**` | Resolver parâmetros, renderizar, delimitar as ilhas interativas |
| Acesso a dados | `src/lib/properties.ts`, `src/lib/prisma.ts` | Consulta do imóvel, normalização de campos `Json`, singleton do client |
| Domínio — guia | `src/lib/experience-guide/**` | Prompt, schema, geração, validação, persistência, classificação de erro |
| Domínio — assistente | `src/lib/guest-assistant/**` | Prompt, schema de entrada, montagem de contexto, streaming, handler HTTP |
| Provider de IA | `src/lib/ai.ts` | Instanciação do cliente Gemini e resolução do modelo |

Os Route Handlers não contêm regra de negócio: traduzem HTTP para os serviços e
os erros de domínio de volta para status e mensagens públicas. Os serviços são
construídos por fábricas (`createExperienceGuideService`,
`createGuestAssistantService`, `createGuestAssistantPost`) com dependências
injetáveis, o que permite testar geração, persistência e streaming sem chamar o
provider real. As instâncias padrão exportadas são as usadas em produção.

## Server Components e fronteiras

A página `/[propertyCode]` é um Server Component. Consulta ao banco, montagem de
prompt e chamadas ao Gemini executam apenas no servidor: `DATABASE_URL` e
`GEMINI_API_KEY` nunca são serializadas para o cliente, e o conteúdo do prompt
não é observável nem manipulável pelo navegador. `src/lib/ai.ts` importa
`server-only`, o que transforma qualquer importação acidental no bundle do
cliente em erro de build.

Existem exatamente dois Client Components, ambos montados pela página como
ilhas:

- `experience-guide-generator.tsx` — só é renderizado quando o imóvel não possui
  guia. Controla skeleton, estado de erro e nova tentativa, e deduplica
  requisições concorrentes do mesmo componente com uma `ref` de promessa em voo.
- `guest-assistant.tsx` — chat. Mantém as mensagens apenas na memória da sessão.

Tudo que é conteúdo estático do guia (dados do imóvel, e o Guia de Experiências
quando já persistido) é renderizado no servidor, sem hidratação associada.

## Recuperação do imóvel

`getPropertyByCode` (`src/lib/properties.ts`) executa um único `findUnique` sobre
`Property.code`, com `select` explícito, incluindo a relação `experienceGuide`.
Não há `select: *` em nenhum ponto do código: cada consulta declara os campos que
usa.

Duas normalizações acontecem nessa camada, mantendo os componentes livres de
lógica de dados:

- `amenities` é um objeto `Json` de flags; apenas as chaves conhecidas e com
  valor `true` viram rótulos exibíveis. Chaves desconhecidas são descartadas;
- `images` é um array `Json`; a primeira URL `https` do host esperado é escolhida
  como imagem principal, e o host correspondente é o único autorizado em
  `next.config.ts`. Um array vazio ou inválido resulta em `null` e a página
  renderiza um estado sem imagem.

O `ExperienceGuide` recuperado passa por `safeParseStoredExperienceGuide` antes
de ser exibido. Um registro que não valide é logado e tratado como ausente, o que
significa que a página cai no caminho de geração em vez de renderizar conteúdo
corrompido.

Falha na consulta é convertida em erro genérico e sobe para o error boundary da
rota (`error.tsx`), que oferece nova tentativa. Imóvel inexistente retorna `null`
e a página renderiza `PropertyNotFound` diretamente — ver
[Soft 404](#soft-404-para-código-inexistente).

## Prisma

`src/lib/prisma.ts` mantém o client como singleton em `globalThis` fora de
produção, evitando esgotamento de conexões durante o hot reload. A conexão usa
`@prisma/adapter-pg` sobre `pg`, exigido pelo Prisma 7, e o client é gerado em
`src/generated/prisma` (não versionado; `npm run db:generate` o recria).

`prisma.config.ts` fornece `schema`, caminho de migrations e `datasource.url` a
partir do ambiente — o `schema.prisma` não declara `url` diretamente.

## Modelo de dados

```
Property                       ExperienceGuide
  id        (cuid, PK)   1 ─ 1   id            (cuid, PK)
  code      (unique)             propertyId    (unique, FK → Property.id, cascade)
  ...dados do imóvel             welcomeMessage
  amenities (Json)               restaurants   (Json)
  images    (Json)               attractions   (Json)
                                 essentials    (Json)
                                 seasonalTip
                                 modelName
                                 promptVersion
                                 generatedAt
```

Decisões relevantes:

- `code` é único e é a chave de acesso pública, resolvida diretamente pela URL;
- `propertyId` é único, o que impõe no banco a regra "no máximo um guia vigente
  por imóvel" — a exclusividade não depende de lógica de aplicação;
- as coleções do guia são `Json` em vez de tabelas próprias. Elas sempre são
  lidas e escritas como um documento completo, nunca consultadas ou filtradas
  individualmente; normalizá-las adicionaria três tabelas e joins sem benefício
  no escopo atual. O contrato é garantido pelo schema Zod na entrada e na saída;
- `modelName`, `promptVersion` e `generatedAt` são gravados junto ao conteúdo,
  permitindo identificar com qual modelo e qual versão de prompt cada guia foi
  produzido;
- amenidades e imagens ficam em `Json` no `Property` pelo mesmo motivo: são
  atributos de exibição, não entidades consultáveis.

## Geração e persistência do Guia de Experiências

O fluxo completo, a partir de um imóvel sem guia:

1. A página monta `ExperienceGuideGenerator`, que faz `POST` para
   `/api/properties/{propertyCode}/experience-guide`.
2. O Route Handler normaliza o código (trim + uppercase) e delega para
   `getOrCreateExperienceGuide`.
3. O serviço **reconsulta** o imóvel e seu guia. Essa segunda leitura fecha a
   janela entre a renderização da página e a chamada da API: se outro acesso já
   gerou o guia nesse intervalo, ele é retornado sem custo de IA.
4. Sem guia, `generateText` com `Output.object` produz o conteúdo. O prompt
   recebe apenas o subconjunto público do imóvel (ver AI_GUIDELINES).
5. A saída é validada de novo pelo schema Zod no serviço, independentemente da
   validação do SDK. Saída inválida interrompe o fluxo e nada é gravado.
6. `persistIfAbsent` grava e o registro devolvido pelo banco é reparseado antes
   de virar resposta. O que o cliente recebe é sempre o que está persistido, não
   o que o modelo produziu.

Acessos posteriores nunca chegam ao passo 4: a página encontra o guia na consulta
inicial e o renderiza no servidor.

### Concorrência

A escrita usa `upsert` com `update: {}` sobre a chave única `propertyId`:

- sem registro, cria o guia validado;
- com registro já existente, retorna o existente **sem sobrescrever**;
- em ambos os casos, o serviço devolve o registro definitivo vindo do banco.

A chamada ao Gemini ocorre fora de transação. Duas requisições simultâneas que
consultem o imóvel antes da primeira gravação podem executar duas gerações; a
segunda é descartada. Não há lock, fila nem estado intermediário de "gerando".

O trade-off é deliberado: um lock distribuído ou uma linha de estado
`generating` adicionaria complexidade de expiração e recuperação de travas
órfãs para evitar, no pior caso, uma chamada extra de LLM na primeira visita
concorrente a um imóvel. A garantia que importa — um único guia por imóvel,
estável entre acessos — é dada pela constraint do banco.

Esse comportamento é coberto por teste de integração contra PostgreSQL real,
verificando a contagem de registros e qual conteúdo e modelo prevaleceram.

### Falhas

O serviço classifica internamente: chave ausente, falha do provider, rate limit,
timeout, saída inválida, imóvel inexistente e falha de persistência. A
classificação percorre a cadeia de `cause` e desembrulha `RetryError` para
identificar `APICallError` e abortos.

O Route Handler mapeia essas classes para 404, 429 ou 503, sempre com mensagem
pública neutra. A distinção existe para observabilidade, não para o cliente.

A falha fica contida na seção de experiências: não alcança o error boundary da
rota e não impede o uso do restante do guia nem do assistente.

## Assistente Virtual

### Contexto

O `propertyCode` usado na consulta vem exclusivamente do segmento da URL,
validado por regex (`^[A-Z0-9]+$`, até 20 caracteres). O corpo aceito é
estritamente `{ messages }`, cada mensagem com apenas `role` (`user` ou
`assistant`) e `content`. Mensagens `system`, contexto de imóvel e quaisquer
propriedades extras são rejeitadas pelo `strictObject` do Zod, e
`allowSystemInMessages` permanece desativado no `streamText`.

A consequência é que o navegador não pode descrever, substituir ou contaminar o
contexto: ele só contribui com o histórico da conversa. Uma sessão de FLN001 não
tem como obter dados de GRM001.

A cada requisição, `guest-assistant/service.ts` executa um `findUnique` com
`select` explícito trazendo `Property` e a relação `ExperienceGuide`, e
`guest-assistant/prompt.ts` monta o system prompt versionado apenas com esses
dados.

O chat somente **lê** o guia. O endpoint não inicia geração e não altera o
registro. Quando o guia está ausente ou não valida, os dados operacionais
continuam disponíveis e o prompt instrui o assistente a informar que as
experiências ainda estão sendo preparadas.

Limites: 20 mensagens por requisição e 2.000 caracteres por mensagem. O cliente
já envia apenas as últimas 20; o servidor não confia nisso e revalida.

### Streaming

```
useChat / DefaultChatTransport
   └─► POST /api/properties/{code}/chat
         ├─ valida código e corpo
         ├─ consulta Property + ExperienceGuide
         ├─ monta system prompt
         └─ streamText (abortSignal = request.signal)
              └─ sanitização do stream do provider
                   └─ toUIMessageStream
                        └─ createUIMessageStreamResponse (SSE)
                             └─► renderização progressiva no cliente
```

A sanitização entre o provider e a resposta descarta `text-delta` vazios e
remove `providerMetadata` de cada parte, de modo que metadados opacos do provider
não cheguem ao navegador. `sendReasoning` e `sendSources` ficam desativados.

`request.signal` é repassado como `abortSignal`: fechar a aba ou usar "Parar
resposta" encerra a geração no provider, sem trabalho órfão.

`maxRetries: 0` — a recuperação é explícita, pelo botão de nova tentativa da
interface, e não por retentativa silenciosa que multiplicaria latência e custo.

### Falhas do chat

Falhas **anteriores** à abertura do stream retornam JSON controlado: 400 para
entrada inválida, 404 para imóvel inexistente, 499 para cancelamento e 503 para
banco ou provider indisponível.

Falhas **posteriores**, quando os headers SSE já foram enviados, não podem virar
status HTTP: tornam-se um evento de erro no stream com mensagem pública fixa,
e a interface exibe o bloco de nova tentativa.

O `onError` padrão do `streamText` é substituído por um no-op para impedir que o
SDK imprima a resposta bruta do provider. O log da aplicação contém apenas
`event`, `propertyCode`, `modelName`, `messageCount`, `errorClass` e
`durationMs`, e é emitido uma única vez por stream.

## Soft 404 para código inexistente

`notFound()` dentro da rota dinâmica apresentou, no Next.js 16.3.0 usado pelo
projeto, uma regressão de renderização em produção que resultava em body vazio.
A página passou a renderizar o fallback visual diretamente
(`property-not-found.tsx`), preservando a experiência do hóspede.

O efeito colateral é que um código inexistente responde HTTP 200 em vez de 404.
`app/[propertyCode]/not-found.tsx` reexporta o mesmo componente, de modo que o
tratamento fica idêntico caso o caminho convencional volte a funcionar — a
correção futura é trocar o `return` por `notFound()`, sem mudança visual.

A alternativa foi preferida a introduzir APIs experimentais ou acoplamento de
infraestrutura apenas para recuperar o status HTTP.

## Fronteiras de segurança

- `DATABASE_URL` e `GEMINI_API_KEY` existem apenas no ambiente do servidor;
  nenhuma variável é prefixada com `NEXT_PUBLIC_` e `.env` não é versionado.
- Toda chamada ao provedor de IA parte do servidor. Não há proxy que aceite
  prompt do cliente.
- O conteúdo do prompt é sempre construído no servidor a partir do banco; o
  cliente não contribui com nada além do texto das mensagens do chat.
- O prompt de geração do Guia de Experiências recebe um subconjunto estritamente
  público do imóvel: dados operacionais sensíveis não são enviados ao provider
  nessa operação.
- Logs excluem prompts, mensagens, respostas brutas do provider e credenciais.
- O guia é público por código, conforme o modelo proposto pelo desafio. Em
  produção, o passo natural seria link assinado com expiração ou autenticação
  vinculada à reserva — fora do escopo atual.

## Ambiente Docker

O Compose é um ambiente reproduzível de **desenvolvimento local**, não uma
configuração de produção. A ordenação é explícita por condição, não por espera
arbitrária:

```
postgres  ──(service_healthy)──►  migrate
migrate   ──(completed_successfully)──►  bootstrap
bootstrap ──(completed_successfully)──►  app
```

- `postgres` tem healthcheck com `pg_isready` e volume nomeado para os dados;
- `migrate` roda `prisma migrate deploy` e termina;
- `bootstrap` roda o seed, que é idempotente (`upsert` com `update: {}`): não
  apaga nem sobrescreve dados e pode ser reexecutado. É o que torna
  `docker compose up --build` suficiente em um banco novo;
- `app` roda `next dev` com bind mount do código e volumes nomeados para
  `node_modules` e `.next`, isolando os artefatos do container dos do host.

Os três serviços de aplicação compartilham a mesma imagem
(`node:22-bookworm-slim`), construída uma vez. A porta do PostgreSQL é publicada
em `127.0.0.1` para permitir inspeção local sem expor o banco na rede.

`GEMINI_API_KEY` é a única variável que precisa vir do `.env`; o `DATABASE_URL`
dos containers é montado pelo próprio Compose a partir das credenciais do
serviço `postgres`.

## Decisões de escopo

Escolhas conscientes para o escopo do desafio:

- sem autenticação — o acesso é público por código;
- sem painel administrativo ou edição de conteúdo;
- sem persistência do histórico do chat;
- sem regeneração, versionamento ou expiração do Guia de Experiências;
- sem serviço externo de Places, Maps ou geocodificação;
- apenas FLN001 e GRM001 como fixtures.
