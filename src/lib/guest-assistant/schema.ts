import { z } from "zod";

export const GUEST_ASSISTANT_MAX_MESSAGES = 20;
export const GUEST_ASSISTANT_MAX_MESSAGE_LENGTH = 2_000;

export const guestAssistantMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "A mensagem não pode ser vazia.")
    .max(
      GUEST_ASSISTANT_MAX_MESSAGE_LENGTH,
      `A mensagem deve ter no máximo ${GUEST_ASSISTANT_MAX_MESSAGE_LENGTH} caracteres.`,
    ),
});

export const guestAssistantRequestSchema = z.strictObject({
  messages: z
    .array(guestAssistantMessageSchema)
    .min(1, "Envie pelo menos uma mensagem.")
    .max(
      GUEST_ASSISTANT_MAX_MESSAGES,
      `Envie no máximo ${GUEST_ASSISTANT_MAX_MESSAGES} mensagens.`,
    ),
});

export const propertyCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Z0-9]+$/, "Código de imóvel inválido.");

export type GuestAssistantMessage = z.infer<typeof guestAssistantMessageSchema>;
export type GuestAssistantRequest = z.infer<typeof guestAssistantRequestSchema>;
