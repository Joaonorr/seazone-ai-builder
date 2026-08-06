# Guia Digital do Hóspede — Documento de Requisitos

## 1. Contexto

A Seazone administra imóveis de aluguel por temporada. Atualmente, as informações da estadia são entregues por meio de material físico e existe uma versão inicial de Guia Digital com conteúdo estático.

A solução proposta deve disponibilizar um Guia Digital personalizado por imóvel, acessível por uma URL baseada no código da propriedade, como:

- `/FLN001`
- `/GRM001`

O produto atual pode ser utilizado como referência de estrutura e navegação, mas não precisa ser replicado visualmente.

---

## 2. Objetivo do produto

Centralizar as informações da estadia em uma aplicação web personalizada por imóvel e enriquecer a experiência do hóspede com:

- informações operacionais da propriedade;
- regras da estadia;
- guia contextual de experiências gerado por IA;
- assistente virtual contextualizado.

---

## 3. Glossário

- **Hóspede:** pessoa que realizou a reserva e irá se hospedar.
- **Anfitrião:** pessoa responsável pelo imóvel e pelos processos de check-in e check-out.
- **Imóvel ou propriedade:** local onde o hóspede ficará hospedado.
- **Guia Digital:** aplicação web que centraliza as informações da estadia.
- **Guia de Experiências:** conteúdo contextualizado com restaurantes, atrações e serviços próximos.
- **Assistente Virtual:** chat que responde perguntas relacionadas ao imóvel e ao guia.

---

## 4. Requisitos técnicos obrigatórios

A aplicação deve utilizar:

- Next.js;
- TypeScript;
- Tailwind CSS;
- banco de dados;
- uma LLM para geração dinâmica de conteúdo.

Também deve apresentar:

- separação adequada de responsabilidades;
- código limpo e manutenível;
- tratamento de erros;
- boas práticas de commits;
- documentação das decisões técnicas.

---

## 5. Requisitos funcionais

### RF01 — Acesso por código do imóvel

O hóspede deve acessar o guia por meio de uma URL baseada no código da propriedade.

Exemplos:

- `/FLN001`
- `/GRM001`

#### Critérios de aceite

- O código deve ser utilizado para localizar o imóvel.
- Um código válido deve apresentar o imóvel correspondente.
- Um código inexistente deve apresentar uma tela de erro amigável.

---

### RF02 — Dados gerais do imóvel

O guia deve apresentar:

- fotos;
- nome;
- tipo;
- cidade;
- estado;
- quantidade de quartos;
- quantidade de banheiros;
- capacidade máxima de hóspedes;
- amenidades disponíveis.

---

### RF03 — Informações de acesso

O guia deve apresentar:

- nome da rede Wi-Fi;
- senha do Wi-Fi;
- tipo de acesso ao imóvel;
- instruções de acesso;
- senha ou código da propriedade, quando existente;
- informações de estacionamento, quando disponível.

---

### RF04 — Regras da estadia

O guia deve apresentar:

- horário de check-in;
- horário de check-out;
- permissão ou proibição de animais;
- permissão ou proibição de fumar;
- adequação para crianças;
- adequação para bebês;
- permissão ou proibição de festas e eventos.

---

### RF05 — Contato e endereço

O guia deve apresentar:

- nome do anfitrião;
- telefone do anfitrião;
- endereço completo do imóvel.

---

### RF06 — Responsividade

A aplicação deve funcionar adequadamente em:

- dispositivos móveis;
- desktop.

O layout deve preservar legibilidade, hierarquia e acesso às informações principais.

---

### RF07 — Guia de Experiências gerado por IA

Ao acessar o guia de um imóvel, a aplicação deve disponibilizar conteúdo contextualizado pelo endereço da propriedade.

O conteúdo deve conter:

- mensagem de boas-vindas personalizada;
- 4 a 5 restaurantes reais próximos;
- 3 a 4 atrações reais próximas;
- serviços essenciais próximos;
- dica sazonal relacionada à época atual.

Cada restaurante e atração deve possuir:

- nome;
- distância aproximada;
- descrição.

Os serviços essenciais podem incluir:

- farmácias;
- supermercados;
- hospitais.

#### Critérios de aceite

- FLN001 deve apresentar conteúdo relacionado a Florianópolis/SC.
- GRM001 deve apresentar conteúdo relacionado a Gramado/RS.
- O conteúdo não deve ser regenerado a cada acesso.
- O conteúdo gerado deve ser persistido.
- O usuário deve visualizar feedback enquanto o conteúdo estiver sendo gerado.

---

### RF08 — Assistente Virtual

O hóspede deve poder conversar com um assistente virtual contextualizado.

O assistente deve utilizar como contexto:

- dados estruturados do imóvel;
- Guia de Experiências persistido.

O assistente deve responder corretamente, no mínimo:

- “Qual a senha do Wi-Fi?”
- “Posso trazer meu cachorro?”
- “A que horas posso fazer check-in?”
- “Que restaurantes tem perto?”

#### Critérios de aceite

- As respostas devem ser transmitidas em streaming.
- O texto deve aparecer progressivamente.
- O assistente não deve inventar informações ausentes.
- Quando não houver informação disponível, o assistente deve informar essa limitação.

---

## 6. Persistência

A aplicação deve armazenar:

- os dados dos imóveis;
- o Guia de Experiências gerado para cada propriedade.

Deve existir, no máximo, um guia vigente por imóvel no escopo do desafio.

---

## 7. Tratamento de erros

A aplicação deve tratar, no mínimo:

- código de imóvel inexistente;
- indisponibilidade do banco;
- falha na geração do guia;
- resposta inválida da LLM;
- falha no chat;
- ausência de informações solicitadas pelo hóspede.

---

## 8. Dados de referência

### FLN001

- Cidade: Florianópolis
- Estado: SC
- Tipo: Apartamento
- Quartos: 2
- Banheiros: 1
- Capacidade: 4
- Permite animais: não
- Check-in: 15:00
- Check-out: 11:00

### GRM001

- Cidade: Gramado
- Estado: RS
- Tipo: Casa
- Quartos: 3
- Banheiros: 2
- Capacidade: 6
- Permite animais: sim
- Check-in: 14:00
- Check-out: 12:00

Os dados completos devem permanecer cadastrados no banco conforme o material de referência.

---

## 9. Entrega

A entrega deve conter:

- repositório público no GitHub;
- código-fonte completo;
- URL pública e funcional;
- README com instruções de execução e decisões técnicas.

---

## 10. Critérios de avaliação

A solução será avaliada considerando:

- clareza e utilidade do produto;
- qualidade da integração com IA;
- qualidade dos prompts;
- coerência geográfica do conteúdo;
- funcionamento do chat;
- tratamento de falhas;
- responsividade;
- qualidade do código;
- organização do projeto;
- documentação;
- testes.