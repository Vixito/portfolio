import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";

function ExperienceCard() {
  const { t } = useTranslation();
  const experiences = [
    {
      company: "Alcaldía Municipal de Pacho",
      role: t("workExperience.assistant"),
      period: `${t("workExperience.march")} 2021 - ${t(
        "workExperience.september"
      )} 2021`,
      logo: "https://cdn.vixis.dev/Alcald%C3%ADa+Municipal+de+Pacho.webp",
      color: "bg-white",
    },
    {
      company: "Airtm",
      role: t("workExperience.discordMarketer"),
      period: `${t("workExperience.april")} 2025 - ${t(
        "workExperience.october"
      )} 2025`,
      logo: "https://cdn.vixis.dev/AirTM+Logo.webp",
      color: "bg-white",
    },
    {
      company: "Filippo Cucine",
      role: t("workExperience.fullStackDeveloper"),
      period: `${t("workExperience.january")} 2026 - ${t(
        "workExperience.present"
      )}`,
      logo: "https://cdn.vixis.dev/Filippo+Cucine+-+Logo.webp",
      color: "bg-black",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-600"
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
        <h2 className="text-lg font-semibold text-gray-900">
          {t("workExperience.title")}
        </h2>
      </div>
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
                      parent.innerHTML = `<span class="text-white font-bold text-xs">${exp.company.charAt(
                        0
                      )}</span>`;
                    }
                  }}
                />
              ) : (
                <span className="text-white font-bold text-xs">{exp.logo}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {exp.company}
              </h3>
              <p className="text-xs text-gray-600">{exp.role}</p>
              <p className="text-xs text-gray-500">{exp.period}</p>
            </div>
          </div>
        ))}
      </div>
      <Link
        to="/workxp"
        className="w-full px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium transition-colors cursor-pointer text-center text-sm flex items-center justify-center gap-2"
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
      </Link>
    </div>
  );
}

export default ExperienceCard;
