import Link from "next/link";

import BrandWordmark from "@/components/brand-wordmark";

const demoProperties = [
  {
    code: "FLN001",
    name: "Apartamento Beira-Mar Florianópolis",
    location: "Florianópolis, SC",
  },
  {
    code: "GRM001",
    name: "Chalé Serra Gramado",
    location: "Gramado, RS",
  },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-muted py-12 text-foreground md:py-16">
      <div className="content-container">
        <div className="mx-auto w-full max-w-2xl">
          <p className="text-2xl leading-none font-bold tracking-[-0.04em] text-brand-deep lowercase">
            <BrandWordmark />
          </p>

          <section className="mt-10 border-l-4 border-brand-primary pl-6 sm:pl-8">
            <p className="text-sm font-semibold tracking-[0.2em] text-brand-primary uppercase">
              Guia Digital do Hóspede
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-brand-deep sm:text-4xl">
              Tudo sobre a sua estadia em um único link
            </h1>
            <p className="mt-4 leading-7 text-foreground-muted">
              Cada imóvel tem um guia próprio, com informações de acesso, regras da estadia, contato do anfitrião, recomendações da região e um assistente para tirar dúvidas. Use o código recebido na sua reserva.
            </p>
          </section>

          <section aria-labelledby="demo-title" className="mt-10">
            <h2
              id="demo-title"
              className="text-xs font-bold tracking-[0.18em] text-brand-primary uppercase"
            >
              Imóveis de demonstração
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {demoProperties.map((property) => (
                <li key={property.code}>
                  <Link
                    href={`/${property.code}`}
                    className="flex h-full flex-col rounded-2xl border border-border bg-surface px-5 py-5 transition-colors hover:border-brand-primary hover:bg-brand-muted"
                  >
                    <span className="text-xs font-bold tracking-[0.14em] text-brand-primary uppercase">
                      {property.code}
                    </span>
                    <span className="mt-2 text-lg font-semibold text-brand-deep">
                      {property.name}
                    </span>
                    <span className="mt-1 text-sm text-foreground-muted">
                      {property.location}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
