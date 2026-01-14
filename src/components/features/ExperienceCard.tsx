import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation, getTranslatedText } from "../../lib/i18n";
import {
  getHomeWorkExperiences,
  getCVDownloadUrl,
} from "../../lib/supabase-functions";

interface Experience {
  company: string;
  company_translations?: { es?: string; en?: string } | null;
  role: string;
  position?: string;
  position_translations?: { es?: string; en?: string } | null;
  period: string;
  startDate?: string;
  endDate?: string;
  logo: string;
  companyLogo?: string;
  color: string;
}

function ExperienceCard() {
  const { t, language } = useTranslation();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [cvText, setCvText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [exps, cv] = await Promise.all([
          getHomeWorkExperiences(),
          getCVDownloadUrl(),
        ]);

        // Formatear experiencias
        const formattedExperiences: Experience[] = (exps || []).map(
          (exp: any) => {
            const company = getTranslatedText(
              exp.company_translations || exp.company
            );
            const role = getTranslatedText(
              exp.position_translations || exp.position || ""
            );

            // Formatear período
            const startDate = exp.start_date
              ? new Date(exp.start_date).toLocaleDateString(
                  language === "es" ? "es-ES" : "en-US",
                  { month: "long", year: "numeric" }
                )
              : "";
            const endDate = exp.end_date
              ? new Date(exp.end_date).toLocaleDateString(
                  language === "es" ? "es-ES" : "en-US",
                  { month: "long", year: "numeric" }
                )
              : exp.status === "current"
              ? t("workExperience.present")
              : "";

            const period = endDate
              ? `${startDate} - ${endDate}`
              : startDate || "";

            return {
              company,
              role,
              period,
              logo: exp.company_logo || exp.companyLogo || "",
              color: "bg-white",
            };
          }
        );

        setExperiences(formattedExperiences);
        if (cv) {
          setCvUrl(cv.url);
          setCvText(cv.text);
        }
      } catch (error) {
        console.error("Error al cargar experiencias:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // Solo recargar si cambia el idioma

  const handleCVClick = (e: React.MouseEvent) => {
    if (!cvUrl) {
      e.preventDefault();
      alert(
        language === "es"
          ? "No hay CV disponible para descargar."
          : "No CV available for download."
      );
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full flex flex-col transition-colors">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-white/80 dark:bg-gray-700/80 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-600 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("workExperience.title")}
        </h2>
      </div>
      {experiences.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
            {language === "es"
              ? "No hay experiencias laborales configuradas."
              : "No work experiences configured."}
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-4 mb-6">
          {experiences.map((exp, index) => (
            <div key={index} className="flex items-start gap-3">
              <div
                className={`w-10 h-10 ${exp.color} rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden`}
              >
                {exp.logo.startsWith("http") || exp.logo.startsWith("/") ? (
                  <img
                    src={exp.logo}
                    alt={`${exp.company} logo`}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      // Si la imagen falla, mostrar el texto como fallback
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        // Usar textContent en lugar de innerHTML para prevenir XSS
                        const span = document.createElement("span");
                        span.className = "text-white font-bold text-xs";
                        span.textContent = exp.company.charAt(0);
                        parent.innerHTML = "";
                        parent.appendChild(span);
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-bold text-xs">
                    {exp.logo}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {exp.company}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {exp.role}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {exp.period}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      {cvUrl ? (
        <a
          href={cvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-medium transition-colors cursor-pointer text-center text-sm flex items-center justify-center gap-2"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {cvText || t("workExperience.downloadCV")}
        </a>
      ) : (
        <button
          onClick={handleCVClick}
          className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-medium transition-colors cursor-pointer text-center text-sm flex items-center justify-center gap-2"
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
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {t("workExperience.downloadCV")}
        </button>
      )}
    </div>
  );
}

export default ExperienceCard;
