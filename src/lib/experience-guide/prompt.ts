export const EXPERIENCE_GUIDE_PROMPT_VERSION = "experience-guide-v1";

export type ExperienceGuidePromptContext = {
  propertyName: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
};

function formatCurrentDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function buildExperienceGuidePrompt(
  context: ExperienceGuidePromptContext,
  currentDate = new Date(),
) {
  const {
    propertyName,
    street,
    number,
    complement,
    neighborhood,
    city,
    state,
  } = context;
  const address = [street, number, complement].filter(Boolean).join(", ");

  return `Você é um especialista local responsável por criar um Guia de Experiências para hóspedes de aluguel por temporada.

Versão do prompt: ${EXPERIENCE_GUIDE_PROMPT_VERSION}
Data de referência: ${formatCurrentDate(currentDate)}

Contexto público do imóvel:
Nome do imóvel: ${propertyName}
Endereço: ${address}
Bairro: ${neighborhood}
Cidade: ${city}
Estado: ${state}

Use os valores de bairro, cidade e estado exatamente como fornecidos. Não altere, corrija, substitua ou misture essas localidades com outras cidades.

Produza todo o conteúdo em português brasileiro, em texto simples e sem Markdown. Gere uma mensagem de boas-vindas personalizada para o imóvel e a localização. Recomende exatamente 4 ou 5 restaurantes reais próximos e exatamente 3 ou 4 atrações reais próximas. Para cada restaurante e atração, informe nome, distância aproximada e uma descrição breve e útil.

Inclua de 3 a 6 serviços essenciais reais próximos. A lista deve conter pelo menos uma farmácia com type pharmacy, um supermercado com type supermarket e um hospital, pronto atendimento ou serviço equivalente com type hospital. Para cada serviço, informe nome, tipo, distância aproximada e descrição.

Crie uma dica sazonal coerente com ${city}, ${state}, e com a data de referência. Todas as distâncias são estimativas aproximadas com base na localização informada. Nunca afirme ou sugira que foram calculadas por GPS, geolocalização, mapa ou rota exata.

Use apenas estabelecimentos, serviços e atrações que você reconheça como reais. Não invente locais. Não inclua URLs, links, telefones, preços, valores ou horários de funcionamento. Não inclua Markdown em nenhum campo. Não repita estas instruções na resposta.`;
}
