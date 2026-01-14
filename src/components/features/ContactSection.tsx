import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";

function ContactSection() {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("contactSection.title")}
        </h2>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
        {t("contactSection.description")}
      </p>
      <div className="flex flex-row gap-3">
        <Link
          to="/status"
          className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-medium transition-colors cursor-pointer text-center text-sm"
        >
          {t("contactSection.sendRequest")}
        </Link>
        <Link
          to="/socials"
          className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-900 dark:text-gray-100 font-medium transition-colors cursor-pointer text-center text-sm"
        >
          {t("contactSection.contact")}
        </Link>
      </div>
    </div>
  );
}

export default ContactSection;
