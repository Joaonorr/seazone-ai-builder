import BrandWordmark from "@/components/brand-wordmark";

export default function PropertyNotFound() {
  return (
    <main className="min-h-screen bg-brand-muted py-12 text-foreground md:py-16">
      <div className="content-container">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-2xl leading-none font-bold tracking-[-0.04em] text-brand-deep lowercase">
            <BrandWordmark />
          </p>

          <section className="mt-10 border-l-4 border-brand-primary pl-6 sm:pl-8">
            <p className="text-sm font-semibold tracking-[0.2em] text-brand-primary uppercase">
              Código não encontrado
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-deep sm:text-4xl">
              Não localizamos este imóvel
            </h1>
            <p className="mt-4 max-w-lg leading-7 text-foreground-muted">
              Confira o código informado no endereço e tente novamente. Ele deve ser igual ao código recebido na sua reserva.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
