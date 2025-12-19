import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";

function LatestPostCard() {
  const { t } = useTranslation();
  // Datos del último post - puedes obtenerlos de tu API o estado
  const latestPost = {
    id: "1",
    title:
      "Cómo gestionar múltiples cuentas de Git (GitHub y GitLab) con diferentes llaves SSH y usuarios por carpeta",
    date: "11 de marzo de 2025",
    tags: ["#Desarrollo", "#Git", "#Tutorial"],
    excerpt:
      "En este tutorial aprenderás a gestionar múltiples cuentas de Git (GitHub y GitLab) usando diferentes llaves SSH y configuraciones de usuario por carpeta. Perfecto para quienes trabajan con cuentas personales y de empresa...",
    url: "/blog",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-600">
          {t("latestPostCard.title")}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{latestPost.date}</p>
      <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
        {latestPost.title}
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {latestPost.tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
          >
            {tag}
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
        {latestPost.excerpt}
      </p>
      <Link
        to={latestPost.url}
        className="text-sm text-purple hover:text-blue transition-colors cursor-pointer inline-flex items-center gap-1"
      >
        {t("latestPostCard.readMore")}
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
            d="M9 5l7 7-7 7"
          />
        </svg>
      </Link>
    </div>
  );
}

export default LatestPostCard;
