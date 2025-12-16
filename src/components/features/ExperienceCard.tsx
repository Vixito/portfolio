import { Link } from "react-router-dom";

function ExperienceCard() {
  const experiences = [
    {
      company: "Cinetic Digital",
      role: "Diseñador Web y Frontend",
      period: "2021 - Presente",
      logo: "C",
      color: "bg-red-500",
    },
    {
      company: "Ádraba",
      role: "Diseñador Gráfico y Desarrollador Web",
      period: "2018 - 2021",
      logo: "a",
      color: "bg-black",
    },
    {
      company: "Tantra",
      role: "Diseñador Gráfico y Maquetador Web",
      period: "2015 - 2019",
      logo: "T",
      color: "bg-gray-600",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg shadow-md p-6 border border-gray-200 h-full flex flex-col">
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
        <h2 className="text-lg font-semibold text-gray-900">Experiencia</h2>
      </div>
      <div className="flex-1 space-y-4 mb-6">
        {experiences.map((exp, index) => (
          <div key={index} className="flex items-start gap-3">
            <div
              className={`w-10 h-10 ${exp.color} rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0`}
            >
              {exp.logo}
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
        Descargar cv
      </Link>
    </div>
  );
}

export default ExperienceCard;
