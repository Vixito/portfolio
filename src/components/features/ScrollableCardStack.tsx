import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { useTranslation } from "../../lib/i18n";
import { getHomeProjects } from "../../lib/supabase-functions";

interface Project {
  id: string;
  title: string;
  thumbnail?: string;
  month: string;
  year: number;
  url: string;
}

function ScrollableCardStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t, language } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const data = await getHomeProjects();

        if (!data || data.length === 0) {
          setProjects([]);
          setLoading(false);
          return;
        }

        const formattedProjects: Project[] = data.map((project: any) => {
          // Priorizar month/year del proyecto (viene de home_content.project_data o del proyecto mismo)
          // Solo usar created_at como fallback si no hay month/year
          let month = "";
          let year = new Date().getFullYear();

          if (project.month && project.year) {
            // Prioridad 1: month y year del proyecto (puede venir de project_data o del proyecto)
            month = project.month;
            year = project.year;
          } else if (project.created_at) {
            // Fallback: usar created_at solo si no hay month/year
            const date = new Date(project.created_at);
            const monthNames = [
              t("workExperience.january"),
              t("workExperience.february"),
              t("workExperience.march"),
              t("workExperience.april"),
              t("workExperience.may"),
              t("workExperience.june"),
              t("workExperience.july"),
              t("workExperience.august"),
              t("workExperience.september"),
              t("workExperience.october"),
              t("workExperience.november"),
              t("workExperience.december"),
            ];
            month = monthNames[date.getMonth()] || "";
            year = date.getFullYear();
          }

          return {
            id: project.id,
            title: project.title || "",
            thumbnail: project.thumbnail || project.thumbnail_url || "",
            month,
            year,
            url: project.url || "",
          };
        });

        setProjects(formattedProjects);
      } catch (error) {
        console.error("Error al cargar proyectos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]); // Solo recargar si cambia el idioma

  // Este useEffect debe ejecutarse siempre, incluso si hay returns tempranos
  // para cumplir con las reglas de hooks de React
  useEffect(() => {
    // Solo ejecutar la lógica si hay proyectos y el contenedor existe
    if (!containerRef.current || projects.length === 0) return;

    const cards = containerRef.current.querySelectorAll(".stack-card");

    const updateCards = () => {
      cards.forEach((card, index) => {
        const offset = index - currentIndex;
        const absOffset = Math.abs(offset);
        const isActive = offset === 0;

        gsap.to(card as HTMLElement, {
          rotation: offset * 8,
          x: offset * 20,
          y: offset * 15,
          scale: isActive ? 1 : 1 - absOffset * 0.15,
          zIndex: projects.length - absOffset,
          opacity: absOffset > 2 ? 0 : 1,
          duration: 0.6,
          ease: "power2.out",
        });
      });
    };

    updateCards();

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % projects.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex, projects.length]);

  if (loading) {
    return (
      <div className="relative h-64 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-500">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="relative h-64 flex items-center justify-center">
        <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
          {language === "es"
            ? "No hay proyectos configurados."
            : "No projects configured."}
        </p>
      </div>
    );
  }

  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div ref={containerRef} className="relative h-64 perspective-1000">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="stack-card absolute inset-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl cursor-pointer transform-gpu border-2 border-gray-200 dark:border-gray-700 overflow-hidden transition-colors"
          onClick={() => handleCardClick(index)}
          style={{
            transform: `rotate(${(index - currentIndex) * 8}deg) translate(${
              (index - currentIndex) * 20
            }px, ${(index - currentIndex) * 15}px) scale(${
              index === currentIndex
                ? 1
                : 1 - Math.abs(index - currentIndex) * 0.15
            })`,
            zIndex: projects.length - Math.abs(index - currentIndex),
          }}
        >
          <div className="w-full h-full relative">
            {project.thumbnail ? (
              <img
                src={project.thumbnail}
                alt={project.title}
                className="w-full h-full object-cover"
                onClick={() => window.open(project.url, "_blank")}
                style={{ cursor: "pointer" }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {project.title}
                </span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
              <h3 className="text-white font-semibold text-sm mb-1">
                {project.title}
              </h3>
              <p className="text-white/80 text-xs">
                {project.month} {project.year}
              </p>
            </div>
          </div>
        </div>
      ))}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .stack-card {
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }
        .stack-card:hover {
          transform: scale(1.05) !important;
        }
      `}</style>
    </div>
  );
}

export default ScrollableCardStack;
