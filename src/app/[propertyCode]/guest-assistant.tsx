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
      className="mt-5 rounded-[1.75rem] border border-slate-200/80 bg-white px-4 py-7 shadow-sm sm:px-8 sm:py-9 lg:mt-8"
      aria-labelledby="guest-assistant-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#18736f] uppercase">
            Tire suas dúvidas
          </p>
          <h2
            id="guest-assistant-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
          >
            Assistente Virtual
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Pergunte sobre acesso, regras, horários e experiências deste imóvel.
          </p>
        </div>
        <span className="rounded-full bg-[#e8f4f1] px-3 py-1.5 text-xs font-medium text-[#18736f]">
          Respostas em tempo real
        </span>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {suggestedQuestions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => send(question)}
            disabled={isBusy}
            className="min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:border-[#1c8b84] hover:bg-[#e8f4f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18736f] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {question}
          </button>
        ))}
      </div>

      <div
        ref={messageListRef}
        className="mt-5 max-h-96 min-h-44 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={isBusy}
        role="log"
      >
        {messages.length === 0 ? (
          <div className="flex min-h-36 items-center justify-center px-4 text-center text-sm leading-6 text-slate-500">
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
                className={`w-fit max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap sm:max-w-[80%] sm:text-base ${
                  isGuest
                    ? "ml-auto bg-[#073f3d] text-white"
                    : "mr-auto border border-slate-200 bg-white text-slate-700"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-bold tracking-[0.12em] uppercase ${
                    isGuest ? "text-emerald-200" : "text-[#18736f]"
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
          <div className="mr-auto flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            <span
              className="h-2 w-2 animate-pulse rounded-full bg-[#1c8b84]"
              aria-hidden="true"
            />
            Preparando resposta…
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
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
            className="min-h-10 shrink-0 rounded-full border border-amber-300 bg-white px-4 font-semibold transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:cursor-not-allowed disabled:opacity-55"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4">
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
          className="min-h-24 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus-visible:border-[#18736f] focus-visible:ring-2 focus-visible:ring-[#18736f]/25 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Enter envia · Shift+Enter cria uma nova linha
          </p>
          <div className="flex items-center gap-2">
            {isBusy && (
              <button
                type="button"
                onClick={() => stop()}
                className="min-h-11 rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18736f]"
              >
                Parar resposta
              </button>
            )}
            <button
              type="submit"
              disabled={isBusy || input.trim().length === 0}
              className="min-h-11 rounded-full bg-[#073f3d] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#0b5552] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#18736f] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isBusy ? "Respondendo…" : "Enviar pergunta"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
