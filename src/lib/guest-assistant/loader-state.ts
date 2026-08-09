export type GuestAssistantChatStatus = "submitted" | "streaming" | "ready" | "error";

/** Mantém "Preparando resposta…" visível até o primeiro texto do assistente chegar. */
export function shouldShowGuestAssistantLoader({
  status,
  lastMessageRole,
  lastMessageText,
}: {
  status: GuestAssistantChatStatus;
  lastMessageRole: string | undefined;
  lastMessageText: string;
}): boolean {
  if (status === "submitted") {
    return true;
  }

  if (status !== "streaming") {
    return false;
  }

  return lastMessageRole !== "assistant" || lastMessageText.length === 0;
}
