import { prisma } from "@/lib/prisma";
import { safeParseStoredExperienceGuide } from "@/lib/experience-guide/schema";

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

function normalizeAmenities(value: unknown): string[] {
  if (!isJsonObject(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, isAvailable]) => {
    const label = amenityLabels[key];

    return isAvailable === true && label ? [label] : [];
  });
}

function getMainImageUrl(value: unknown): string | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const imageUrl = value.find((item): item is string => {
    if (typeof item !== "string") {
      return false;
    }

    try {
      const url = new URL(item);

      return url.protocol === "https:" && url.hostname === "images.unsplash.com";
    } catch {
      return false;
    }
  });

  return imageUrl ?? null;
}

function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const { code } = error as { code?: unknown };

  return typeof code === "string" ? code : null;
}

function logPropertyLookupError(error: unknown, propertyCode: string) {
  const entry = {
    level: "error",
    context: "property-guide",
    operation: "property.findUnique",
    prismaCode: getPrismaErrorCode(error),
    propertyCode,
    errorName: error instanceof Error ? error.name : "UnknownError",
  };

  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

function logInvalidExperienceGuide(propertyCode: string) {
  const entry = {
    level: "error",
    context: "property-guide",
    operation: "experience-guide.parse",
    propertyCode,
    errorCode: "INVALID_PERSISTED_GUIDE",
  };

  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

export async function getPropertyByCode(code: string) {
  let property;

  try {
    property = await prisma.property.findUnique({
      where: {
        code,
      },
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
        images: true,
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
  } catch (error: unknown) {
    logPropertyLookupError(error, code);
    throw new Error("Não foi possível consultar os dados do imóvel.");
  }

  if (!property) {
    return null;
  }

  const { amenities, images, experienceGuide, ...details } = property;
  const parsedExperienceGuide = experienceGuide
    ? safeParseStoredExperienceGuide(experienceGuide)
    : null;

  if (parsedExperienceGuide && !parsedExperienceGuide.success) {
    logInvalidExperienceGuide(property.code);
  }

  return {
    ...details,
    amenities: normalizeAmenities(amenities),
    mainImageUrl: getMainImageUrl(images),
    experienceGuide: parsedExperienceGuide?.success
      ? parsedExperienceGuide.data
      : null,
  };
}
