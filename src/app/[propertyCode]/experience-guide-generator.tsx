"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { experienceGuideViewSchema, type ExperienceGuideView } from "@/lib/experience-guide/schema";

import ExperienceGuideContent from "./experience-guide-content";

function ExperienceGuideSkeleton() {
  return (
    <section
      className="mt-5 rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:mt-8"
      aria-labelledby="experiences-loading-title"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-[#18736f] uppercase">
        Explore a região
      </p>
      <h2
        id="experiences-loading-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
      >
        Experiências próximas
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Estamos preparando recomendações para esta localização.
      </p>

      <div className="mt-6 animate-pulse space-y-6" aria-hidden="true">
        <div className="h-24 rounded-2xl bg-slate-200" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-20 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

function ExperienceGuideFailure({ retry }: { retry: () => void }) {
  return (
    <section
      className="mt-5 rounded-[1.75rem] border border-amber-200 bg-white px-5 py-8 text-center shadow-sm sm:px-8 lg:mt-8"
      aria-labelledby="experiences-error-title"
      aria-live="polite"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-amber-700 uppercase">
        Recomendações temporariamente indisponíveis
      </p>
      <h2
        id="experiences-error-title"
        className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
      >
        Não foi possível criar as experiências próximas
      </h2>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">
        O restante do guia continua disponível. Tente gerar as recomendações novamente em alguns instantes.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-[#073f3d] px-6 font-semibold text-white transition-colors hover:bg-[#0b5552] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#18736f] disabled:cursor-not-allowed disabled:opacity-60"
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
