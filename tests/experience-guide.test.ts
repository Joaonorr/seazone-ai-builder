import assert from "node:assert/strict";
import test from "node:test";

import { ExperienceGuideError } from "../src/lib/experience-guide/errors";
import {
  buildExperienceGuidePrompt,
  EXPERIENCE_GUIDE_PROMPT_VERSION,
} from "../src/lib/experience-guide/prompt";
import {
  experienceGuideContentSchema,
  type ExperienceGuideContent,
  type StoredExperienceGuide,
} from "../src/lib/experience-guide/schema";
import { createExperienceGuideService } from "../src/lib/experience-guide/service";

function createValidContent(label = "Guia"): ExperienceGuideContent {
  return {
    welcomeMessage: `${label}: seja bem-vindo a uma estadia especial na região.`,
    restaurants: [
      { name: "Restaurante Um", distance: "cerca de 800 m", description: "Cozinha regional em ambiente acolhedor." },
      { name: "Restaurante Dois", distance: "aproximadamente 1 km", description: "Pratos brasileiros preparados com ingredientes locais." },
      { name: "Restaurante Três", distance: "cerca de 1,5 km", description: "Opção descontraída para uma refeição tranquila." },
      { name: "Restaurante Quatro", distance: "aproximadamente 2 km", description: "Cardápio variado e atmosfera agradável." },
    ],
    attractions: [
      { name: "Atração Um", distance: "cerca de 1 km", description: "Passeio conhecido pela paisagem da região." },
      { name: "Atração Dois", distance: "aproximadamente 2 km", description: "Espaço cultural adequado para uma visita calma." },
      { name: "Atração Três", distance: "cerca de 3 km", description: "Ponto tradicional para conhecer a cidade." },
    ],
    essentials: [
      { name: "Farmácia Central", type: "pharmacy", distance: "cerca de 600 m", description: "Farmácia próxima para necessidades essenciais." },
      { name: "Mercado Local", type: "supermarket", distance: "aproximadamente 900 m", description: "Supermercado com itens para a estadia." },
      { name: "Unidade de Saúde", type: "hospital", distance: "cerca de 4 km", description: "Referência próxima para atendimento de saúde." },
    ],
    seasonalTip: "Nesta época, leve uma camada leve de roupa e aproveite os passeios ao ar livre.",
  };
}

function createStoredGuide(
  content: ExperienceGuideContent,
  modelName = "test-model",
): StoredExperienceGuide {
  return {
    ...content,
    modelName,
    promptVersion: EXPERIENCE_GUIDE_PROMPT_VERSION,
    generatedAt: new Date("2026-08-06T12:00:00.000Z"),
  };
}

function createPropertyContext(experienceGuide: StoredExperienceGuide | null = null) {
  return {
    id: "property-1",
    propertyName: "Apartamento de Teste",
    street: "Rua das Flores",
    number: "100",
    complement: "Apto 2",
    neighborhood: "Centro",
    city: "Florianópolis",
    state: "SC",
    experienceGuide,
  };
}

test("o schema aceita somente um guia completo e limitado", () => {
  assert.equal(experienceGuideContentSchema.safeParse(createValidContent()).success, true);

  const tooFewRestaurants = createValidContent();
  tooFewRestaurants.restaurants = tooFewRestaurants.restaurants.slice(0, 3);

  const missingHospital = createValidContent();
  missingHospital.essentials = missingHospital.essentials.filter(
    (service) => service.type !== "hospital",
  );

  const extraProperty: unknown = {
    ...createValidContent(),
    sourceUrl: "https://example.com",
  };

  assert.equal(experienceGuideContentSchema.safeParse(tooFewRestaurants).success, false);
  assert.equal(experienceGuideContentSchema.safeParse(missingHospital).success, false);
  assert.equal(experienceGuideContentSchema.safeParse(extraProperty).success, false);
});

test("o schema rejeita texto vazio, Markdown, URLs, telefones, preços e horários", () => {
  const invalidValues = [
    "   ",
    "**texto em negrito**",
    "Veja https://example.com",
    "Ligue para 48999998888",
    "Custa R$ 50",
    "Aberto às 18:00",
  ];

  for (const invalidValue of invalidValues) {
    const content = createValidContent();
    content.seasonalTip = invalidValue;
    assert.equal(experienceGuideContentSchema.safeParse(content).success, false);
  }
});

test("FLN001 e GRM001 produzem prompts com contextos diferentes", () => {
  const date = new Date("2026-08-06T12:00:00.000Z");
  const florianopolisPrompt = buildExperienceGuidePrompt(
    {
      propertyName: "Apartamento Beira-Mar Florianópolis",
      street: "Rua Lauro Linhares",
      number: "589",
      complement: "Apto 301",
      neighborhood: "Trindade",
      city: "Florianópolis",
      state: "SC",
    },
    date,
  );
  const gramadoPrompt = buildExperienceGuidePrompt(
    {
      propertyName: "Chalé Serra Gramado",
      street: "Rua das Hortênsias",
      number: "220",
      complement: null,
      neighborhood: "Planalto",
      city: "Gramado",
      state: "RS",
    },
    date,
  );

  assert.match(florianopolisPrompt, /Florianópolis/);
  assert.match(florianopolisPrompt, /Trindade/);
  assert.doesNotMatch(florianopolisPrompt, /Gramado/);
  assert.match(gramadoPrompt, /Gramado/);
  assert.match(gramadoPrompt, /Planalto/);
  assert.doesNotMatch(gramadoPrompt, /Florianópolis/);
  assert.notEqual(florianopolisPrompt, gramadoPrompt);
});

