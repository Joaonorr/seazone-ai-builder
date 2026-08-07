# Diretrizes de IA

Contrato da integração com a LLM: provider, prompts, dados de entrada e exclusões,
schema de saída, política anti-alucinação, streaming e falhas.

Para o desenho geral do sistema, ver [ARCHITECTURE.md](ARCHITECTURE.md).

## Provider e modelo

| Item | Valor |
| --- | --- |
| Provider | Google Gemini via AI SDK (`@ai-sdk/google`) |
| Modelo padrão | `gemini-3.5-flash` |
| Configuração | `AI_MODEL` (sobrescreve o padrão) |
| Instanciação | `src/lib/ai.ts` |

`src/lib/ai.ts` importa `server-only`, resolve o modelo a partir de `AI_MODEL` e
falha na inicialização se `GEMINI_API_KEY` não estiver definida. Ele é importado
dinamicamente pelos serviços, de modo que a ausência de chave se manifesta como
erro classificado (`MISSING_API_KEY`) em vez de quebrar o carregamento do módulo.

Não há SDK de outro provider em uso, nem ferramentas, function calling, busca na
web, RAG, Places, Maps ou geocodificação em nenhum dos dois fluxos.

Limites de requisição, throughput e custo dependem da conta e do projeto
configurados no provedor; a aplicação não implementa cota própria.

## Onde estão os prompts

| Fluxo | Arquivo | Versão | Construtor |
| --- | --- | --- | --- |
| Guia de Experiências | `src/lib/experience-guide/prompt.ts` | `experience-guide-v1` | `buildExperienceGuidePrompt` |
| Assistente Virtual | `src/lib/guest-assistant/prompt.ts` | `guest-assistant-v1` | `buildGuestAssistantSystemPrompt` |

Em ambos, a constante de versão é exportada, injetada no texto do prompt e
verificada por teste. A do Guia de Experiências é gravada em
`ExperienceGuide.promptVersion` junto com o conteúdo, tornando rastreável qual
versão produziu cada guia persistido.

O tipo do contexto aceito por cada construtor é a fronteira efetiva do que pode
entrar no prompt: campos não declarados no tipo não têm como ser incluídos.

---

# Guia de Experiências

## Parâmetros

| Parâmetro | Valor |
| --- | --- |
| Chamada | `generateText` com `Output.object` |
| Temperatura | `0.2` |
| Timeout total | 30 s |
| Retentativas do SDK | `maxRetries: 0` |
| Streaming | não |

`maxRetries: 0` é deliberado: a recuperação é explícita, pelo botão de nova
tentativa da interface. Retentativa silenciosa multiplicaria latência e custo em
uma operação que já é única por imóvel.

## Dados que entram no prompt

`ExperienceGuidePromptContext` declara exatamente:

- nome do imóvel;
- rua, número e complemento;
- bairro;
- cidade;
- estado.

Mais a data de referência, formatada em `pt-BR` no fuso `America/Sao_Paulo` no
momento da geração — é o que dá base à dica sazonal.

A consulta que alimenta esse contexto (`findProperty` em
`experience-guide/service.ts`) usa `select` explícito e traz apenas esses campos
do banco: os dados excluídos não são sequer carregados.

## Dados excluídos

Não fazem parte do contexto desta geração:

- rede e senha do Wi-Fi;
- código ou senha de acesso do imóvel;
- instruções de acesso;
- identificação e instruções de estacionamento;
- nome e telefone do anfitrião;
- horários e regras da estadia.

Essa é uma decisão de arquitetura, não uma omissão. O Guia de Experiências
descreve o entorno da propriedade; nada em dados operacionais sensíveis melhora
essa geração, e enviá-los ampliaria desnecessariamente a superfície de exposição
a um serviço externo.

