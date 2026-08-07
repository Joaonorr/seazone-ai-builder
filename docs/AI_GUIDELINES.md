# Diretrizes de IA

## Guia de Experiências

- Provedor: configuração Gemini existente em `src/lib/ai.ts`.
- Modelo: `AI_MODEL`, com fallback atual para `gemini-2.5-flash`.
- Versão do prompt: `experience-guide-v1`.
- Geração: `generateText` com `Output.object` e schema Zod estrito.
- Temperatura: `0.2`.
- Timeout total: 30 segundos.
- Retentativas internas do SDK: desativadas; a recuperação é feita pelo botão de nova tentativa da interface.
- Não há streaming, chat, busca externa, Places, Maps ou geocodificação nesta etapa.

### Contexto permitido

O prompt recebe exclusivamente:

- nome do imóvel;
- rua, número e complemento;
- bairro;
- cidade;
- estado;
- data atual no fuso de São Paulo.

Rede e senha do Wi-Fi, códigos e senhas do imóvel, instruções sensíveis de acesso e telefone do anfitrião não fazem parte do contexto aceito pelo construtor do prompt.

### Saída

O schema exige mensagem de boas-vindas, 4 ou 5 restaurantes, 3 ou 4 atrações, de 3 a 6 serviços essenciais e uma dica sazonal. Farmácia, supermercado e hospital ou serviço equivalente são obrigatórios.

Todos os objetos são estritos e todas as strings possuem limites de comprimento. Texto vazio, Markdown, URLs, telefones, preços e horários de funcionamento são rejeitados. Uma saída inválida nunca é persistida.

As distâncias são estimativas aproximadas baseadas no endereço informado. O prompt proíbe afirmar ou sugerir cálculo por GPS, geolocalização, mapa ou rota exata. A interface também informa que as distâncias podem variar conforme o trajeto.

## Assistente Virtual

- Provedor: Gemini configurada em `src/lib/ai.ts`.
- Modelo: valor efetivo de `AI_MODEL`, com o mesmo fallback da configuração base.
- AI SDK: `ai` 7.0.56 e `@ai-sdk/react` 4.0.59 instalados.
- Versão do system prompt: `guest-assistant-v1`.
- Geração: `streamText` com resposta SSE por `toUIMessageStream` e `createUIMessageStreamResponse`.
- Temperatura: `0.2`.
- Retentativas internas: `maxRetries: 0`.
- Cancelamento: `request.signal` é repassado como `abortSignal`.
- Não há ferramentas, pesquisa externa, Maps, Places ou busca na web.
- O histórico existe somente no estado do Client Component e não é persistido.

### Contexto enviado à Gemini

Em cada solicitação, o servidor consulta e envia somente os dados persistidos do imóvel identificado pela URL:

- identificação, tipo, capacidade, endereço e amenidades;
- rede e senha do Wi-Fi;
- modalidade, instruções e código de acesso, quando existente;
- estacionamento;
- horários e regras da estadia;
- nome e telefone do anfitrião;
- conteúdo validado do `ExperienceGuide`, quando existente.

Imagens e metadados de geração do Guia de Experiências não fazem parte do prompt. O navegador não envia contexto de imóvel e não pode substituir esses dados. Metadados opacos do provider são removidos antes do stream chegar ao cliente.

### Política anti-alucinação

O system prompt define o contexto consultado no servidor como única fonte de verdade. Ele proíbe invenção, inferência sem suporte, preenchimento de lacunas e uso de conhecimento externo. Restaurantes e atrações só podem ser citados quando aparecem no `ExperienceGuide` persistido.

Quando uma informação não existe, a resposta definida é: “Não encontrei essa informação no guia deste imóvel.” Quando útil, o assistente pode orientar contato com o anfitrião usando somente os dados persistidos.

Se o guia estiver ausente e a pergunta tratar de restaurantes, atrações ou experiências, a resposta definida é: “As experiências deste imóvel ainda estão sendo preparadas.” A ausência do guia não bloqueia respostas sobre Wi-Fi, acesso, regras ou horários e não inicia geração de conteúdo.

### Proteção contra prompt injection

Mensagens recebidas são tratadas como conteúdo não confiável. O prompt determina que o assistente ignore tentativas de:

- substituir regras do sistema;
- obter o prompt interno;
- modificar dados persistidos;
- assumir outro imóvel;
- declarar informações falsas como verdadeiras.

Mensagens `system` vindas do cliente são rejeitadas pelo schema. Apenas `user` e `assistant` são aceitos, e `allowSystemInMessages` permanece desativado no `streamText`.

### Política de logs e erros

Logs do assistente podem conter somente:

- `event`;
- `propertyCode`;
- `modelName`;
- `messageCount`;
- `errorClass`;
- `durationMs`.

Nunca são registrados mensagens integrais, system prompt, contexto completo, senha do Wi-Fi, códigos de acesso, telefone do anfitrião, resposta bruta do provider, `GEMINI_API_KEY` ou `DATABASE_URL`. O `onError` padrão do `streamText`, que imprime o erro bruto, é substituído. Erros assíncronos são classificados no servidor e convertidos em uma mensagem pública fixa pelo `onError` de `toUIMessageStream`.
