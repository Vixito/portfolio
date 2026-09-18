// Categorías de experiencia amplias (sirven para Colombia y para estándares
// internacionales tipo Europass). Una experiencia puede pertenecer a varias.
// Nota: no existe "proyectos" porque hay una sección propia de proyectos.
export const EXPERIENCE_CATEGORIES = [
  "laboral",
  "profesional",
  "freelance",
  "practicas",
  "docencia",
  "investigacion",
  "voluntariado",
] as const;

export type ExperienceCategory = (typeof EXPERIENCE_CATEGORIES)[number];

// Valor usado antes del modelo multi-categoría: se conserva para mostrar
// datos ya guardados, pero no se ofrece en el selector.
export const LEGACY_EXPERIENCE_CATEGORIES = ["relacionada"] as const;

export const isExperienceCategory = (value: unknown): value is ExperienceCategory =>
  typeof value === "string" &&
  (EXPERIENCE_CATEGORIES as readonly string[]).includes(value);

export const normalizeCategories = (raw: unknown): ExperienceCategory[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<ExperienceCategory>();
  for (const item of raw) {
    if (isExperienceCategory(item)) seen.add(item);
  }
  return [...seen];
};
