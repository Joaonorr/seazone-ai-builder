import type { ExperienceGuideView } from "@/lib/experience-guide/schema";

const essentialTypeLabels = {
  pharmacy: "Farmácia",
  supermarket: "Supermercado",
  hospital: "Saúde",
} as const;

function PlaceList({
  items,
}: {
  items: ExperienceGuideView["restaurants"] | ExperienceGuideView["attractions"];
}) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <li
          key={`${item.name}-${index}`}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-950">{item.name}</h4>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#18736f] ring-1 ring-slate-200">
              {item.distance}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
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
      className="mt-5 rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-7 shadow-sm sm:px-8 sm:py-9 lg:mt-8"
      aria-labelledby="experiences-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[#18736f] uppercase">
            Explore a região
          </p>
          <h2
            id="experiences-title"
            className="mt-2 text-2xl font-semibold tracking-tight text-slate-950"
          >
            Experiências próximas
          </h2>
        </div>
        <span className="rounded-full bg-[#e8f4f1] px-3 py-1.5 text-xs font-medium text-[#18736f]">
          Conteúdo criado com auxílio de IA
        </span>
      </div>

      <div className="mt-6 rounded-2xl bg-[#073f3d] px-5 py-5 text-emerald-50 sm:px-6">
        <p className="text-xs font-bold tracking-[0.14em] text-emerald-200 uppercase">
          Boas-vindas
        </p>
        <p className="mt-2 leading-7">{guide.welcomeMessage}</p>
      </div>

      <div className="mt-7 grid gap-7 lg:grid-cols-2 lg:gap-8">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Restaurantes</h3>
          <PlaceList items={guide.restaurants} />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Atrações</h3>
          <PlaceList items={guide.attractions} />
        </div>
      </div>

      <div className="mt-7 border-t border-slate-200 pt-7">
        <h3 className="text-xl font-semibold text-slate-950">Serviços essenciais</h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guide.essentials.map((service, index) => (
            <li
              key={`${service.type}-${service.name}-${index}`}
              className="rounded-2xl bg-[#e8f4f1] px-4 py-4 sm:px-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold tracking-[0.12em] text-[#18736f] uppercase">
                  {essentialTypeLabels[service.type]}
                </span>
                <span className="text-xs font-semibold text-[#18736f]">
                  {service.distance}
                </span>
              </div>
              <h4 className="mt-2 font-semibold text-[#073f3d]">{service.name}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5">
        <p className="text-xs font-bold tracking-[0.14em] text-amber-800 uppercase">
          Dica da estação
        </p>
        <p className="mt-2 leading-7 text-amber-950">{guide.seasonalTip}</p>
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        As distâncias informadas são aproximadas e podem variar conforme o trajeto.
      </p>
    </section>
  );
}
