"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  GUEST_ASSISTANT_MAX_MESSAGES,
  GUEST_ASSISTANT_MAX_MESSAGE_LENGTH,
} from "@/lib/guest-assistant/schema";

const suggestedQuestions = [
  "Qual a senha do WiFi?",
  "Posso trazer meu cachorro?",
  "A que horas posso fazer check-in?",
  "Que restaurantes tem perto?",
] as const;

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toRequestMessages(messages: UIMessage[]) {
  return messages
    .filter(
      (message): message is UIMessage & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant",
    )
    .slice(-GUEST_ASSISTANT_MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: getMessageText(message),
    }));
}

export default function GuestAssistant({ propertyCode }: { propertyCode: string }) {
  const [input, setInput] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/properties/${encodeURIComponent(propertyCode)}/chat`,
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages: toRequestMessages(messages),
          },
        }),
      }),
    [propertyCode],
  );
  const {
    messages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    clearError,
  } = useChat({ transport });
  const isBusy = status === "submitted" || status === "streaming";

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) {
      return;
    }

    const distanceFromBottom =
      messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight;

    if (distanceFromBottom <= 160 || status === "submitted") {
      messageList.scrollTo({ top: messageList.scrollHeight });
    }
  }, [messages, status]);

  function send(text: string) {
    const normalizedText = text.trim();

    if (!normalizedText || isBusy) {
      return;
    }

    clearError();
    setInput("");
    void sendMessage({ text: normalizedText });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <section
      className="mt-6 border-t border-border pt-8 lg:mt-8 lg:pt-10"
      aria-labelledby="guest-assistant-title"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand-primary uppercase">
            Tire suas dúvidas
          </p>
          <h2
            id="guest-assistant-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            Assistente Virtual
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted sm:text-base">
            Pergunte sobre acesso, regras, horários e experiências deste imóvel.
          </p>
        </div>
        <span className="rounded-full border border-border bg-neutral-muted px-3 py-1.5 text-xs font-medium text-foreground-muted">
          Respostas em tempo real
        </span>
      </div>

      <div className="mt-6 flex max-w-3xl flex-col gap-2 sm:flex-row sm:flex-wrap">
        {suggestedQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => send(question)}
            disabled={isBusy}
            className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-brand-deep hover:border-brand-primary hover:bg-brand-muted disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
          >
            {question}
          </button>
        ))}
      </div>

      <div
        ref={messageListRef}
        className="mt-6 max-h-[28rem] max-w-3xl space-y-4 overflow-y-auto rounded-2xl border border-border bg-surface p-4 sm:p-5 md:max-h-[32rem] md:p-6"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={isBusy}
        role="log"
      >
        {messages.length === 0 ? (
          <div className="py-3 text-sm leading-6 text-foreground-muted">
            Olá! Como posso ajudar com sua estadia?
          </div>
        ) : (
          messages.map((message) => {
            const text = getMessageText(message);
            const isGuest = message.role === "user";

            if (!text) {
              return null;
            }

            return (
              <article
                key={message.id}
                className={`w-fit text-base leading-7 whitespace-pre-wrap [overflow-wrap:anywhere] ${
                  isGuest
                    ? "ml-auto max-w-[90%] rounded-xl bg-brand-deep px-4 py-3 text-white sm:max-w-xl"
                    : "mr-auto max-w-[95%] border-l-2 border-brand-primary py-2 pl-4 text-brand-deep sm:max-w-[44rem]"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-bold tracking-[0.12em] uppercase ${
                    isGuest ? "text-brand-muted" : "text-brand-primary"
                  }`}
                >
                  {isGuest ? "Hóspede" : "Assistente"}
                </p>
                {text}
              </article>
            );
          })
        )}

        {status === "submitted" && (
          <div className="mr-auto flex w-fit max-w-[95%] items-center gap-2 border-l-2 border-brand-primary py-3 pl-4 text-sm text-foreground-muted">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-brand-primary"
              aria-hidden="true"
            />
            Preparando resposta…
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 flex max-w-3xl flex-col gap-3 rounded-xl border border-coral/25 border-l-4 bg-coral-soft px-4 py-4 text-sm text-brand-deep sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>Não foi possível concluir a resposta. Tente novamente.</p>
          <button
            type="button"
            onClick={() => {
              clearError();
              void regenerate();
            }}
            disabled={isBusy}
            className="min-h-12 w-full shrink-0 rounded-xl bg-brand-primary px-4 font-semibold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 max-w-3xl">
        <label htmlFor={`guest-assistant-input-${propertyCode}`} className="sr-only">
          Escreva sua pergunta para o Assistente Virtual
        </label>
        <textarea
          id={`guest-assistant-input-${propertyCode}`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={GUEST_ASSISTANT_MAX_MESSAGE_LENGTH}
          rows={3}
          disabled={isBusy}
          placeholder="Escreva sua pergunta…"
          className="min-h-24 w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-base leading-6 text-foreground placeholder:text-foreground-muted disabled:cursor-not-allowed disabled:bg-neutral-muted"
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foreground-muted">
            Enter envia · Shift+Enter cria uma nova linha
          </p>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {isBusy && (
              <button
                type="button"
                onClick={() => stop()}
                className="min-h-12 flex-1 whitespace-nowrap rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-brand-deep hover:bg-neutral-muted sm:flex-none"
              >
                Parar resposta
              </button>
            )}
            <button
              type="submit"
              disabled={isBusy || input.trim().length === 0}
              className="min-h-12 flex-1 whitespace-nowrap rounded-xl bg-brand-primary px-6 text-sm font-semibold text-white hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-55 sm:flex-none"
            >
              {isBusy ? "Respondendo…" : "Enviar pergunta"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
