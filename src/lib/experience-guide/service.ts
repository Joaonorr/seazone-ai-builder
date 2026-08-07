import {
  APICallError,
  generateText,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  Output,
  RetryError,
  TypeValidationError,
} from "ai";

import { prisma } from "@/lib/prisma";

import { ExperienceGuideError } from "./errors";
import {
  buildExperienceGuidePrompt,
  EXPERIENCE_GUIDE_PROMPT_VERSION,
  type ExperienceGuidePromptContext,
} from "./prompt";
import {
  experienceGuideContentSchema,
  parseStoredExperienceGuide,
  type ExperienceGuideContent,
  type ExperienceGuideView,
  type StoredExperienceGuide,
} from "./schema";

type PropertyGuideContext = ExperienceGuidePromptContext & {
  id: string;
  experienceGuide: StoredExperienceGuide | null;
};

type GeneratedGuide = {
  content: unknown;
  modelName: string;
};

type PersistGuideInput = {
  propertyId: string;
  content: ExperienceGuideContent;
  modelName: string;
  promptVersion: string;
};

export type ExperienceGuideServiceDependencies = {
  findProperty: (propertyCode: string) => Promise<PropertyGuideContext | null>;
  generateGuide: (context: ExperienceGuidePromptContext) => Promise<GeneratedGuide>;
  persistIfAbsent: (input: PersistGuideInput) => Promise<StoredExperienceGuide>;
};

async function findProperty(propertyCode: string): Promise<PropertyGuideContext | null> {
  try {
    const property = await prisma.property.findUnique({
      where: { code: propertyCode },
      select: {
        id: true,
        name: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        experienceGuide: {
          select: {
            welcomeMessage: true,
            restaurants: true,
            attractions: true,
            essentials: true,
            seasonalTip: true,
            modelName: true,
            promptVersion: true,
            generatedAt: true,
          },
        },
      },
    });

    if (!property) {
      return null;
    }

    const { name, ...guideContext } = property;

    return {
      ...guideContext,
      propertyName: name,
    };
  } catch (error: unknown) {
    throw new ExperienceGuideError("PERSISTENCE_FAILURE", { cause: error });
  }
}

function getErrorName(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return null;
  }

  return typeof error.name === "string" ? error.name : null;
}

function isTimeoutError(error: unknown, depth = 0): boolean {
  if (depth > 4) {
    return false;
  }

  const name = getErrorName(error);

  if (name === "AbortError" || name === "TimeoutError") {
    return true;
  }

  if (RetryError.isInstance(error)) {
    return error.reason === "abort" || isTimeoutError(error.lastError, depth + 1);
  }

  if (error instanceof Error && error.cause) {
    return isTimeoutError(error.cause, depth + 1);
  }

  return false;
}

function findApiCallError(error: unknown, depth = 0): APICallError | null {
  if (depth > 4) {
    return null;
  }

  if (APICallError.isInstance(error)) {
    return error;
  }

  if (RetryError.isInstance(error)) {
    return findApiCallError(error.lastError, depth + 1);
  }

  if (error instanceof Error && error.cause) {
    return findApiCallError(error.cause, depth + 1);
  }

  return null;
}

function classifyGenerationError(error: unknown) {
  if (error instanceof ExperienceGuideError) {
    return error;
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return new ExperienceGuideError("MISSING_API_KEY", { cause: error });
  }

  if (
    NoObjectGeneratedError.isInstance(error) ||
    TypeValidationError.isInstance(error)
  ) {
    return new ExperienceGuideError("INVALID_OUTPUT", { cause: error });
  }

  if (isTimeoutError(error)) {
    return new ExperienceGuideError("TIMEOUT", { cause: error });
  }

  const apiCallError = findApiCallError(error);

  if (apiCallError?.statusCode === 429) {
    return new ExperienceGuideError("RATE_LIMIT", {
      cause: error,
      providerStatus: apiCallError.statusCode,
    });
  }

  return new ExperienceGuideError("PROVIDER_FAILURE", {
    cause: error,
    providerStatus: apiCallError?.statusCode,
  });
}

async function generateGuide(
  context: ExperienceGuidePromptContext,
): Promise<GeneratedGuide> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new ExperienceGuideError("MISSING_API_KEY");
  }

  try {
    const { aiModelName, geminiModel } = await import("@/lib/ai");
    const { output } = await generateText({
      model: geminiModel,
      output: Output.object({ schema: experienceGuideContentSchema }),
      prompt: buildExperienceGuidePrompt(context),
      temperature: 0.2,
      maxRetries: 0,
      timeout: { totalMs: 30_000 },
    });

    return {
      content: output,
      modelName: aiModelName,
    };
  } catch (error: unknown) {
    throw classifyGenerationError(error);
  }
}

async function persistIfAbsent(input: PersistGuideInput): Promise<StoredExperienceGuide> {
  try {
    return await prisma.experienceGuide.upsert({
      where: { propertyId: input.propertyId },
      update: {},
      create: {
        propertyId: input.propertyId,
        welcomeMessage: input.content.welcomeMessage,
        restaurants: input.content.restaurants,
        attractions: input.content.attractions,
        essentials: input.content.essentials,
        seasonalTip: input.content.seasonalTip,
        modelName: input.modelName,
        promptVersion: input.promptVersion,
      },
      select: {
        welcomeMessage: true,
        restaurants: true,
        attractions: true,
        essentials: true,
        seasonalTip: true,
        modelName: true,
        promptVersion: true,
        generatedAt: true,
      },
    });
  } catch (error: unknown) {
    throw new ExperienceGuideError("PERSISTENCE_FAILURE", { cause: error });
  }
}

const defaultDependencies: ExperienceGuideServiceDependencies = {
  findProperty,
  generateGuide,
  persistIfAbsent,
};

export function createExperienceGuideService(
  overrides: Partial<ExperienceGuideServiceDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function getOrCreateExperienceGuide(
    propertyCode: string,
  ): Promise<ExperienceGuideView> {
    const normalizedCode = propertyCode.trim().toUpperCase();
    const property = await dependencies.findProperty(normalizedCode);

    if (!property) {
      throw new ExperienceGuideError("PROPERTY_NOT_FOUND");
    }

    if (property.experienceGuide) {
      try {
        return parseStoredExperienceGuide(property.experienceGuide);
      } catch (error: unknown) {
        throw new ExperienceGuideError("PERSISTENCE_FAILURE", { cause: error });
      }
    }

    const generated = await dependencies.generateGuide({
      propertyName: property.propertyName,
      street: property.street,
      number: property.number,
      complement: property.complement,
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
    });
    const validation = experienceGuideContentSchema.safeParse(generated.content);

    if (!validation.success) {
      throw new ExperienceGuideError("INVALID_OUTPUT", {
        cause: validation.error,
      });
    }

    const storedGuide = await dependencies.persistIfAbsent({
      propertyId: property.id,
      content: validation.data,
      modelName: generated.modelName,
      promptVersion: EXPERIENCE_GUIDE_PROMPT_VERSION,
    });

    try {
      return parseStoredExperienceGuide(storedGuide);
    } catch (error: unknown) {
      throw new ExperienceGuideError("PERSISTENCE_FAILURE", { cause: error });
    }
  };
}

export const getOrCreateExperienceGuide = createExperienceGuideService();
