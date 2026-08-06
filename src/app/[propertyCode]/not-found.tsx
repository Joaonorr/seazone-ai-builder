import Link from "next/link";

export default function PropertyNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f4] px-5 py-12 text-slate-950">
      <section className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white px-7 py-12 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] sm:px-12">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#14736f] uppercase">Código não encontrado</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Não localizamos este imóvel</h1>
        <p className="mx-auto mt-4 max-w-md leading-7 text-slate-600">
          Confira o código informado no endereço e tente novamente. Ele deve ser igual ao código recebido na sua reserva.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#073c3b] px-6 font-semibold text-white transition-colors hover:bg-[#0b5552] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14736f]"
        >
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
