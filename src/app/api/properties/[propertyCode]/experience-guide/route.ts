import { ExperienceGuideError, logExperienceGuideError } from "@/lib/experience-guide/errors";
import { getOrCreateExperienceGuide } from "@/lib/experience-guide/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ propertyCode: string }> },
) {
  const { propertyCode } = await context.params;
  const normalizedCode = propertyCode.trim().toUpperCase();

  try {
    const guide = await getOrCreateExperienceGuide(normalizedCode);

    return Response.json({ guide });
  } catch (error: unknown) {
    const guideError =
      error instanceof ExperienceGuideError
        ? error
        : new ExperienceGuideError("PROVIDER_FAILURE", { cause: error });

    logExperienceGuideError(guideError, normalizedCode);

    if (guideError.code === "PROPERTY_NOT_FOUND") {
      return Response.json({ message: "Imóvel não encontrado." }, { status: 404 });
    }

    if (guideError.code === "RATE_LIMIT") {
      return Response.json(
        { message: "As recomendações estão temporariamente indisponíveis." },
        { status: 429 },
      );
    }

    return Response.json(
      { message: "As recomendações estão temporariamente indisponíveis." },
      { status: 503 },
    );
  }
}
