import {
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type TextStreamPart,
} from "ai";

import { safeParseStoredExperienceGuide } from "@/lib/experience-guide/schema";
import { prisma } from "@/lib/prisma";

import {
  classifyGuestAssistantProviderError,
  GuestAssistantError,
  logGuestAssistantError,
  type GuestAssistantLogEntry,
} from "./errors";
import {
  buildGuestAssistantSystemPrompt,
  type GuestAssistantPromptContext,
} from "./prompt";
import type { GuestAssistantMessage } from "./schema";

const DEFAULT_MODEL_NAME = "gemini-2.5-flash";
const SAFE_STREAM_ERROR_MESSAGE =
  "Não foi possível responder agora. Tente novamente em alguns instantes.";

const amenityLabels: Readonly<Record<string, string>> = {
  wifi: "Wi-Fi",
  tv: "TV",
  airConditioning: "Ar-condicionado",
  kitchen: "Cozinha equipada",
  washingMachine: "Máquina de lavar",
  elevator: "Elevador",
  balcony: "Varanda",
  bbqGrill: "Churrasqueira",
  dishwasher: "Lava-louças",
};

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAmenities(value: unknown) {
  if (!isJsonObject(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, isAvailable]) => {
    const label = amenityLabels[key];

    return isAvailable === true && label ? [label] : [];
  });
}

function getConfiguredModelName() {
  return process.env.AI_MODEL?.trim() || DEFAULT_MODEL_NAME;
}

async function findProperty(
  propertyCode: string,
): Promise<GuestAssistantPromptContext | null> {
  try {
    const property = await prisma.property.findUnique({
      where: { code: propertyCode },
      select: {
        code: true,
        name: true,
        propertyType: true,
        bedroomQuantity: true,
        bathroomQuantity: true,
        guestCapacity: true,
        street: true,
        number: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        postalCode: true,
        wifiNetwork: true,
        wifiPassword: true,
        isSelfCheckin: true,
        propertyAccessType: true,
        propertyAccessInstructions: true,
        propertyPassword: true,
        hasParkingSpot: true,
        parkingSpotIdentifier: true,
        parkingSpotInstructions: true,
        checkInTime: true,
        checkOutTime: true,
        allowPet: true,
        smokingPermitted: true,
        suitableForChildren: true,
        suitableForBabies: true,
        eventsPermitted: true,
        amenities: true,
        hostName: true,
        hostPhone: true,
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

    const { amenities, experienceGuide, ...details } = property;
    const parsedGuide = experienceGuide
      ? safeParseStoredExperienceGuide(experienceGuide)
      : null;

    return {
      ...details,
      amenities: normalizeAmenities(amenities),
      experienceGuide: parsedGuide?.success ? parsedGuide.data : null,
    };
  } catch (error: unknown) {
    throw new GuestAssistantError("DATABASE_FAILURE", { cause: error });
  }
}

type NoTools = Record<never, never>;
type ProviderStream = ReadableStream<TextStreamPart<NoTools>>;

function sanitizeProviderStream(stream: ProviderStream) {
  return stream.pipeThrough(
    new TransformStream<TextStreamPart<NoTools>, TextStreamPart<NoTools>>({
      transform(part, controller) {
        if (part.type === "text-delta" && part.text.length === 0) {
          return;
        }

        const sanitizedPart = { ...part } as TextStreamPart<NoTools> & {
          providerMetadata?: undefined;
        };

        if ("providerMetadata" in sanitizedPart) {
          sanitizedPart.providerMetadata = undefined;
        }

        controller.enqueue(sanitizedPart);
      },
    }),
  );
}

type StartProviderStreamInput = {
  systemPrompt: string;
  messages: GuestAssistantMessage[];
  abortSignal: AbortSignal;
};

type StartProviderStreamResult = {
  stream: ProviderStream;
  modelName: string;
};

async function startProviderStream({
  systemPrompt,
  messages,
  abortSignal,
}: StartProviderStreamInput): Promise<StartProviderStreamResult> {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    throw new GuestAssistantError("MISSING_API_KEY");
  }

  try {
    const { aiModelName, geminiModel } = await import("@/lib/ai");
    const result = streamText<NoTools>({
      model: geminiModel,
      tools: {},
      system: systemPrompt,
      messages,
      allowSystemInMessages: false,
      temperature: 0.2,
      maxRetries: 0,
      abortSignal,
      onError: () => undefined,
    });

    return {
      stream: result.stream,
      modelName: aiModelName,
    };
  } catch (error: unknown) {
    throw classifyGuestAssistantProviderError(error);
  }
}

export type GuestAssistantServiceDependencies = {
  findProperty: (
    propertyCode: string,
  ) => Promise<GuestAssistantPromptContext | null>;
  startProviderStream: (
    input: StartProviderStreamInput,
  ) => Promise<StartProviderStreamResult>;
  logError: (entry: GuestAssistantLogEntry) => void;
  now: () => number;
};

const defaultDependencies: GuestAssistantServiceDependencies = {
  findProperty,
  startProviderStream,
  logError: logGuestAssistantError,
  now: Date.now,
};

export function createGuestAssistantService(
  overrides: Partial<GuestAssistantServiceDependencies> = {},
) {
  const dependencies = { ...defaultDependencies, ...overrides };

  return async function streamGuestAssistant(input: {
    propertyCode: string;
    messages: GuestAssistantMessage[];
    abortSignal: AbortSignal;
  }) {
    const startedAt = dependencies.now();
    const context = await dependencies.findProperty(input.propertyCode);

    if (!context) {
      throw new GuestAssistantError("PROPERTY_NOT_FOUND");
    }

    const systemPrompt = buildGuestAssistantSystemPrompt(context);
    let providerResult: StartProviderStreamResult;

    try {
      providerResult = await dependencies.startProviderStream({
        systemPrompt,
        messages: input.messages,
        abortSignal: input.abortSignal,
      });
    } catch (error: unknown) {
      throw classifyGuestAssistantProviderError(error);
    }

    let hasStreamError = false;
    const logStreamError = (error: unknown) => {
      const classified = classifyGuestAssistantProviderError(error);

      if (!hasStreamError) {
        hasStreamError = true;
        dependencies.logError({
          event: "guest-assistant-error",
          propertyCode: input.propertyCode,
          modelName: providerResult.modelName,
          messageCount: input.messages.length,
          errorClass: classified.code,
          durationMs: Math.max(0, dependencies.now() - startedAt),
        });
      }

      return SAFE_STREAM_ERROR_MESSAGE;
    };

    const uiMessageStream = toUIMessageStream({
      stream: sanitizeProviderStream(providerResult.stream),
      sendReasoning: false,
      sendSources: false,
      onError: logStreamError,
    });

    return createUIMessageStreamResponse({
      stream: uiMessageStream,
    });
  };
}

export const streamGuestAssistant = createGuestAssistantService();

export function getGuestAssistantModelNameForLogs() {
  return getConfiguredModelName();
}
