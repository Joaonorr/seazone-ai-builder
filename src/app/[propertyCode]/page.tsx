import Image from "next/image";
import { notFound } from "next/navigation";

import { getPropertyByCode } from "@/lib/properties";

import ExperienceGuideContent from "./experience-guide-content";
import ExperienceGuideGenerator from "./experience-guide-generator";
import GuestAssistant from "./guest-assistant";

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

const accessTypeLabels: Readonly<Record<string, string>> = {
  smart_lock: "Fechadura eletrônica",
  keybox: "Cofre de chaves",
};

function SectionHeading({
  eyebrow,
  title,
  id,
}: {
  eyebrow: string;
  title: string;
  id: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-[0.18em] text-[#18736f] uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
        {title}
      </h2>
    </div>
  );
}

function RuleItem({ permitted, children }: { permitted: boolean; children: string }) {
  return (
    <li className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm leading-6 text-slate-700 sm:text-base">
      <span
        className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${permitted ? "bg-emerald-500" : "bg-rose-400"}`}
        aria-hidden="true"
      />
      {children}
    </li>
  );
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  return phone;
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ propertyCode: string }>;
}) {
  const { propertyCode } = await params;
  const property = await getPropertyByCode(propertyCode.toUpperCase());

  if (!property) {
    notFound();
  }

  const accessType =
    accessTypeLabels[property.propertyAccessType] ?? "Acesso orientado pelo anfitrião";

  return (
    <main className="min-h-screen bg-[#f2f5f1] px-4 py-5 text-slate-950 sm:px-8 sm:py-10 lg:py-14">
      <article className="mx-auto max-w-7xl">
        <header className="grid overflow-hidden rounded-[1.75rem] bg-[#073f3d] text-white shadow-[0_28px_90px_-45px_rgba(7,63,61,0.8)] lg:grid-cols-[0.92fr_1.08fr] lg:rounded-[2.25rem]">
          <div className="order-2 flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:order-1 lg:px-14 lg:py-16">
            <p className="w-fit rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-[0.18em] text-emerald-100 uppercase">
              Guia do imóvel · {property.code}
            </p>
            <h1 className="mt-6 text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {property.name}
            </h1>
            <p className="mt-4 text-lg text-emerald-50/80">
              {property.propertyType} em {property.city}, {property.state}
            </p>

            <dl className="mt-8 grid grid-cols-3 gap-2.5 sm:gap-3">
              {propertyFacts.map(({ key, singular, plural }) => {
                const value = property[key];

                return (
                  <div key={key} className="rounded-2xl bg-white/10 px-3 py-4 sm:px-4">
                    <dd className="text-2xl font-semibold sm:text-3xl">{value}</dd>
                    <dt className="mt-1 text-xs text-emerald-50/75 sm:text-sm">
                      {value === 1 ? singular : plural}
                    </dt>
                  </div>
                );
              })}
            </dl>
          </div>

          <div className="relative order-1 min-h-72 bg-[#cbd9d1] sm:min-h-96 lg:order-2 lg:min-h-[38rem]">
            {property.mainImageUrl ? (
              <Image
                src={property.mainImageUrl}
                alt={`Vista principal de ${property.name}`}
                fill
                preload
                sizes="(max-width: 1023px) 100vw, 55vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full min-h-72 items-center justify-center px-8 text-center font-medium text-[#073f3d] sm:min-h-96 lg:min-h-[38rem]">
                Imagem do imóvel indisponível
              </div>
            )}
          </div>
        </header>

        <div className="mt-5 grid items-start gap-5 lg:mt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.75fr)] lg:gap-8">
          <div className="space-y-5 lg:space-y-8">
            {property.amenities.length > 0 && (
              <section
                className="rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9"
                aria-labelledby="amenities-title"
              >
                <SectionHeading
                  eyebrow="Conforto"
                  title="O que você encontra aqui"
                  id="amenities-title"
                />
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {property.amenities.map((amenity) => (
                    <li
                      key={amenity}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:text-base"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#1c8b84]" aria-hidden="true" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section
              className="rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9"
              aria-labelledby="access-title"
            >
              <SectionHeading eyebrow="Chegada" title="Acesso ao imóvel" id="access-title" />

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#e8f4f1] px-5 py-5">
                  <p className="text-xs font-bold tracking-[0.14em] text-[#18736f] uppercase">
                    Rede Wi-Fi
                  </p>
                  <p className="mt-2 break-all text-lg font-semibold text-[#073f3d]">
                    {property.wifiNetwork}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#073f3d] px-5 py-5 text-white">
                  <p className="text-xs font-bold tracking-[0.14em] text-emerald-200 uppercase">
                    Senha do Wi-Fi
                  </p>
                  <p className="mt-2 break-all font-mono text-xl font-semibold tracking-wide">
                    {property.wifiPassword}
                  </p>
                </div>
              </div>

              <div className="mt-7 border-t border-slate-200 pt-7">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-950">Como entrar</h3>
                  {property.isSelfCheckin && (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Check-in autônomo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium text-[#18736f]">{accessType}</p>
                <p className="mt-3 leading-7 text-slate-600">
                  {property.propertyAccessInstructions}
                </p>

                {property.propertyPassword && (
                  <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-amber-800 uppercase">
                      Código de acesso
                    </p>
                    <p className="mt-1.5 font-mono text-2xl font-bold tracking-[0.16em] text-amber-950">
                      {property.propertyPassword}
                    </p>
                  </div>
                )}
              </div>

              {property.hasParkingSpot && (
                <div className="mt-7 border-t border-slate-200 pt-7">
                  <h3 className="text-lg font-semibold text-slate-950">Estacionamento</h3>
                  {property.parkingSpotIdentifier && (
                    <p className="mt-2 font-semibold text-[#073f3d]">
                      {property.parkingSpotIdentifier}
                    </p>
                  )}
                  <p className="mt-2 leading-7 text-slate-600">
                    {property.parkingSpotInstructions ??
                      "Há estacionamento disponível no imóvel."}
                  </p>
                </div>
              )}
            </section>

            <section
              className="rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9"
              aria-labelledby="rules-title"
            >
              <SectionHeading eyebrow="Sua estadia" title="Horários e regras" id="rules-title" />

              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[#e8f4f1] px-4 py-5 sm:px-5">
                  <dt className="text-sm font-medium text-[#18736f]">Check-in a partir de</dt>
                  <dd className="mt-1 text-3xl font-semibold text-[#073f3d]">
                    {property.checkInTime}
                  </dd>
                </div>
                <div className="rounded-2xl bg-[#e8f4f1] px-4 py-5 sm:px-5">
                  <dt className="text-sm font-medium text-[#18736f]">Check-out até</dt>
                  <dd className="mt-1 text-3xl font-semibold text-[#073f3d]">
                    {property.checkOutTime}
                  </dd>
                </div>
              </dl>

              <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                <RuleItem permitted={property.allowPet}>
                  {property.allowPet
                    ? "Animais de estimação são permitidos."
                    : "Animais de estimação não são permitidos."}
                </RuleItem>
                <RuleItem permitted={property.smokingPermitted}>
                  {property.smokingPermitted
                    ? "É permitido fumar no imóvel."
                    : "Não é permitido fumar no imóvel."}
                </RuleItem>
                <RuleItem permitted={property.suitableForChildren}>
                  {property.suitableForChildren
                    ? "O imóvel é adequado para crianças."
                    : "O imóvel não é indicado para crianças."}
                </RuleItem>
                <RuleItem permitted={property.suitableForBabies}>
                  {property.suitableForBabies
                    ? "O imóvel é adequado para bebês."
                    : "O imóvel não é indicado para bebês."}
                </RuleItem>
                <RuleItem permitted={property.eventsPermitted}>
                  {property.eventsPermitted
                    ? "Festas e eventos são permitidos."
                    : "Festas e eventos não são permitidos."}
                </RuleItem>
              </ul>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <section
              className="rounded-[1.75rem] bg-[#dce9e2] px-5 py-7 sm:px-8"
              aria-labelledby="address-title"
            >
              <SectionHeading eyebrow="Localização" title="Endereço" id="address-title" />
              <address className="mt-5 text-base leading-7 text-slate-700 not-italic">
                <p>
                  {property.street}, {property.number}
                  {property.complement && <>, {property.complement}</>}
                </p>
                <p>{property.neighborhood}</p>
                <p>
                  {property.city} — {property.state}
                </p>
                <p>CEP {property.postalCode}</p>
              </address>
            </section>

            <section
              className="rounded-[1.75rem] bg-[#073f3d] px-5 py-7 text-white shadow-[0_22px_60px_-40px_rgba(7,63,61,0.9)] sm:px-8"
              aria-labelledby="host-title"
            >
              <p className="text-xs font-bold tracking-[0.18em] text-emerald-200 uppercase">
                Precisa de ajuda?
              </p>
              <h2 id="host-title" className="mt-2 text-2xl font-semibold tracking-tight">
                Fale com o anfitrião
              </h2>
              <p className="mt-5 text-sm text-emerald-100/70">Anfitrião responsável</p>
              <p className="mt-1 text-lg font-semibold">{property.hostName}</p>
              <a
                href={`tel:${property.hostPhone}`}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 font-semibold text-[#073f3d] transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                {formatPhone(property.hostPhone)}
              </a>
            </section>
          </aside>
        </div>

        <GuestAssistant propertyCode={property.code} />

        {property.experienceGuide ? (
          <ExperienceGuideContent guide={property.experienceGuide} />
        ) : (
          <ExperienceGuideGenerator propertyCode={property.code} />
        )}
      </article>
    </main>
  );
}
