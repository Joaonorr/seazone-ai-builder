import {
  GuestAssistantError,
  logGuestAssistantError,
} from "./errors";
import {
  getGuestAssistantModelNameForLogs,
  streamGuestAssistant,
} from "./service";
import {
  guestAssistantRequestSchema,
  propertyCodeSchema,
  type GuestAssistantMessage,
} from "./schema";

type StreamGuestAssistant = (input: {
  propertyCode: string;
  messages: GuestAssistantMessage[];
  abortSignal: AbortSignal;
}) => Promise<Response>;

function invalidRequestResponse() {
  return Response.json(
    { message: "Não foi possível enviar esta mensagem." },
    { status: 400 },
  );
}

export function createGuestAssistantPost(
  assistantService: StreamGuestAssistant = streamGuestAssistant,
) {
  return async function POST(
    request: Request,
    context: { params: Promise<{ propertyCode: string }> },
  ) {
    const startedAt = Date.now();
    const { propertyCode } = await context.params;
    const normalizedCode = propertyCode.trim().toUpperCase();
    const parsedCode = propertyCodeSchema.safeParse(normalizedCode);

    if (!parsedCode.success) {
      return invalidRequestResponse();
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return invalidRequestResponse();
    }

    const parsedBody = guestAssistantRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return invalidRequestResponse();
    }

    try {
      return await assistantService({
        propertyCode: parsedCode.data,
        messages: parsedBody.data.messages,
        abortSignal: request.signal,
      });
    } catch (error: unknown) {
      const assistantError =
        error instanceof GuestAssistantError
          ? error
          : new GuestAssistantError("PROVIDER_FAILURE", { cause: error });

      logGuestAssistantError({
        event: "guest-assistant-error",
        propertyCode: parsedCode.data,
        modelName: getGuestAssistantModelNameForLogs(),
        messageCount: parsedBody.data.messages.length,
        errorClass: assistantError.code,
        durationMs: Math.max(0, Date.now() - startedAt),
      });

      if (assistantError.code === "PROPERTY_NOT_FOUND") {
        return Response.json({ message: "Imóvel não encontrado." }, { status: 404 });
      }

      if (assistantError.code === "ABORTED") {
        return Response.json(
          { message: "A solicitação foi cancelada." },
          { status: 499 },
        );
      }

      return Response.json(
        { message: "O assistente está temporariamente indisponível." },
        { status: 503 },
      );
    }
  };
}
