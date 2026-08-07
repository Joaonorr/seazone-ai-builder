import Image from "next/image";

import BrandWordmark from "@/components/brand-wordmark";
import { getPropertyByCode } from "@/lib/properties";

import ExperienceGuideContent from "./experience-guide-content";
import ExperienceGuideGenerator from "./experience-guide-generator";
import GuestAssistant from "./guest-assistant";
import PropertyNotFound from "./property-not-found";

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
      <p className="text-xs font-bold tracking-[0.18em] text-brand-primary uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function RuleItem({ permitted, children }: { permitted: boolean; children: string }) {
  return (
    <li className="grid grid-cols-[0.25rem_minmax(0,1fr)] gap-3 border-b border-border py-3.5 text-sm leading-6 text-foreground-muted last:border-b-0 sm:text-base">
      <span
        className={`self-stretch rounded-full ${permitted ? "bg-success" : "bg-coral"}`}
        aria-hidden="true"
      />
      <span>{children}</span>
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
    return <PropertyNotFound />;
  }

  const accessType =
    accessTypeLabels[property.propertyAccessType] ?? "Acesso orientado pelo anfitrião";

  return (
    <main className="min-h-screen bg-background py-[var(--section-spacing)] text-foreground">
      <article className="content-container">
        <header className="relative isolate h-[25rem] overflow-hidden rounded-3xl bg-brand-deep text-white shadow-[0_28px_80px_-48px_rgba(0,20,61,0.75)] md:h-[27rem]">
          {property.mainImageUrl ? (
            <>
              <Image
                src={property.mainImageUrl}
                alt={`Vista principal de ${property.name}`}
                fill
                preload
                sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 960px"
                className="object-cover"
              />
              <div
                className="absolute inset-0 bg-linear-to-t from-brand-deep via-brand-deep/70 to-brand-deep/20"
                aria-hidden="true"
              />
            </>
          ) : (
            <p className="absolute inset-x-8 top-1/2 -translate-y-1/2 text-center font-medium text-white/70">
              Imagem do imóvel indisponível
            </p>
          )}

          <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 md:p-10">
            <p className="text-xl leading-none font-bold tracking-[-0.04em] lowercase">
              <BrandWordmark />
            </p>

            <div className="max-w-3xl">
              <p className="w-fit rounded-full border border-white/25 bg-brand-deep/45 px-3.5 py-1.5 text-xs font-bold tracking-[0.18em] text-white uppercase backdrop-blur-sm">
                Guia do imóvel · {property.code}
              </p>
              <h1 className="mt-5 text-[1.875rem] leading-[1.08] font-bold tracking-tight text-balance text-white md:text-4xl">
                {property.name}
              </h1>
              <p className="mt-3 text-base font-medium text-white/85 sm:text-lg">
                {property.propertyType} em {property.city}, {property.state}
              </p>
            </div>
          </div>
        </header>

        <dl className="relative z-10 mx-3 -mt-6 grid grid-cols-6 gap-2 sm:mx-5 sm:gap-3 md:grid-cols-5 lg:mx-8">
          {propertyFacts.map(({ key, singular, plural }) => {
            const value = property[key];

            return (
              <div
                key={key}
                className="col-span-2 rounded-[var(--radius-base)] border border-border bg-surface px-3 py-4 shadow-[0_12px_32px_-26px_rgba(0,20,61,0.55)] sm:px-4 md:col-span-1"
              >
                <dt className="text-xs font-semibold text-foreground-muted sm:text-sm">
                  {value === 1 ? singular : plural}
                </dt>
                <dd className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{value}</dd>
              </div>
            );
          })}
          <div className="col-span-3 rounded-[var(--radius-base)] border border-border bg-surface px-3 py-4 shadow-[0_12px_32px_-26px_rgba(0,20,61,0.55)] sm:px-4 md:col-span-1">
            <dt className="text-xs font-semibold text-foreground-muted sm:text-sm">Check-in</dt>
            <dd className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {property.checkInTime}
            </dd>
          </div>
          <div className="col-span-3 rounded-[var(--radius-base)] border border-border bg-surface px-3 py-4 shadow-[0_12px_32px_-26px_rgba(0,20,61,0.55)] sm:px-4 md:col-span-1">
            <dt className="text-xs font-semibold text-foreground-muted sm:text-sm">Check-out</dt>
            <dd className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {property.checkOutTime}
            </dd>
          </div>
        </dl>

        <div className="mt-6 space-y-6 lg:mt-8 lg:space-y-8">
          <section aria-labelledby="access-title">
            <SectionHeading eyebrow="Chegada" title="Acesso ao imóvel" id="access-title" />

            <dl className="mt-6 overflow-hidden rounded-2xl border border-border sm:grid sm:grid-cols-2">
              <div className="bg-brand-muted p-5 sm:p-6">
                <dt className="text-xs font-bold tracking-[0.14em] text-brand-primary uppercase">
                  Rede Wi-Fi
                </dt>
                <dd className="mt-2 break-words text-lg font-semibold text-brand-deep">
                  {property.wifiNetwork}
                </dd>
              </div>
              <div className="border-t border-border bg-surface p-5 sm:border-t-0 sm:border-l sm:p-6">
                <dt className="text-xs font-bold tracking-[0.14em] text-brand-primary uppercase">
                  Senha do Wi-Fi
                </dt>
                <dd className="mt-2 break-words font-mono text-2xl font-bold tracking-wide text-brand-deep">
                  {property.wifiPassword}
                </dd>
              </div>
            </dl>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:gap-6">
              <div
                className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${property.hasParkingSpot ? "" : "md:col-span-2"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Como entrar</h3>
                  {property.isSelfCheckin && (
                    <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-foreground">
                      Check-in autônomo
                    </span>
                  )}
                </div>
                <p className="mt-2 font-semibold text-brand-primary">{accessType}</p>
                <p className="mt-3 leading-7 text-foreground-muted">
                  {property.propertyAccessInstructions}
                </p>

                {property.propertyPassword && (
                  <dl className="mt-5 rounded-[var(--radius-base)] border border-coral/25 bg-coral-soft px-5 py-4">
                    <dt className="text-xs font-bold tracking-[0.14em] text-foreground-muted uppercase">
                      Código de acesso
                    </dt>
                    <dd className="mt-1.5 font-mono text-2xl font-bold tracking-[0.16em] text-brand-deep">
                      {property.propertyPassword}
                    </dd>
                  </dl>
                )}
              </div>

              {property.hasParkingSpot && (
                <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 md:self-start">
                  <h3 className="text-lg font-semibold text-foreground">Estacionamento</h3>
                  {property.parkingSpotIdentifier && (
                    <p className="mt-3 text-lg font-semibold text-brand-deep">
                      {property.parkingSpotIdentifier}
                    </p>
                  )}
                  <p
                    className={`${property.parkingSpotIdentifier ? "mt-2" : "mt-3"} leading-7 text-foreground-muted`}
                  >
                    {property.parkingSpotInstructions ??
                      "Há estacionamento disponível no imóvel."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="rules-title">
            <SectionHeading eyebrow="Sua estadia" title="Horários e regras" id="rules-title" />

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-start lg:gap-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Horários</h3>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius-base)] border border-border bg-brand-muted px-4 py-5">
                    <dt className="text-xs font-medium text-brand-primary sm:text-sm">
                      Check-in a partir de
                    </dt>
                    <dd className="mt-1 text-[2rem] leading-none font-bold text-brand-deep">
                      {property.checkInTime}
                    </dd>
                  </div>
                  <div className="rounded-[var(--radius-base)] border border-border bg-brand-muted px-4 py-5">
                    <dt className="text-xs font-medium text-brand-primary sm:text-sm">
                      Check-out até
                    </dt>
                    <dd className="mt-1 text-[2rem] leading-none font-bold text-brand-deep">
                      {property.checkOutTime}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">Regras da estadia</h3>
                <ul className="mt-3 border-y border-border">
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
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
            <section
              className="rounded-2xl bg-brand-muted p-5 sm:p-6"
              aria-labelledby="address-title"
            >
              <SectionHeading eyebrow="Localização" title="Endereço" id="address-title" />
              <address className="mt-5 text-base leading-7 text-foreground-muted not-italic">
                <p className="font-medium text-foreground">
                  {property.street}, {property.number}
                  {property.complement && <>, {property.complement}</>}
                </p>
                <p className="mt-1">{property.neighborhood}</p>
                <p>
                  {property.city} — {property.state}
                </p>
                <p>CEP {property.postalCode}</p>
              </address>
            </section>

            <section
              className="rounded-2xl bg-brand-deep p-5 text-white sm:p-6"
              aria-labelledby="host-title"
            >
              <p className="text-xs font-bold tracking-[0.18em] text-brand-muted uppercase">
                Precisa de ajuda?
              </p>
              <h2 id="host-title" className="mt-2 text-2xl font-semibold tracking-tight">
                Fale com o anfitrião
              </h2>
              <p className="mt-5 text-sm text-white/70">Anfitrião responsável</p>
              <p className="mt-1 text-xl font-semibold">{property.hostName}</p>
              <a
                href={`tel:${property.hostPhone}`}
                aria-label={`Ligar para ${property.hostName} pelo telefone ${formatPhone(property.hostPhone)}`}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-base)] bg-surface px-5 font-semibold text-brand-deep transition-colors hover:bg-brand-muted focus-visible:outline-focus-ring! sm:w-auto"
              >
                {formatPhone(property.hostPhone)}
              </a>
            </section>
          </div>

          {property.amenities.length > 0 && (
            <section aria-labelledby="amenities-title">
              <SectionHeading
                eyebrow="Conforto"
                title="O que você encontra aqui"
                id="amenities-title"
              />
              <ul className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {property.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="border-b border-border py-3 text-sm font-medium text-foreground-muted sm:text-base"
                  >
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <GuestAssistant propertyCode={property.code} />

        {property.experienceGuide ? (
          <ExperienceGuideContent guide={property.experienceGuide} />
        ) : (
          <ExperienceGuideGenerator propertyCode={property.code} />
        )}

        <footer className="mt-8 rounded-2xl bg-brand-deep px-5 py-5 text-center text-xl leading-none font-bold tracking-[-0.04em] text-white lowercase sm:mt-10 sm:px-6 sm:py-6">
          <BrandWordmark />
        </footer>
      </article>
    </main>
  );
}
