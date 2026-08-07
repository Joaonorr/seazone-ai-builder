"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { experienceGuideViewSchema, type ExperienceGuideView } from "@/lib/experience-guide/schema";

import ExperienceGuideContent from "./experience-guide-content";

function ExperienceGuideSkeleton() {
  return (
    <section
      className="mt-6 border-t border-border pt-8 lg:mt-8 lg:pt-10"
      aria-labelledby="experiences-loading-title"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-brand-primary uppercase">
        Explore a região
      </p>
      <h2
        id="experiences-loading-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
      >
        Experiências próximas
      </h2>
      <p className="mt-2 text-sm text-foreground-muted">
        Estamos preparando recomendações para esta localização.
      </p>

      <div className="mt-8 animate-pulse space-y-8 lg:space-y-10" aria-hidden="true">
        <div className="h-28 rounded-2xl border-l-4 border-brand-primary bg-brand-muted" />

        <div>
          <div className="h-6 w-36 rounded bg-neutral-muted" />
          <div className="mt-4 grid gap-x-8 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="border-t border-border py-5">
                <div className="h-5 w-3/5 rounded bg-neutral-muted" />
                <div className="mt-2 h-3 w-20 rounded bg-brand-muted" />
                <div className="mt-3 h-4 w-full rounded bg-neutral-muted" />
                <div className="mt-2 h-4 w-4/5 rounded bg-neutral-muted" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-brand-muted p-5 sm:p-6">
          <div className="h-6 w-28 rounded bg-surface" />
          <div className="mt-4 grid gap-x-8 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="border-t border-brand-primary/20 py-5">
                <div className="h-5 w-3/5 rounded bg-surface" />
                <div className="mt-2 h-3 w-20 rounded bg-surface" />
                <div className="mt-3 h-4 w-full rounded bg-surface" />
                <div className="mt-2 h-4 w-4/5 rounded bg-surface" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="h-6 w-44 rounded bg-neutral-muted" />
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-32 rounded-xl border border-border bg-neutral-muted"
              />
            ))}
          </div>
        </div>

        <div className="h-28 rounded-2xl border-l-4 border-coral bg-brand-muted" />
      </div>
    </section>
  );
}

function ExperienceGuideFailure({ retry }: { retry: () => void }) {
  return (
    <section
      className="mt-6 rounded-2xl border border-coral/25 border-l-4 bg-coral-soft px-5 py-7 sm:px-8 lg:mt-8"
      aria-labelledby="experiences-error-title"
      aria-live="polite"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-brand-deep uppercase">
        Recomendações temporariamente indisponíveis
      </p>
      <h2
        id="experiences-error-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
      >
        Não foi possível criar as experiências próximas
      </h2>
      <p className="mt-3 max-w-xl leading-7 text-foreground-muted">
        O restante do guia continua disponível. Tente gerar as recomendações novamente em alguns instantes.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-6 font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-60"
      >
        Tentar novamente
      </button>
    </section>
  );
}

export default function ExperienceGuideGenerator({ propertyCode }: { propertyCode: string }) {
  const [guide, setGuide] = useState<ExperienceGuideView | null>(null);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const requestInFlight = useRef<Promise<ExperienceGuideView> | null>(null);

  const requestGuide = useCallback(() => {
    if (requestInFlight.current) {
      return requestInFlight.current;
    }

    const request = (async () => {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(propertyCode)}/experience-guide`,
        { method: "POST" },
      );

      if (!response.ok) {
        throw new Error("Experience guide request failed.");
      }

      const body: unknown = await response.json();
      const candidate =
        typeof body === "object" && body !== null && "guide" in body
          ? body.guide
          : null;
      const parsedGuide = experienceGuideViewSchema.safeParse(candidate);

      if (!parsedGuide.success) {
        throw new Error("Invalid experience guide response.");
      }

      return parsedGuide.data;
    })();

    requestInFlight.current = request;
    const clearRequest = () => {
      if (requestInFlight.current === request) {
        requestInFlight.current = null;
      }
    };
    void request.then(clearRequest, clearRequest);

    return request;
  }, [propertyCode]);

  useEffect(() => {
    void requestGuide().then(setGuide).catch(() => setStatus("error"));
  }, [requestGuide]);

  if (guide) {
    return <ExperienceGuideContent guide={guide} />;
  }

  if (status === "error") {
    return (
      <ExperienceGuideFailure
        retry={() => {
          if (!requestInFlight.current) {
            setStatus("loading");
            void requestGuide().then(setGuide).catch(() => setStatus("error"));
          }
        }}
      />
    );
  }

  return <ExperienceGuideSkeleton />;
}
