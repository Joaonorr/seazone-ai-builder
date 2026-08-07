# Arquitetura

## Guia de Experiências

A página `/{propertyCode}` permanece como Server Component. A consulta do imóvel inclui o `ExperienceGuide` relacionado:

- quando o registro existe e é válido, o conteúdo é renderizado imediatamente no servidor;
- quando não existe, somente a seção de experiências monta um Client Component;
- o Client Component chama `POST /api/properties/{propertyCode}/experience-guide`, controla skeleton, falha e nova tentativa;
- falhas da IA não alcançam o error boundary geral nem impedem o uso das outras seções do imóvel.

O Route Handler delega a operação para `src/lib/experience-guide/service.ts`. Antes de gerar, o serviço consulta novamente o imóvel e seu guia. A Gemini recebe somente nome do imóvel e os campos públicos necessários do endereço. A saída é gerada com `generateText` e `Output.object`, validada pelo schema Zod e só então enviada à persistência.

### Persistência e concorrência

`ExperienceGuide.propertyId` permanece único. A escrita usa `upsert` com `update: {}`:

- se não houver registro, cria o guia validado;
- se outra requisição já tiver criado o registro, retorna o registro existente sem atualizar seu conteúdo;
- depois do `upsert`, o serviço sempre devolve o registro definitivo retornado pelo banco.

A chamada à Gemini ocorre fora de transação. Duas requisições simultâneas que consultem o imóvel antes da primeira gravação podem realizar duas chamadas de geração. Não há lock, fila ou estado intermediário de geração. Somente o primeiro conteúdo persistido prevalece; a segunda resposta recebe esse primeiro registro, que não é sobrescrito.

Esse comportamento é coberto por teste de integração com PostgreSQL real, incluindo contagem de registros e verificação do conteúdo e modelo vencedores.

### Falhas

O servidor classifica internamente chave ausente, falha do provider, rate limit, timeout, saída inválida, imóvel inexistente e falha de persistência. Os logs são registros JSON sem prompt, resposta bruta, chave ou dados sensíveis. O cliente recebe apenas uma mensagem amigável e pode tentar novamente.

## Assistente Virtual

A página `/{propertyCode}` continua sendo um Server Component e renderiza somente `guest-assistant.tsx` como ilha interativa. O Client Component mantém mensagens e estado de carregamento apenas na memória da sessão atual. Conversas não são persistidas por decisão de escopo.

O fluxo de uma pergunta é:

1. `useChat`, por meio de `DefaultChatTransport`, envia as últimas 20 mensagens textuais para `POST /api/properties/{propertyCode}/chat`;
2. o Route Handler normaliza e valida o código da URL e valida o corpo estrito com Zod;
3. `guest-assistant/service.ts` consulta novamente `Property` e o `ExperienceGuide` relacionado com um único `findUnique` e `select` explícito;
4. `guest-assistant/prompt.ts` constrói o system prompt versionado somente com dados dessa consulta;
5. `streamText` inicia a geração e propaga `request.signal` até o provider;
6. o stream do provider tem metadados internos removidos e é convertido por `toUIMessageStream`;
7. `createUIMessageStreamResponse` entrega eventos SSE ao `useChat`, que atualiza progressivamente a mensagem do assistente.

O corpo da requisição aceita exclusivamente `{ messages }`. Cada mensagem contém apenas `role` e `content`; os únicos papéis aceitos são `user` e `assistant`. Contexto de imóvel, mensagens `system` e propriedades extras são rejeitados. Cada mensagem possui limite de 2.000 caracteres e cada requisição aceita no máximo 20 mensagens.

### Isolamento e ausência do guia

O `propertyCode` utilizado na consulta vem exclusivamente do segmento da URL. O contexto do navegador nunca é usado para selecionar ou descrever o imóvel, impedindo que uma conversa de FLN001 forneça dados para GRM001 ou vice-versa.

O `ExperienceGuide` é apenas consultado pelo chat. O endpoint não inicia geração nem altera o guia. Quando o relacionamento está ausente ou não pode ser normalizado, os dados operacionais do imóvel continuam disponíveis e o prompt instrui o assistente a informar que as experiências ainda estão sendo preparadas.

### Streaming e falhas

A integração usa AI SDK 7 com `streamText`, `temperature: 0.2`, `maxRetries: 0`, nenhuma ferramenta e nenhum limite baixo de saída. A resposta utiliza a composição não depreciada `toUIMessageStream` + `createUIMessageStreamResponse`.

Falhas anteriores à abertura do stream retornam JSON controlado: 400 para entrada inválida, 404 para imóvel inexistente e 503 para banco ou provider indisponível. Falhas assíncronas, quando os headers SSE já foram enviados, tornam-se um evento de erro com mensagem pública fixa. O `onError` padrão de `streamText` é substituído para impedir que o SDK registre a resposta bruta do provider; a aplicação registra somente evento, código do imóvel, modelo, quantidade de mensagens, classificação e duração.
