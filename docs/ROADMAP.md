# Roadmap de Implementação

## Status possíveis

- `[ ]` Não iniciado
- `[~]` Em andamento
- `[x]` Concluído
- `[!]` Bloqueado

---

## Milestone 1 — Fundação

- [x] Criar projeto Next.js com TypeScript e Tailwind
- [x] Configurar App Router e diretório `src`
- [x] Configurar PostgreSQL local com Docker
- [x] Configurar Prisma
- [x] Criar migrations
- [x] Criar seed dos imóveis FLN001 e GRM001
- [ ] Criar repositório remoto
- [ ] Realizar deploy inicial

Critério de conclusão:
o projeto deve compilar e os dois imóveis devem existir no banco.

---

## Milestone 2 — Guia do imóvel

- [x] Criar rota dinâmica `/[propertyCode]`
- [x] Consultar o imóvel pelo código
- [x] Implementar tela de código inexistente
- [x] Exibir dados básicos
- [x] Exibir fotos e amenidades
- [x] Exibir acesso e estacionamento
- [x] Exibir regras
- [x] Exibir contato e endereço
- [x] Adaptar layout para mobile

Critério de conclusão:
FLN001 e GRM001 devem apresentar os respectivos dados, e códigos inválidos devem apresentar erro amigável.

---

## Milestone 3 — Guia de Experiências

- [x] Definir schema da resposta da IA
- [x] Criar prompt de geração
- [x] Integrar provedor de LLM
- [x] Gerar conteúdo contextualizado
- [x] Validar resposta com Zod
- [x] Persistir conteúdo
- [x] Reutilizar guia existente
- [x] Implementar estado de carregamento
- [x] Implementar tratamento de falha

Critério de conclusão:
cada imóvel deve possuir um guia coerente com sua cidade, persistido e não regenerado em cada acesso.

---

## Milestone 4 — Assistente Virtual

- [x] Criar endpoint de chat
- [x] Construir contexto com dados do imóvel
- [x] Incluir Guia de Experiências no contexto
- [x] Criar system prompt
- [x] Implementar streaming
- [x] Criar interface do chat
- [x] Tratar informações ausentes
- [x] Testar as quatro perguntas obrigatórias

Critério de conclusão:
o assistente deve responder corretamente às perguntas do desafio e não inventar dados.

---

## Milestone 5 — Qualidade

- [ ] Testar consulta por código
- [ ] Testar código inexistente
- [x] Testar persistência do guia
- [x] Testar resposta inválida da IA
- [x] Testar contexto do chat
- [x] Executar lint
- [x] Executar build
- [x] Revisar erros e edge cases

---

## Milestone 6 — Entrega

- [ ] Configurar banco hospedado
- [ ] Configurar variáveis da produção
- [ ] Publicar na Vercel
- [ ] Testar produção em mobile
- [ ] Finalizar README
- [ ] Documentar arquitetura
- [ ] Tornar repositório público
- [ ] Validar links FLN001 e GRM001
