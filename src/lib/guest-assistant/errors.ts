import { APICallError, LoadAPIKeyError, RetryError } from "ai";

export type GuestAssistantErrorCode =
  | "MISSING_API_KEY"
  | "PROVIDER_FAILURE"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "ABORTED"
  | "PROPERTY_NOT_FOUND"
  | "DATABASE_FAILURE";

export class GuestAssistantError extends Error {
  readonly code: GuestAssistantErrorCode;

  constructor(code: GuestAssistantErrorCode, options?: { cause?: unknown }) {
    super(code, { cause: options?.cause });
    this.name = "GuestAssistantError";
    this.code = code;
  }
}

function getErrorName(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return null;
  }

  return typeof error.name === "string" ? error.name : null;
}

function isAbortOrTimeoutError(error: unknown, depth = 0): "ABORTED" | "TIMEOUT" | null {
  if (depth > 4) {
    return null;
  }

  const name = getErrorName(error);

  if (name === "AbortError") {
    return "ABORTED";
  }

  if (name === "TimeoutError") {
    return "TIMEOUT";
  }

  if (RetryError.isInstance(error)) {
    if (error.reason === "abort") {
      return "ABORTED";
    }

    return isAbortOrTimeoutError(error.lastError, depth + 1);
  }

  if (error instanceof Error && error.cause) {
    return isAbortOrTimeoutError(error.cause, depth + 1);
  }

  return null;
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

export function classifyGuestAssistantProviderError(error: unknown) {
  if (error instanceof GuestAssistantError) {
    return error;
  }

  if (LoadAPIKeyError.isInstance(error)) {
    return new GuestAssistantError("MISSING_API_KEY", { cause: error });
  }

  const interruption = isAbortOrTimeoutError(error);

  if (interruption) {
    return new GuestAssistantError(interruption, { cause: error });
  }

  const apiCallError = findApiCallError(error);

  if (apiCallError?.statusCode === 429) {
    return new GuestAssistantError("RATE_LIMIT", { cause: error });
  }

  return new GuestAssistantError("PROVIDER_FAILURE", { cause: error });
}

export type GuestAssistantLogEntry = {
  event: "guest-assistant-error";
  propertyCode: string;
  modelName: string;
  messageCount: number;
  errorClass: GuestAssistantErrorCode;
  durationMs: number;
};

export function createGuestAssistantLogEntry(input: GuestAssistantLogEntry) {
  return input;
}

export function logGuestAssistantError(entry: GuestAssistantLogEntry) {
  process.stderr.write(`${JSON.stringify(createGuestAssistantLogEntry(entry))}\n`);
}
