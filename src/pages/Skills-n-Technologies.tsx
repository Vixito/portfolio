import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getTechnologies } from "../lib/supabase-functions";
import { useTranslation, getTranslatedText } from "../lib/i18n";

interface Technology {
  id: string;
  name: string;
  name_translations?: any;
  category:
    | "language"
    | "framework"
    | "database"
    | "tool"
    | "cloud"
    | "instrument"
    | "music"
    | "other";
  level: "beginner" | "intermediate" | "advanced" | "expert";
  icon?: string; // URL desde S3/CloudFront o nombre de icono (legacy)
  badge_url?: string; // URL del badge (shields.io u otro servicio)
  yearsOfExperience?: number;
}

function SkillsNTechnologies() {
  const { t } = useTranslation();
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: "",
    category: "all" as Technology["category"] | "all",
    level: "all" as Technology["level"] | "all",
    experience: "all" as "all" | "1-2" | "3-4" | "5+",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTechnologies = async () => {
      try {
        setLoading(true);
        const data = await getTechnologies();
        // Mapear datos de Supabase al formato de la interfaz
        const currentYear = new Date().getFullYear();
        const mappedTechnologies: Technology[] = (data || []).map(
          (tech: any) => {
            // Calcular años de experiencia automáticamente desde start_year
            let yearsOfExperience = tech.years_of_experience;
            if (tech.start_year) {
              const startYear = parseInt(tech.start_year.toString());
              yearsOfExperience = currentYear - startYear;
            }
            return {
              id: tech.id,
              name: tech.name,
              name_translations: tech.name_translations,
              category: tech.category,
              level: tech.level,
              icon: tech.icon,
              badge_url: tech.badge_url,
              yearsOfExperience: yearsOfExperience,
            };
          }
        );
        setTechnologies(mappedTechnologies);
      } catch (error) {
        console.error("Error al cargar tecnologías:", error);
        setTechnologies([]);
      } finally {
        setLoading(false);
      }
    };

    loadTechnologies();
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!containerRef.current || loading) return;

    const rows = containerRef.current.querySelectorAll(".tech-card");
    gsap.fromTo(
      rows,
      {
        opacity: 0,
        x: -20,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.03,
        ease: "power2.out",
      }
    );
  }, [loading, filters]);

  // Filtrar tecnologías según todos los filtros
  const filteredTechnologies = technologies.filter((tech) => {
    // Filtro por nombre
    if (
      filters.name &&
      !tech.name.toLowerCase().includes(filters.name.toLowerCase())
    ) {
      return false;
    }

    // Filtro por categoría
    if (filters.category !== "all" && tech.category !== filters.category) {
      return false;
    }

    // Filtro por nivel
    if (filters.level !== "all" && tech.level !== filters.level) {
      return false;
    }

    // Filtro por experiencia
    if (filters.experience !== "all") {
      if (!tech.yearsOfExperience) {
        return false; // Si no tiene años de experiencia y se está filtrando, excluir
      }
      const years = tech.yearsOfExperience;
      if (filters.experience === "1-2" && (years < 1 || years > 2)) {
        return false;
      }
      if (filters.experience === "3-4" && (years < 3 || years > 4)) {
        return false;
      }
      if (filters.experience === "5+" && years < 5) {
        return false;
      }
    }

    return true;
  });

  const getCategoryLabel = (category: Technology["category"]) => {
    return t(`skills.${category}`);
  };

  const getLevelColor = (level: Technology["level"]) => {
    const colors = {
      beginner: "bg-gray-200 text-gray-700",
      intermediate: "bg-blue/20 text-blue",
      advanced: "bg-purple/20 text-purple",
      expert: "bg-green-500/20 text-green-700",
    };
    return colors[level];
  };

  const getLevelLabel = (level: Technology["level"]) => {
    const labels = {
      beginner: t("skills.beginner"),
      intermediate: t("skills.intermediate"),
      advanced: t("skills.advanced"),
      expert: t("skills.expert"),
    };
    return labels[level];
  };

  const getProgressWidth = (level: Technology["level"]) => {
    const widths = {
      beginner: "25%",
      intermediate: "50%",
      advanced: "75%",
      expert: "100%",
    };
    return widths[level];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("skills.loading")}</div>
      </div>
    );
  }

  // Ordenar tecnologías por categoría y luego por nombre
  const sortedTechnologies = [...filteredTechnologies].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          {t("skills.title")}
        </h1>

        {/* Tabla de tecnologías */}
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow-md border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("skills.title")}
                    </span>
                    <input
                      type="text"
                      placeholder={t("skills.namePlaceholder")}
                      value={filters.name}
                      onChange={(e) =>
                        setFilters({ ...filters, name: e.target.value })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple dark:focus:border-cyan-200"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("skills.category")}
                    </span>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          category: e.target.value as
                            | Technology["category"]
                            | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("skills.all")}</option>
                      <option value="language">{t("skills.language")}</option>
                      <option value="framework">{t("skills.framework")}</option>
                      <option value="database">{t("skills.database")}</option>
                      <option value="tool">{t("skills.tool")}</option>
                      <option value="cloud">{t("skills.cloud")}</option>
                      <option value="instrument">
                        {t("skills.instrument")}
                      </option>
                      <option value="music">{t("skills.music")}</option>
                      <option value="other">{t("skills.other")}</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("skills.level")}
                    </span>
                    <select
                      value={filters.level}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          level: e.target.value as Technology["level"] | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("skills.all")}</option>
                      <option value="beginner">{t("skills.beginner")}</option>
                      <option value="intermediate">
                        {t("skills.intermediate")}
                      </option>
                      <option value="advanced">{t("skills.advanced")}</option>
                      <option value="expert">{t("skills.expert")}</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("skills.experience")}
                    </span>
                    <select
                      value={filters.experience}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          experience: e.target.value as
                            | "all"
                            | "1-2"
                            | "3-4"
                            | "5+",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("skills.all")}</option>
                      <option value="1-2">1-2 {t("skills.years")}</option>
                      <option value="3-4">3-4 {t("skills.years")}</option>
                      <option value="5+">5+ {t("skills.years")}</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Progreso
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTechnologies.map((tech) => (
                <tr
                  key={tech.id}
                  className="tech-card hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {tech.badge_url ? (
                        // Mostrar badge si existe badge_url
                        <img
                          src={tech.badge_url}
                          alt={getTranslatedText(
                            tech.name_translations || tech.name
                          )}
                          className="h-6 object-contain"
                          onError={(e) => {
                            // Fallback a texto si el badge falla
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget
                              .nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "inline";
                          }}
                        />
                      ) : null}
                      {/* Fallback: mostrar texto si no hay badge o si el badge falla */}
                      <span
                        className={`font-semibold text-gray-900 ${
                          tech.badge_url ? "hidden" : ""
                        }`}
                        style={{ display: tech.badge_url ? "none" : "inline" }}
                      >
                        {getTranslatedText(tech.name_translations || tech.name)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getCategoryLabel(tech.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(
                        tech.level
                      )}`}
                    >
                      {getLevelLabel(tech.level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tech.yearsOfExperience ? (
                      <span className="text-sm text-gray-600">
                        {tech.yearsOfExperience} {t("skills.years")}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          tech.level === "expert"
                            ? "bg-green-500"
                            : tech.level === "advanced"
                            ? "bg-purple"
                            : tech.level === "intermediate"
                            ? "bg-blue"
                            : "bg-gray-400"
                        }`}
                        style={{ width: getProgressWidth(tech.level) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedTechnologies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              {t("skills.noTechnologies")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillsNTechnologies;
