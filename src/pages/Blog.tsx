import { useState, useEffect } from "react";
import Pagination from "../components/ui/Pagination";
import { fetchBlogPosts } from "../lib/supabase-functions";
import { useTranslation } from "../lib/i18n";

interface BlogPost {
  id: string;
  title: string;
  thumbnail: string; // URL desde S3/CloudFront o del blog externo
  excerpt: string; // Contenido incompleto para "enganche"
  url: string; // Link al blog externo
  platform: string; // "Medium", "Dev.to", etc.
  date: string;
  author?: string;
  title_translations?: { es?: string; en?: string };
  excerpt_translations?: { es?: string; en?: string };
}

function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const { t, language } = useTranslation();

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const result = await fetchBlogPosts();

        if (result && result.posts) {
          // Mapear posts de la BD al formato esperado
          const mappedPosts = result.posts.map((post: any) => {
            // Obtener título y excerpt según el idioma actual
            const titleTranslations = post.title_translations || {};
            const excerptTranslations = post.excerpt_translations || {};
            
            const title = titleTranslations[language] || post.title || "";
            const excerpt = excerptTranslations[language] || post.excerpt || "";

            return {
              id: post.id,
              title,
              thumbnail:
                post.thumbnail_url ||
                "https://via.placeholder.com/400x300?text=No+Image",
              excerpt,
              url: post.url,
              platform: post.platform,
              date: post.published_at,
              author: post.author,
              title_translations: titleTranslations,
              excerpt_translations: excerptTranslations,
            };
          });
          setPosts(mappedPosts);
        } else {
          setPosts([]);
        }
      } catch (error) {
        console.error("Error al cargar posts:", error);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [language]); // Recargar cuando cambie el idioma

  // Calcular páginas
  const totalPages = Math.ceil(posts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentPosts = posts.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("blog.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          {t("blog.title")}
        </h1>

        {/* Lista vertical de posts */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">{t("blog.noPosts")}</p>
            <p className="text-gray-500">{t("blog.noPostsDescription")}</p>
          </div>
        ) : (
          <div className="space-y-8 mb-12">
            {currentPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-200"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Miniatura */}
                  <div className="md:w-1/3 h-48 md:h-auto bg-gray-100 relative overflow-hidden">
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.errorHandled) {
                          target.dataset.errorHandled = "true";
                          target.src =
                            "https://via.placeholder.com/400x300?text=No+Image";
                          target.classList.add("opacity-50");
                        }
                      }}
                    />
                  </div>

                  {/* Contenido */}
                  <div className="md:w-2/3 p-6 flex flex-col justify-between">
                    <div>
                      {/* Plataforma, autor y fecha */}
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="text-xs font-medium text-purple bg-purple/10 px-2 py-1 rounded">
                          {post.platform}
                        </span>
                        {post.author && (
                          <span className="text-xs text-gray-600 font-medium">
                            {post.author}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(post.date).toLocaleDateString(
                            language === "es" ? "es-ES" : "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>

                      {/* Título */}
                      <h2 className="text-2xl font-bold text-gray-900 mb-3 hover:text-purple transition-colors">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {post.title}
                        </a>
                      </h2>

                      {/* Excerpt (contenido incompleto) */}
                      <p className="text-gray-600 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>

                    {/* Link para leer más */}
                    <div className="mt-4">
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple font-semibold hover:text-blue transition-colors inline-flex items-center gap-2"
                      >
                        {t("blog.readMore")}
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
                      </a>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Blog;
