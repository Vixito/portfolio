import { useState, useEffect } from "react";
import { gsap } from "gsap";
import { useRef } from "react";
import { getStudies } from "../lib/supabase-functions";
import { useTranslation } from "../lib/i18n";

interface Study {
  id: string;
  title: string;
  institution: string;
  type: "degree" | "certification" | "course";
  startDate: string;
  endDate?: string; // Opcional si está en curso
  description: string;
  logo?: string; // URL desde S3/CloudFront
  certificateUrl?: string; // Link al certificado
  status: "completed" | "in-progress";
}

function Studies() {
  const { t } = useTranslation();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    title: "",
    institution: "",
    type: "all" as Study["type"] | "all",
    status: "all" as Study["status"] | "all",
    hasCertificate: "all" as "all" | "yes" | "no",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStudies = async () => {
      try {
        setLoading(true);
        const data = await getStudies();
        // Mapear datos de Supabase al formato de la interfaz
        const mappedStudies: Study[] = (data || []).map((study: any) => ({
          id: study.id,
          title: study.title,
          institution: study.institution,
          type: study.type,
          startDate: study.start_date,
          endDate: study.end_date,
          description: study.description,
          logo: study.logo,
          certificateUrl: study.certificate_url,
          status: study.status,
        }));
        setStudies(mappedStudies);
      } catch (error) {
        console.error("Error al cargar estudios:", error);
        setStudies([]);
      } finally {
        setLoading(false);
      }
    };

    loadStudies();
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!containerRef.current || loading) return;

    const rows = containerRef.current.querySelectorAll(".study-card");
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

  // Filtrar estudios según todos los filtros
  const filteredStudies = studies.filter((study) => {
    // Filtro por título
    if (
      filters.title &&
      !study.title.toLowerCase().includes(filters.title.toLowerCase())
    ) {
      return false;
    }

    // Filtro por institución
    if (
      filters.institution &&
      !study.institution
        .toLowerCase()
        .includes(filters.institution.toLowerCase())
    ) {
      return false;
    }

    // Filtro por tipo
    if (filters.type !== "all" && study.type !== filters.type) {
      return false;
    }

    // Filtro por estado
    if (filters.status !== "all" && study.status !== filters.status) {
      return false;
    }

    // Filtro por certificado
    if (filters.hasCertificate !== "all") {
      if (filters.hasCertificate === "yes" && !study.certificateUrl) {
        return false;
      }
      if (filters.hasCertificate === "no" && study.certificateUrl) {
        return false;
      }
    }

    return true;
  });

  const getTypeLabel = (type: Study["type"]) => {
    const labels = {
      degree: t("studies.degree"),
      certification: t("studies.certification"),
      course: t("studies.course"),
    };
    return labels[type];
  };

  const getTypeColor = (type: Study["type"]) => {
    const colors = {
      degree: "bg-purple",
      certification: "bg-blue",
      course: "bg-green-500",
    };
    return colors[type];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("studies.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-[95vw] mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          {t("studies.title")}
        </h1>

        {/* Tabla de estudios */}
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full min-w-[1400px] bg-white rounded-lg shadow-md border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                      {t("studies.title")}
                    </span>
                    <input
                      type="text"
                      placeholder={t("studies.titlePlaceholder")}
                      value={filters.title}
                      onChange={(e) =>
                        setFilters({ ...filters, title: e.target.value })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("studies.institution")}
                    </span>
                    <input
                      type="text"
                      placeholder={t("studies.institutionPlaceholder")}
                      value={filters.institution}
                      onChange={(e) =>
                        setFilters({ ...filters, institution: e.target.value })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                      {t("studies.type")}
                    </span>
                    <select
                      value={filters.type}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          type: e.target.value as Study["type"] | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("studies.all")}</option>
                      <option value="degree">{t("studies.degree")}</option>
                      <option value="certification">
                        {t("studies.certification")}
                      </option>
                      <option value="course">{t("studies.course")}</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("studies.status")}
                    </span>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          status: e.target.value as Study["status"] | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("studies.all")}</option>
                      <option value="completed">
                        {t("studies.completed")}
                      </option>
                      <option value="in-progress">
                        {t("studies.inProgress")}
                      </option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
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
                    <span className="text-sm font-semibold text-gray-900">
                      {t("studies.period")}
                    </span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      {t("studies.hasCertificate")}
                    </span>
                    <select
                      value={filters.hasCertificate}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          hasCertificate: e.target.value as
                            | "all"
                            | "yes"
                            | "no",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">{t("studies.all")}</option>
                      <option value="yes">{t("studies.yes")}</option>
                      <option value="no">{t("studies.no")}</option>
                    </select>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudies.map((study) => (
                <tr
                  key={study.id}
                  className="study-card hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {study.logo ? (
                        <img
                          src={study.logo}
                          alt={study.institution}
                          className="w-10 h-10 object-contain rounded-lg border border-gray-200 p-1"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-lg ${getTypeColor(
                            study.type
                          )} flex items-center justify-center text-white text-sm font-bold`}
                        >
                          {study.institution.charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-gray-900">
                        {study.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {study.institution}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        study.type === "degree"
                          ? "bg-purple/10 text-purple"
                          : study.type === "certification"
                          ? "bg-blue/10 text-blue"
                          : "bg-green-500/10 text-green-700"
                      }`}
                    >
                      {getTypeLabel(study.type)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        study.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {study.status === "completed"
                        ? t("studies.completed")
                        : t("studies.inProgress")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      <div>
                        {new Date(study.startDate).toLocaleDateString(
                          t("language") === "es" ? "es-ES" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                          }
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        {study.endDate
                          ? new Date(study.endDate).toLocaleDateString(
                              t("language") === "es" ? "es-ES" : "en-US",
                              {
                                year: "numeric",
                                month: "short",
                              }
                            )
                          : t("studies.present")}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 min-w-[180px]">
                    {study.certificateUrl ? (
                      <a
                        href={study.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-purple hover:text-blue transition-colors cursor-pointer whitespace-nowrap"
                      >
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                        {t("studies.viewCertificate")}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredStudies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">{t("studies.noStudies")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Studies;