A exclusão é garantida em três camadas — o `select` do Prisma, o tipo do contexto
e o construtor do prompt — e coberta por teste que passa um objeto contendo
Wi-Fi, senhas, códigos e telefone e verifica que nenhum desses valores aparece no
prompt gerado.

## Instruções principais do prompt

- Usar bairro, cidade e estado exatamente como fornecidos, sem corrigir,
  substituir ou misturar com outras localidades. É o que sustenta a coerência
  geográfica entre FLN001/Florianópolis e GRM001/Gramado.
- Produzir todo o conteúdo em português brasileiro, em texto simples, sem
  Markdown.
- Sugerir apenas estabelecimentos, serviços e atrações reconhecidos como reais;
  não inventar locais.
- Tratar todas as distâncias como estimativas aproximadas a partir do endereço
  informado, e nunca afirmar ou sugerir cálculo por GPS, geolocalização, mapa ou
  rota exata.
- Não incluir URLs, links, telefones, preços ou horários de funcionamento.
- Não repetir as instruções na resposta.

Sobre estabelecimentos reais: não há integração com Google Places nem com
qualquer base de estabelecimentos. As sugestões vêm do conhecimento do modelo,
restringido pela localização informada, e as distâncias são aproximações — o que
a interface declara explicitamente ao hóspede.

## Saída estruturada

Não há parsing de texto livre em nenhum ponto do fluxo:

```
LLM ──► Output.object (schema Zod) ──► validação no serviço ──► persistência ──► renderização
```

O schema (`src/lib/experience-guide/schema.ts`) é aplicado duas vezes: pelo AI
SDK na geração e outra vez pelo serviço antes da escrita, independentemente do
SDK. O que é lido do banco também é reparseado antes de virar resposta ou de ser
renderizado.

### Blocos

| Bloco | Restrição |
| --- | --- |
| `welcomeMessage` | texto único, até 600 caracteres |
| `restaurants` | 4 ou 5 itens — `name`, `distance`, `description` |
| `attractions` | 3 ou 4 itens — `name`, `distance`, `description` |
| `essentials` | 3 a 6 itens — `name`, `type`, `distance`, `description` |
| `seasonalTip` | texto único, até 500 caracteres |

`essentials.type` é um enum (`pharmacy`, `supermarket`, `hospital`) e uma
refinação exige a presença dos três tipos: um guia sem farmácia, sem supermercado
ou sem hospital é rejeitado.

Todos os objetos são estritos (`strictObject`) — campo extra invalida a saída — e
todas as strings passam por um validador comum que rejeita texto vazio, Markdown,
URLs, telefones, preços e horários de funcionamento. Essas proibições existem no
prompt **e** no schema: a instrução orienta o modelo, a validação garante o
resultado.

## Persistência

