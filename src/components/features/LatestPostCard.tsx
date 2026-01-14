import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "../../lib/i18n";
import { getLatestBlogPost } from "../../lib/supabase-functions";

function LatestPostCard() {
  const { t, language } = useTranslation();
  const [latestPost, setLatestPost] = useState<{
    id: string;
    title: string;
    date: string;
    tags: string[];
    excerpt: string;
    url: string;
    author?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const formatPlatformTag = (platform: string) => {
    if (!platform) return "";
    const parts = platform.replace(/^#/, "").split(".");
    const formatted = parts
      .map((part, idx) =>
        idx === 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : part.toLowerCase()
      )
      .join(".");
    return `#${formatted}`;
  };

  useEffect(() => {
    const loadLatestPost = async () => {
      try {
        setLoading(true);
        const post = await getLatestBlogPost();

        if (post) {
          const locale = language === "es" ? "es-ES" : "en-US";
          // Parsear fecha
          const date = post.published_at
            ? new Date(post.published_at).toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "";

          // Parsear tags: convertir #Medium, #Dev.to, etc.
          const parsedTags = (post.tags || [])
            .map((tag: string) => formatPlatformTag(tag))
            .filter(Boolean);

          // Si no hay tags pero hay platform, crear tag desde platform
          if (parsedTags.length === 0 && post.platform) {
            parsedTags.push(formatPlatformTag(post.platform));
          }

          setLatestPost({
            id: post.id,
            title: post.title,
            date: date,
            tags: parsedTags,
            excerpt: post.excerpt || "",
            url: post.url || "/blog",
            author: post.author,
          });
        }
      } catch (error) {
        console.error("Error al cargar último post:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLatestPost();
  }, [language]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full transition-colors">
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("latestPostCard.title")}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (!latestPost) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full transition-colors">
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t("latestPostCard.title")}
          </span>
        </div>
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
            {language === "es"
              ? "No hay posts de blog disponibles."
              : "No blog posts available."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 h-full transition-colors">
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
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          {t("latestPostCard.title")}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">
        {latestPost.date}
      </p>
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
        {latestPost.title}
      </h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {latestPost.tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400"
          >
            {tag}
          </span>
        ))}
        {latestPost.author && (
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
            #{latestPost.author}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {latestPost.excerpt}
      </p>
      <Link
        to={latestPost.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-purple dark:text-purple-400 hover:text-blue dark:hover:text-blue-400 transition-colors cursor-pointer inline-flex items-center gap-1"
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
