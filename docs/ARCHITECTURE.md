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
