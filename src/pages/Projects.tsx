import { useState, useEffect, useRef } from "react";
import { getThumbnailFromUrl } from "../utils/getThumbnail";
import Pagination from "../components/ui/Pagination";
import Button from "../components/ui/Button";
import { getProjects } from "../lib/supabase-functions";

interface Project {
  id: string;
  title: string;
  url: string;
  repository?: string;
  month: string;
  year: number;
  thumbnail?: string;
  is_special?: boolean;
}

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const projectsData = await getProjects();

        // Generar thumbnails para cada proyecto
        const projectsWithThumbnails = await Promise.all(
          (projectsData || []).map(async (project: any) => {
            const thumbnail = project.thumbnail
              ? project.thumbnail
              : await getThumbnailFromUrl(project.url);
            return {
              ...project,
              thumbnail,
              isSpecial: project.is_special || false,
            };
          })
        );

        // Separar proyectos especiales y ordenar
        // Los especiales van primero, luego los demás (ordenados del más nuevo al más antiguo)
        const specialProjects = projectsWithThumbnails.filter(
          (p) => p.isSpecial
        );
        const regularProjects = projectsWithThumbnails.filter(
          (p) => !p.isSpecial
        );

        // Combinar: especiales primero, luego regulares
        const sortedProjects = [...specialProjects, ...regularProjects];

        setProjects(sortedProjects);
      } catch (error) {
        console.error("Error al cargar proyectos:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  // Calcular páginas
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProjects = projects.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando proyectos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Proyectos
        </h1>

        {/* Grid estilo Pinterest */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              No hay proyectos disponibles
            </p>
            <p className="text-gray-500">
              Vuelve pronto para ver mis proyectos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {currentProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
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

// Componente de tarjeta de proyecto
function ProjectCard({ project }: { project: Project }) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div
        ref={cardRef}
        className="project-card-container bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200 hover:shadow-xl transition-shadow"
      >
        {/* Contenido del card */}
        <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
          {project.thumbnail ? (
            <img
              src={project.thumbnail}
              alt={project.title}
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
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
              Sin imagen
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <h3 className="text-white font-semibold text-lg mb-1">
              {project.title}
            </h3>
            <p className="text-white/80 text-sm">
              {project.month} {project.year}
            </p>
          </div>
        </div>

        {/* Botones - solo mostrar si existen */}
        <div className="p-4 flex gap-2">
          {project.repository && (
            <a
              href={project.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 cursor-pointer"
            >
              <Button variant="outline" className="w-full cursor-pointer">
                Repositorio
              </Button>
            </a>
          )}
          {project.url && (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className={
                project.repository
                  ? "flex-1 cursor-pointer"
                  : "w-full cursor-pointer"
              }
            >
              <Button variant="secondary" className="w-full cursor-pointer">
                Ver Proyecto
              </Button>
            </a>
          )}
        </div>
      </div>
    </>
  );
}

export default Projects;