O conteúdo validado é gravado com `modelName` e `promptVersion`. A escrita usa
`upsert` com `update: {}` sobre a chave única `propertyId`, então o primeiro
conteúdo persistido prevalece e nunca é sobrescrito. Detalhes de concorrência em
[ARCHITECTURE.md](ARCHITECTURE.md#concorrência).

Uma saída inválida nunca é persistida — o fluxo é interrompido antes da escrita e
a interface oferece nova tentativa.

Não há regeneração, versionamento paralelo nem expiração de guias no escopo atual.

## Falhas

Classificação interna: `MISSING_API_KEY`, `PROVIDER_FAILURE`, `RATE_LIMIT`,
`TIMEOUT`, `INVALID_OUTPUT`, `PROPERTY_NOT_FOUND`, `PERSISTENCE_FAILURE`. A
classificação percorre a cadeia de `cause` e desembrulha `RetryError` para
identificar `APICallError` e abortos.

O cliente recebe 404, 429 ou 503 com mensagem pública neutra; a granularidade
existe para observabilidade. O log é um JSON em `stderr` com contexto, operação,
código do imóvel, classe do erro e status do provider — sem prompt, sem resposta
bruta e sem credenciais.

---

# Assistente Virtual

## Parâmetros

| Parâmetro | Valor |
| --- | --- |
| Chamada | `streamText` |
| Temperatura | `0.2` |
| Retentativas do SDK | `maxRetries: 0` |
| Ferramentas | nenhuma (`tools: {}`) |
| `allowSystemInMessages` | `false` |
| Cancelamento | `request.signal` repassado como `abortSignal` |
| Transporte | `toUIMessageStream` + `createUIMessageStreamResponse` (SSE) |

## Contexto enviado ao modelo

A cada mensagem, o servidor reconsulta o banco pelo `propertyCode` da URL e monta
o system prompt com:

- identificação, tipo, quartos, banheiros, capacidade e amenidades;
- endereço, bairro, cidade, estado e CEP;
- rede e senha do Wi-Fi;
- check-in autônomo, tipo e instruções de acesso, código de acesso quando
  existente;
- estacionamento: existência, identificação e instruções;
- horários de check-in e check-out e regras da estadia;
- nome e telefone do anfitrião;
- conteúdo validado do `ExperienceGuide`, quando existente.

Aqui os dados operacionais **fazem parte** do contexto, ao contrário do Guia de
Experiências: o interlocutor é o hóspede da reserva e essas são exatamente as
perguntas que ele faz. A distinção entre os dois prompts é intencional e reflete
a finalidade de cada um.

Não entram no prompt: imagens do imóvel e os metadados de geração do guia
(`modelName`, `promptVersion`, `generatedAt`).

O navegador não envia contexto de imóvel e não tem como substituí-lo — ver
[Validações de entrada](#validações-de-entrada).

Quando o `ExperienceGuide` está ausente ou não valida, o bloco correspondente do
prompt é marcado como ausente. Os dados operacionais continuam disponíveis e o
chat não inicia geração de guia.

## Política anti-alucinação

O system prompt define o contexto consultado no servidor como única fonte de
verdade e proíbe explicitamente inventar, completar lacunas, inferir informação
não declarada (incluindo telefones, regras, horários, códigos, locais e
distâncias), pesquisar externamente e usar conhecimento externo para acrescentar
fatos.

Restaurantes e atrações só podem ser mencionados quando constam literalmente do
`ExperienceGuide` presente no contexto.

Há duas respostas fixas para ausência de informação:

| Situação | Resposta |
| --- | --- |
| Guia ausente e pergunta sobre restaurantes, atrações ou experiências | "As experiências deste imóvel ainda estão sendo preparadas." |
| Qualquer outra informação ausente | "Não encontrei essa informação no guia deste imóvel." |

No segundo caso, o assistente pode acrescentar uma orientação breve para contato
com o anfitrião, usando apenas os dados presentes no contexto.

Ambas as mensagens são constantes exportadas do módulo de prompt e verificadas em
teste, o que impede divergência entre o texto documentado e o que o prompt
efetivamente instrui.

Isso reduz alucinação de forma substancial, mas não a elimina: o modelo continua
sendo probabilístico. As garantias duras estão nas camadas determinísticas — o
contexto é montado no servidor, o guia é validado por schema e o cliente não
consegue injetar dados de imóvel.

## Proteção contra prompt injection

Mensagens recebidas são tratadas como conteúdo não confiável. O prompt determina
que o assistente ignore tentativas de substituir as regras do sistema, obter o
prompt interno, modificar dados do imóvel, assumir outro imóvel ou declarar
informações falsas como verdadeiras. O prompt também proíbe revelar as próprias
instruções e mencionar estruturas internas (banco, JSON, provider, modelo).

A defesa não é apenas textual. Mensagens `system` vindas do cliente são rejeitadas
pelo schema, `allowSystemInMessages` permanece desativado, e o `propertyCode` vem
do segmento da URL — nunca do corpo da requisição. Uma instrução do usuário não
tem como trocar o imóvel da conversa.

## Validações de entrada

O corpo aceito é estritamente `{ messages }`, e cada mensagem contém apenas
`role` (`user` ou `assistant`) e `content`:

| Regra | Valor |
| --- | --- |
| Mensagens por requisição | 1 a 20 |
| Caracteres por mensagem | 1 a 2.000 |
| Papéis aceitos | `user`, `assistant` |
| `propertyCode` | `^[A-Z0-9]+$`, até 20 caracteres, normalizado da URL |

Objetos são estritos: campo extra, mensagem `system` ou contexto de imóvel
enviado pelo navegador resultam em 400. O cliente já envia apenas as últimas 20
mensagens; o servidor revalida em vez de confiar.

## Streaming

O stream do provider passa por uma sanitização antes de virar resposta: partes
`text-delta` vazias são descartadas e `providerMetadata` é removido de cada
parte, de modo que metadados opacos não cheguem ao navegador. `sendReasoning` e
`sendSources` ficam desativados.

O resultado é convertido por `toUIMessageStream` e entregue por
`createUIMessageStreamResponse` como SSE, consumido por `useChat`, que renderiza
progressivamente. Um teste verifica a entrega de múltiplos chunks antes da
conclusão.

Na renderização, `stripMarkdownEmphasis` remove pares `**` e `__` residuais —
apenas os pares, porque sublinhado isolado ocorre em dados legítimos do imóvel
(por exemplo, o SSID `SeaHome_FLN001`).

O histórico existe somente no estado do Client Component e não é persistido.

## Falhas

Classificação interna: `MISSING_API_KEY`, `PROVIDER_FAILURE`, `RATE_LIMIT`,
`TIMEOUT`, `ABORTED`, `PROPERTY_NOT_FOUND`, `DATABASE_FAILURE`.

Falhas **antes** da abertura do stream viram status HTTP: 400 (entrada inválida),
404 (imóvel inexistente), 499 (cancelamento) e 503 (banco ou provider
indisponível).

Falhas **depois** da abertura, com os headers SSE já enviados, não podem virar
status: tornam-se um evento de erro no stream com a mensagem pública fixa "Não
foi possível responder agora. Tente novamente em alguns instantes.", e a interface
exibe o bloco de nova tentativa.

O `onError` padrão do `streamText`, que imprime o erro bruto do provider, é
substituído por um no-op. O log da aplicação é emitido uma única vez por stream e
contém somente:

`event`, `propertyCode`, `modelName`, `messageCount`, `errorClass`, `durationMs`.

Nunca são registrados: mensagens da conversa, system prompt, contexto do imóvel,
senha do Wi-Fi, códigos de acesso, telefone do anfitrião, resposta bruta do
provider, `GEMINI_API_KEY` ou `DATABASE_URL`. A estrutura do log é fixada por
tipo e verificada em teste.

---

## Limitações conhecidas

- **Estabelecimentos não verificados.** As sugestões do Guia de Experiências vêm
  do conhecimento do modelo, sem checagem contra uma base de estabelecimentos.
  Um local pode ter fechado ou mudado de endereço. O schema garante forma e
  coerência de localidade, não veracidade atual.
- **Distâncias aproximadas.** Não há geocodificação nem cálculo de rota; as
  distâncias são estimativas do modelo e são apresentadas como tal.
- **Alucinação mitigada, não eliminada.** A restrição ao contexto é forte e
  reforçada por camadas determinísticas, mas o comportamento do modelo não é
  garantido de forma absoluta.
- **Guia sem atualização.** Um guia persistido não é regenerado nem expira; a
  única forma de renová-lo é remover o registro.
- **Prompts em versão única.** Ambos estão em `v1`. Não há A/B, fallback entre
  modelos nem avaliação automatizada de qualidade de saída.
- **Sem memória entre sessões.** O assistente só conhece as mensagens enviadas na
  requisição atual; recarregar a página zera a conversa.
