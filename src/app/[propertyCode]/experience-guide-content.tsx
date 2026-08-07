import type { ExperienceGuideView } from "@/lib/experience-guide/schema";

const essentialTypeLabels = {
  pharmacy: "Farmácia",
  supermarket: "Supermercado",
  hospital: "Hospital / pronto atendimento",
} as const;

function PlaceList({
  items,
  variant,
}: {
  items: ExperienceGuideView["restaurants"] | ExperienceGuideView["attractions"];
  variant: "restaurants" | "attractions";
}) {
  const isAttractions = variant === "attractions";

  return (
    <ul className="mt-4 grid items-start gap-x-8 md:grid-cols-2">
      {items.map((item, index) => (
        <li
          key={`${item.name}-${index}`}
          className={`border-t py-5 ${
            isAttractions ? "border-brand-primary/20" : "border-border"
          }`}
        >
          <h4 className="text-lg font-semibold text-foreground">{item.name}</h4>
          <p
            className={`mt-1 text-xs font-semibold ${
              isAttractions ? "text-foreground-muted" : "text-brand-primary"
            }`}
          >
            {item.distance}
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {item.description}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function ExperienceGuideContent({
  guide,
}: {
  guide: ExperienceGuideView;
}) {
  return (
    <section
      className="mt-6 border-t border-border pt-8 lg:mt-8 lg:pt-10"
      aria-labelledby="experiences-title"
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-brand-primary uppercase">
            Explore a região
          </p>
          <h2
            id="experiences-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-foreground"
          >
            Experiências próximas
          </h2>
        </div>
        <span className="rounded-full border border-border bg-neutral-muted px-3 py-1.5 text-xs font-medium text-foreground-muted">
          Conteúdo criado com auxílio de IA
        </span>
      </div>

      <div className="mt-8 space-y-8 lg:space-y-10">
        <div className="rounded-2xl border-l-4 border-brand-primary bg-brand-muted px-5 py-5 sm:px-6">
          <p className="text-xs font-bold tracking-[0.14em] text-brand-primary uppercase">
            Boas-vindas
          </p>
          <p className="mt-2 leading-7 text-brand-deep">{guide.welcomeMessage}</p>
        </div>

        <section aria-labelledby="experiences-restaurants-title">
          <h3
            id="experiences-restaurants-title"
            className="text-xl font-semibold text-foreground"
          >
            Restaurantes
          </h3>
          <PlaceList items={guide.restaurants} variant="restaurants" />
        </section>

        <section
          className="rounded-2xl bg-brand-muted p-5 sm:p-6"
          aria-labelledby="experiences-attractions-title"
        >
          <h3
            id="experiences-attractions-title"
            className="text-xl font-semibold text-brand-deep"
          >
            Atrações
          </h3>
          <PlaceList items={guide.attractions} variant="attractions" />
        </section>

        <section aria-labelledby="experiences-essentials-title">
          <h3
            id="experiences-essentials-title"
            className="text-xl font-semibold text-foreground"
          >
            Serviços essenciais
          </h3>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {guide.essentials.map((service, index) => (
              <li
                key={`${service.type}-${service.name}-${index}`}
                className="rounded-xl border border-border bg-surface px-4 py-4 sm:px-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-[0.1em] text-brand-primary uppercase">
                    {essentialTypeLabels[service.type]}
                  </span>
                  <span className="text-xs font-semibold text-foreground-muted">
                    {service.distance}
                  </span>
                </div>
                <h4 className="mt-2 text-lg font-semibold text-foreground">
                  {service.name}
                </h4>
                <p className="mt-2 text-sm leading-6 text-foreground-muted">
                  {service.description}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="rounded-2xl border border-coral/25 border-l-4 bg-coral-soft px-5 py-5 sm:px-6">
          <p className="text-xs font-bold tracking-[0.14em] text-brand-deep uppercase">
            Dica da estação
          </p>
          <p className="mt-2 leading-7 text-brand-deep">{guide.seasonalTip}</p>
        </div>

        <p className="text-xs leading-5 text-foreground-muted">
          As distâncias informadas são aproximadas e podem variar conforme o trajeto.
        </p>
      </div>
    </section>
  );
}
