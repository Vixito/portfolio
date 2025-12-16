import { useState, useEffect, useRef } from "react";
import { getThumbnailFromUrl } from "../utils/getThumbnail";
import Pagination from "../components/ui/Pagination";
import Button from "../components/ui/Button";

interface Project {
  id: string;
  title: string;
  url: string;
  repository?: string;
  month: string;
  year: number;
  thumbnail?: string;
  isSpecial?: boolean; // Para proyectos con animación especial
}

function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    // Datos de ejemplo - reemplaza con tus datos reales
    const mockProjects: Project[] = [
      {
        id: "1",
        title: "Vixito - Discord Bot",
        url: "https://vixito.gg",
        repository: "https://github.com/Vixito/vixito-bot",
        month: "Diciembre",
        year: 2025,
        isSpecial: true,
      },
      {
        id: "2",
        title: "Filippo Cucine",
        url: "https://filippocucine.com",
        repository: "https://github.com/Vixito/filippo-cucine-sas-ecommerce",
        month: "Diciembre",
        year: 2025,
      },
      // Agrega más proyectos aquí
    ];

    // Generar thumbnails para cada proyecto
    const loadThumbnails = async () => {
      const projectsWithThumbnails = await Promise.all(
        mockProjects.map(async (project) => {
          const thumbnail = await getThumbnailFromUrl(project.url);
          return { ...project, thumbnail };
        })
      );

      setProjects(projectsWithThumbnails);
      setLoading(false);
    };

    loadThumbnails();
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {currentProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {/* Paginación (centrada arriba y abajo) */}
        {totalPages > 1 && (
          <>
            <div className="flex justify-center mb-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
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
              Cargando...
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
              <Button variant="primary" className="w-full cursor-pointer">
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
