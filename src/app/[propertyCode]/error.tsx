"use client";

import { useEffect } from "react";

export default function PropertyError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-5 py-12 text-slate-950">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white px-7 py-12 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] sm:px-12">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-700 uppercase">Serviço indisponível</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Não foi possível carregar o guia</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
          Tivemos um problema ao buscar as informações do imóvel. Tente novamente em alguns instantes.
        </p>
        <button
          type="button"
          onClick={retry}
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#073c3b] px-6 font-semibold text-white transition-colors hover:bg-[#0b5552] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14736f]"
        >
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
