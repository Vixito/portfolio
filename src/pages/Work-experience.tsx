import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Button from "../components/ui/Button";
import { getWorkExperiences } from "../lib/supabase-functions";
import { useTranslation, getTranslatedText } from "../lib/i18n";
import { useLanguageStore } from "../stores/useLanguageStore";

interface WorkExperience {
  id: string;
  position: string;
  position_translations?: { es?: string; en?: string } | null;
  company: string;
  company_translations?: { es?: string; en?: string } | null;
  companyUrl?: string;
  companyLogo?: string; // URL desde S3/CloudFront
  location: string;
  location_translations?: { es?: string; en?: string } | null;
  startDate: string;
  endDate?: string; // Opcional si es trabajo actual
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  responsibilities: string[];
  technologies: string[];
  type: "full-time" | "part-time" | "contract" | "freelance";
  status: "current" | "past";
}

function WorkExperience() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] =
    useState<WorkExperience | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadExperiences = async () => {
      try {
        setLoading(true);
        const data = await getWorkExperiences();
        // Mapear datos de Supabase al formato de la interfaz, preservando campos de traducción
        const mappedExperiences: WorkExperience[] = (data || []).map(
          (exp: any) => {
            // Parsear responsabilidades si vienen como string JSON
            let responsibilities: string[] = [];
            if (exp.responsibilities) {
              if (Array.isArray(exp.responsibilities)) {
                responsibilities = exp.responsibilities;
              } else if (typeof exp.responsibilities === "string") {
                const trimmed = exp.responsibilities.trim();
                if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                  // Es un JSON array
                  try {
                    const parsed = JSON.parse(trimmed);
                    responsibilities = Array.isArray(parsed) ? parsed : [];
                  } catch (e) {
                    console.warn("Error parsing responsibilities JSON:", e);
                    responsibilities = [];
                  }
                } else {
                  // Intentar como array separado por comas o líneas
                  responsibilities = trimmed
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
                }
              }
            }

            // Parsear tecnologías si vienen como string JSON
            let technologies: string[] = [];
            if (exp.technologies) {
              if (Array.isArray(exp.technologies)) {
                technologies = exp.technologies;
              } else if (typeof exp.technologies === "string") {
                try {
                  const parsed = JSON.parse(exp.technologies);
                  technologies = Array.isArray(parsed) ? parsed : [];
                } catch (e) {
                  technologies = exp.technologies
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
                }
              }
            }

            return {
              id: exp.id,
              position: exp.position,
              position_translations: exp.position_translations,
              company: exp.company,
              company_translations: exp.company_translations,
              companyUrl: exp.company_url,
              companyLogo: exp.company_logo,
              location: exp.location,
              location_translations: exp.location_translations,
              startDate: exp.start_date,
              endDate: exp.end_date,
              description: exp.description,
              description_translations: exp.description_translations,
              responsibilities,
              technologies,
              type: exp.type,
              status: exp.status,
            };
          }
        );
        setExperiences(mappedExperiences);
      } catch (error) {
        console.error("Error al cargar experiencias:", error);
        setExperiences([]);
      } finally {
        setLoading(false);
      }
    };

    loadExperiences();
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!containerRef.current || loading) return;

    const cards = containerRef.current.querySelectorAll(".experience-card");
    gsap.fromTo(
      cards,
      {
        opacity: 0,
        x: -30,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
      }
    );
  }, [loading]);

  const getTypeLabel = (type: WorkExperience["type"]) => {
    const labels = {
      "full-time": t("workExperience.fullTime"),
      "part-time": t("workExperience.partTime"),
      contract: t("workExperience.contract"),
      freelance: t("workExperience.freelance"),
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("workExperience.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          {t("workExperience.title")}
        </h1>

        {experiences.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              {t("workExperience.noExperiences")}
            </p>
            <p className="text-gray-500">
              {t("workExperience.noExperiencesDescription")}
            </p>
          </div>
        ) : (
          <div ref={containerRef} className="space-y-8">
            {experiences.map((experience) => (
              <div
                key={experience.id}
                className="experience-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo de la empresa */}
                    <div className="flex-shrink-0 relative">
                      {/* Fallback estático que siempre está presente */}
                      <div className="w-24 h-24 rounded-lg bg-purple flex items-center justify-center text-white text-3xl font-bold absolute inset-0">
                        {getTranslatedText(
                          experience.company_translations || experience.company
                        ).charAt(0)}
                      </div>
                      {/* Imagen que se muestra si carga correctamente */}
                      {experience.companyLogo && (
                        <img
                          src={experience.companyLogo}
                          alt={getTranslatedText(
                            experience.company_translations ||
                              experience.company
                          )}
                          className="w-24 h-24 object-contain rounded-lg border border-gray-200 p-3 bg-gray-50 relative z-10"
                          onError={(e) => {
                            // Si la imagen falla, ocultarla (el fallback ya está visible)
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 mb-1">
                            {getTranslatedText(
                              experience.position_translations ||
                                experience.position
                            )}
                          </h2>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {experience.companyUrl ? (
                              <a
                                href={experience.companyUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg text-purple hover:text-blue transition-colors font-semibold"
                              >
                                {getTranslatedText(
                                  experience.company_translations ||
                                    experience.company
                                )}
                              </a>
                            ) : (
                              <p className="text-lg text-gray-600">
                                {getTranslatedText(
                                  experience.company_translations ||
                                    experience.company
                                )}
                              </p>
                            )}
                            {experience.status === "current" && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {t("workExperience.current")}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>
                                {getTranslatedText(
                                  experience.location_translations ||
                                    experience.location
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <span>
                                {new Date(
                                  experience.startDate
                                ).toLocaleDateString(
                                  language === "es" ? "es-ES" : "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                  }
                                )}
                                {" - "}
                                {experience.endDate
                                  ? new Date(
                                      experience.endDate
                                    ).toLocaleDateString(
                                      language === "es" ? "es-ES" : "en-US",
                                      {
                                        year: "numeric",
                                        month: "long",
                                      }
                                    )
                                  : t("workExperience.present")}
                              </span>
                            </div>
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {getTypeLabel(experience.type)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Descripción - Solo mostrar si hay descripción */}
                      {experience.description &&
                        experience.description.trim() !== "" && (
                          <p className="text-gray-700 mb-4 leading-relaxed">
                            {getTranslatedText(
                              experience.description_translations ||
                                experience.description
                            )}
                          </p>
                        )}

                      {/* Responsabilidades - Solo mostrar si hay responsabilidades */}
                      {experience.responsibilities &&
                        experience.responsibilities.length > 0 &&
                        experience.responsibilities.some(
                          (resp) => resp && resp.trim() !== ""
                        ) && (
                          <div className="mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">
                              {t("workExperience.responsibilities")}:
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                              {experience.responsibilities
                                .filter((resp) => resp && resp.trim() !== "")
                                .map((resp, index) => (
                                  <li key={index}>{resp}</li>
                                ))}
                            </ul>
                          </div>
                        )}

                      {/* Tecnologías - Solo mostrar si hay tecnologías */}
                      {experience.technologies &&
                        experience.technologies.length > 0 &&
                        experience.technologies.some(
                          (tech) => tech && tech.trim() !== ""
                        ) && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-2">
                              {t("workExperience.technologies")}:
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {experience.technologies
                                .filter((tech) => tech && tech.trim() !== "")
                                .map((tech) => (
                                  <span
                                    key={tech}
                                    className="px-3 py-1 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20"
                                  >
                                    {tech}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkExperience;
