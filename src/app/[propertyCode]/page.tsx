import { notFound } from "next/navigation";

import { getPropertyBasicsByCode } from "@/lib/properties";

const propertyFacts = [
  {
    key: "bedroomQuantity",
    singular: "quarto",
    plural: "quartos",
  },
  {
    key: "bathroomQuantity",
    singular: "banheiro",
    plural: "banheiros",
  },
  {
    key: "guestCapacity",
    singular: "hóspede",
    plural: "hóspedes",
  },
] as const;

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ propertyCode: string }>;
}) {
  const { propertyCode } = await params;
  const property = await getPropertyBasicsByCode(propertyCode.toUpperCase());

  if (!property) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f3f6f4] px-5 py-10 text-slate-950 sm:px-8 sm:py-16">
      <article className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
        <header className="relative overflow-hidden bg-[#073c3b] px-6 py-12 text-white sm:px-12 sm:py-16">
          <div
            className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[3rem] border-white/5"
            aria-hidden="true"
          />
          <div className="relative max-w-3xl">
            <p className="mb-8 text-sm font-semibold tracking-[0.22em] text-emerald-200 uppercase">
              Guia Digital · {property.code}
            </p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-6xl">
              {property.name}
            </h1>
            <p className="mt-5 text-lg text-emerald-50/85 sm:text-xl">
              {property.propertyType} em {property.city}, {property.state}
            </p>
          </div>
        </header>

        <section className="px-6 py-9 sm:px-12 sm:py-12" aria-labelledby="property-details">
          <div className="mb-7">
            <p className="text-sm font-semibold tracking-[0.16em] text-[#14736f] uppercase">
              A propriedade
            </p>
            <h2 id="property-details" className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Informações principais
            </h2>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            {propertyFacts.map(({ key, singular, plural }) => {
              const value = property[key];

              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6">
                  <dt className="text-sm text-slate-500">{value === 1 ? singular : plural}</dt>
                  <dd className="mt-2 text-3xl font-semibold text-slate-900">{value}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      </article>
    </main>
  );
}