test("o prompt ignora Wi-Fi, senhas, códigos e telefone mesmo quando o objeto contém esses dados", () => {
  const contextWithSecrets = {
    ...createPropertyContext(),
    wifiNetwork: "REDE_SUPER_SECRETA",
    wifiPassword: "SENHA_SUPER_SECRETA",
    propertyPassword: "CODIGO_4521",
    propertyAccessInstructions: "INSTRUCAO_SENSIVEL",
    hostPhone: "TELEFONE_PRIVADO",
  };
  const prompt = buildExperienceGuidePrompt(
    contextWithSecrets,
    new Date("2026-08-06T12:00:00.000Z"),
  );

  assert.doesNotMatch(prompt, /REDE_SUPER_SECRETA/);
  assert.doesNotMatch(prompt, /SENHA_SUPER_SECRETA/);
  assert.doesNotMatch(prompt, /CODIGO_4521/);
  assert.doesNotMatch(prompt, /INSTRUCAO_SENSIVEL/);
  assert.doesNotMatch(prompt, /TELEFONE_PRIVADO/);
  assert.match(prompt, new RegExp(EXPERIENCE_GUIDE_PROMPT_VERSION));
  assert.match(prompt, /distâncias são estimativas aproximadas/i);
});

test("um guia existente é retornado sem chamar a geração", async () => {
  let generationCalls = 0;
  let persistenceCalls = 0;
  const existingContent = createValidContent("Persistido");
  const service = createExperienceGuideService({
    findProperty: async () => createPropertyContext(createStoredGuide(existingContent)),
    generateGuide: async () => {
      generationCalls += 1;
      return { content: createValidContent("Novo"), modelName: "new-model" };
    },
    persistIfAbsent: async () => {
      persistenceCalls += 1;
      return createStoredGuide(existingContent);
    },
  });

  const result = await service("fln001");

  assert.equal(result.welcomeMessage, existingContent.welcomeMessage);
  assert.equal(generationCalls, 0);
  assert.equal(persistenceCalls, 0);
});

test("um imóvel sem guia gera, valida e persiste modelo e versão do prompt", async () => {
  let receivedModelName: string | null = null;
  let receivedPromptVersion: string | null = null;
  const generatedContent = createValidContent("Gerado");
  const service = createExperienceGuideService({
    findProperty: async () => createPropertyContext(),
    generateGuide: async () => ({
      content: generatedContent,
      modelName: "gemini-test-model",
    }),
    persistIfAbsent: async (input) => {
      receivedModelName = input.modelName;
      receivedPromptVersion = input.promptVersion;
      return createStoredGuide(input.content, input.modelName);
    },
  });

  const result = await service("FLN001");

  assert.equal(result.welcomeMessage, generatedContent.welcomeMessage);
  assert.equal(receivedModelName, "gemini-test-model");
  assert.equal(receivedPromptVersion, EXPERIENCE_GUIDE_PROMPT_VERSION);
});

test("uma saída inválida não é persistida", async () => {
  let persistenceCalls = 0;
  const service = createExperienceGuideService({
    findProperty: async () => createPropertyContext(),
    generateGuide: async () => ({
      content: { welcomeMessage: "Resposta incompleta" },
      modelName: "gemini-test-model",
    }),
    persistIfAbsent: async () => {
      persistenceCalls += 1;
      return createStoredGuide(createValidContent());
    },
  });

  await assert.rejects(service("FLN001"), (error: unknown) => {
    return error instanceof ExperienceGuideError && error.code === "INVALID_OUTPUT";
  });
  assert.equal(persistenceCalls, 0);
});

test("um imóvel inexistente produz o erro interno de not found", async () => {
  const service = createExperienceGuideService({
    findProperty: async () => null,
  });

  await assert.rejects(service("INEXISTENTE"), (error: unknown) => {
    return error instanceof ExperienceGuideError && error.code === "PROPERTY_NOT_FOUND";
  });
});

test("uma falha da geração é propagada sem tentar persistir", async () => {
  let persistenceCalls = 0;
  const service = createExperienceGuideService({
    findProperty: async () => createPropertyContext(),
    generateGuide: async () => {
      throw new ExperienceGuideError("PROVIDER_FAILURE");
    },
    persistIfAbsent: async () => {
      persistenceCalls += 1;
      return createStoredGuide(createValidContent());
    },
  });

  await assert.rejects(service("FLN001"), (error: unknown) => {
    return error instanceof ExperienceGuideError && error.code === "PROVIDER_FAILURE";
  });
  assert.equal(persistenceCalls, 0);
});
