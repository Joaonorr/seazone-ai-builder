import { z } from "zod";

const markdownPattern =
  /(^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+\.\s|>\s)|```|`[^`]+`|\*\*|__|\[[^\]]+\]\([^)]+\)/m;
const urlPattern = /(?:https?:\/\/|www\.)/i;
const phonePattern = /(?:\+?\d[\s().-]*){8,}/;
const pricePattern = /R\$\s*\d/i;
const operatingHoursPattern = /\b\d{1,2}(?::\d{2}|h\d{0,2})\b/i;

function plainText(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, "O texto não pode ser vazio.")
    .max(maxLength, `O texto deve ter no máximo ${maxLength} caracteres.`)
    .refine((value) => !markdownPattern.test(value), "Markdown não é permitido.")
    .refine((value) => !urlPattern.test(value), "URLs não são permitidas.")
    .refine((value) => !phonePattern.test(value), "Telefones não são permitidos.")
    .refine((value) => !pricePattern.test(value), "Preços não são permitidos.")
    .refine(
      (value) => !operatingHoursPattern.test(value),
      "Horários de funcionamento não são permitidos.",
    );
}

const nearbyPlaceSchema = z.strictObject({
  name: plainText(100),
  distance: plainText(80),
  description: plainText(320),
});

const essentialServiceSchema = z.strictObject({
  name: plainText(100),
  type: z.enum(["pharmacy", "supermarket", "hospital"]),
  distance: plainText(80),
  description: plainText(320),
});

export const experienceGuideContentSchema = z.strictObject({
  welcomeMessage: plainText(600),
  restaurants: z.array(nearbyPlaceSchema).min(4).max(5),
  attractions: z.array(nearbyPlaceSchema).min(3).max(4),
  essentials: z
    .array(essentialServiceSchema)
    .min(3)
    .max(6)
    .superRefine((services, context) => {
      const presentTypes = new Set(services.map((service) => service.type));

      for (const requiredType of ["pharmacy", "supermarket", "hospital"] as const) {
        if (!presentTypes.has(requiredType)) {
          context.addIssue({
            code: "custom",
            message: `O serviço essencial ${requiredType} é obrigatório.`,
          });
        }
      }
    }),
  seasonalTip: plainText(500),
});

export const experienceGuideViewSchema = experienceGuideContentSchema.extend({
  modelName: z.string().trim().min(1).max(120).nullable(),
  promptVersion: z.string().trim().min(1).max(80),
  generatedAt: z.string().trim().min(1).max(80),
});

export type ExperienceGuideContent = z.infer<typeof experienceGuideContentSchema>;
export type ExperienceGuideView = z.infer<typeof experienceGuideViewSchema>;

export type StoredExperienceGuide = {
  welcomeMessage: string;
  restaurants: unknown;
  attractions: unknown;
  essentials: unknown;
  seasonalTip: string;
  modelName: string | null;
  promptVersion: string;
  generatedAt: Date;
};

export function parseStoredExperienceGuide(record: StoredExperienceGuide) {
  return experienceGuideViewSchema.parse({
    welcomeMessage: record.welcomeMessage,
    restaurants: record.restaurants,
    attractions: record.attractions,
    essentials: record.essentials,
    seasonalTip: record.seasonalTip,
    modelName: record.modelName,
    promptVersion: record.promptVersion,
    generatedAt: record.generatedAt.toISOString(),
  });
}

export function safeParseStoredExperienceGuide(record: StoredExperienceGuide) {
  return experienceGuideViewSchema.safeParse({
    welcomeMessage: record.welcomeMessage,
    restaurants: record.restaurants,
    attractions: record.attractions,
    essentials: record.essentials,
    seasonalTip: record.seasonalTip,
    modelName: record.modelName,
    promptVersion: record.promptVersion,
    generatedAt: record.generatedAt.toISOString(),
  });
}
