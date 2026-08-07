"use client";

import BrandWordmark from "@/components/brand-wordmark";

export default function PropertyError({
  retry,
}: {
  retry: () => void;
}) {
  return (
    <main className="min-h-screen bg-background py-12 text-foreground md:py-16">
      <div className="content-container">
        <div className="mx-auto w-full max-w-2xl">
          <p className="text-2xl leading-none font-bold tracking-[-0.04em] text-brand-deep lowercase">
            <BrandWordmark />
          </p>

          <section
            role="alert"
            className="mt-8 rounded-2xl border border-coral/25 border-l-4 border-l-coral bg-coral-soft p-6 sm:p-10"
          >
            <p className="text-sm font-semibold tracking-[0.2em] text-brand-deep uppercase">
              Serviço indisponível
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-deep sm:text-4xl">
              Não foi possível carregar o guia
            </h1>
            <p className="mt-4 max-w-xl leading-7 text-foreground-muted">
              Tivemos um problema ao buscar as informações do imóvel. Tente novamente em alguns instantes.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-base)] bg-brand-primary px-6 font-semibold text-white transition-colors hover:bg-brand-deep sm:w-auto"
            >
              Tentar novamente
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
