export type ExperienceGuideErrorCode =
  | "MISSING_API_KEY"
  | "PROVIDER_FAILURE"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "INVALID_OUTPUT"
  | "PROPERTY_NOT_FOUND"
  | "PERSISTENCE_FAILURE";

export class ExperienceGuideError extends Error {
  readonly code: ExperienceGuideErrorCode;
  readonly providerStatus: number | null;

  constructor(
    code: ExperienceGuideErrorCode,
    options?: { cause?: unknown; providerStatus?: number | null },
  ) {
    super(code, { cause: options?.cause });
    this.name = "ExperienceGuideError";
    this.code = code;
    this.providerStatus = options?.providerStatus ?? null;
  }
}

export function logExperienceGuideError(
  error: ExperienceGuideError,
  propertyCode: string,
) {
  const entry = {
    level: "error",
    context: "experience-guide",
    operation: "experience-guide.get-or-create",
    propertyCode,
    errorCode: error.code,
    errorName: error.cause instanceof Error ? error.cause.name : error.name,
    providerStatus: error.providerStatus,
  };

  process.stderr.write(`${JSON.stringify(entry)}\n`);
}
