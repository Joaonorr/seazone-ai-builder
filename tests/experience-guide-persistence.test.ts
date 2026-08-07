import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../src/lib/prisma";
import { EXPERIENCE_GUIDE_PROMPT_VERSION } from "../src/lib/experience-guide/prompt";
import type { ExperienceGuideContent } from "../src/lib/experience-guide/schema";
import { createExperienceGuideService } from "../src/lib/experience-guide/service";

function createContent(label: string): ExperienceGuideContent {
  return {
    welcomeMessage: `${label}: conteúdo que deve permanecer persistido.`,
    restaurants: [
      { name: `${label} Restaurante Um`, distance: "cerca de 1 km", description: "Descrição regional válida e objetiva." },
      { name: `${label} Restaurante Dois`, distance: "aproximadamente 2 km", description: "Outra opção realista para a estadia." },
      { name: `${label} Restaurante Três`, distance: "cerca de 3 km", description: "Alternativa próxima com ambiente acolhedor." },
      { name: `${label} Restaurante Quatro`, distance: "aproximadamente 4 km", description: "Local agradável para uma refeição." },
    ],
    attractions: [
      { name: `${label} Atração Um`, distance: "cerca de 1 km", description: "Passeio de interesse na região." },
      { name: `${label} Atração Dois`, distance: "aproximadamente 2 km", description: "Espaço conhecido pelos visitantes." },
      { name: `${label} Atração Três`, distance: "cerca de 3 km", description: "Ponto tradicional da cidade." },
    ],
    essentials: [
      { name: `${label} Farmácia`, type: "pharmacy", distance: "cerca de 500 m", description: "Farmácia para necessidades essenciais." },
      { name: `${label} Mercado`, type: "supermarket", distance: "aproximadamente 800 m", description: "Mercado com itens para a estadia." },
      { name: `${label} Saúde`, type: "hospital", distance: "cerca de 4 km", description: "Referência para atendimento de saúde." },
    ],
    seasonalTip: `${label}: aproveite a estação e planeje os passeios conforme o clima local.`,
  };
}

function deferred() {
  let resolvePromise: (() => void) | null = null;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve() {
      assert.ok(resolvePromise);
      resolvePromise();
    },
  };
}

test("o upsert concorrente retorna o primeiro guia sem sobrescrevê-lo", async () => {
  const propertyCode = `TST${process.pid}${Date.now()}`;
  const firstContent = createContent("PRIMEIRO");
  const secondContent = createContent("SEGUNDO");
  const firstStarted = deferred();
  const secondStarted = deferred();
  const releaseFirst = deferred();
  const releaseSecond = deferred();
  let generationCalls = 0;

  const property = await prisma.property.create({
    data: {
      code: propertyCode,
      name: "Imóvel temporário do teste",
      propertyType: "Apartamento",
      bedroomQuantity: 1,
      bathroomQuantity: 1,
      guestCapacity: 2,
      street: "Rua de Teste",
      number: "1",
      complement: null,
      neighborhood: "Centro",
      city: "Florianópolis",
      state: "SC",
      postalCode: "88000-000",
      wifiNetwork: "test-network",
      wifiPassword: "test-password",
      isSelfCheckin: false,
      propertyAccessType: "keybox",
      propertyAccessInstructions: "Somente para o teste automatizado.",
      propertyPassword: null,
      hasParkingSpot: false,
      parkingSpotIdentifier: null,
      parkingSpotInstructions: null,
      checkInTime: "15:00",
      checkOutTime: "11:00",
      allowPet: false,
      smokingPermitted: false,
      suitableForChildren: true,
      suitableForBabies: true,
      eventsPermitted: false,
      amenities: {},
      images: [],
      hostName: "Anfitrião de Teste",
      hostPhone: "+5500000000000",
    },
  });

  try {
    const firstService = createExperienceGuideService({
      generateGuide: async () => {
        generationCalls += 1;
        firstStarted.resolve();
        await releaseFirst.promise;
        return { content: firstContent, modelName: "model-first" };
      },
    });
    const secondService = createExperienceGuideService({
      generateGuide: async () => {
        generationCalls += 1;
        secondStarted.resolve();
        await releaseSecond.promise;
        return { content: secondContent, modelName: "model-second" };
      },
    });

    const firstRequest = firstService(propertyCode);
    await firstStarted.promise;
    const secondRequest = secondService(propertyCode);
    await secondStarted.promise;

    releaseFirst.resolve();
    const firstResult = await firstRequest;
    releaseSecond.resolve();
    const secondResult = await secondRequest;

    const storedGuides = await prisma.experienceGuide.findMany({
      where: { propertyId: property.id },
    });

    assert.equal(generationCalls, 2);
    assert.equal(storedGuides.length, 1);
    assert.equal(firstResult.welcomeMessage, firstContent.welcomeMessage);
    assert.equal(secondResult.welcomeMessage, firstContent.welcomeMessage);
    assert.equal(storedGuides[0]?.welcomeMessage, firstContent.welcomeMessage);
    assert.notEqual(storedGuides[0]?.welcomeMessage, secondContent.welcomeMessage);
    assert.equal(storedGuides[0]?.modelName, "model-first");
    assert.equal(storedGuides[0]?.promptVersion, EXPERIENCE_GUIDE_PROMPT_VERSION);
  } finally {
    await prisma.property.delete({ where: { id: property.id } });
  }
});
