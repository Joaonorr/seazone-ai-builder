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
