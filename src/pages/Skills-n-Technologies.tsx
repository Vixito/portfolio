import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { getTechnologies } from "../lib/supabase-functions";

interface Technology {
  id: string;
  name: string;
  category:
    | "language"
    | "framework"
    | "database"
    | "tool"
    | "cloud"
    | "instrument"
    | "music"
    | "other";
  level: "beginner" | "intermediate" | "advanced" | "expert";
  icon?: string; // URL desde S3/CloudFront o nombre de icono
  yearsOfExperience?: number;
}

function SkillsNTechnologies() {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: "",
    category: "all" as Technology["category"] | "all",
    level: "all" as Technology["level"] | "all",
    experience: "all" as "all" | "1-2" | "3-4" | "5+",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTechnologies = async () => {
      try {
        setLoading(true);
        const data = await getTechnologies();
        // Mapear datos de Supabase al formato de la interfaz
        const mappedTechnologies: Technology[] = (data || []).map(
          (tech: any) => ({
            id: tech.id,
            name: tech.name,
            category: tech.category,
            level: tech.level,
            icon: tech.icon,
            yearsOfExperience: tech.years_of_experience,
          })
        );
        setTechnologies(mappedTechnologies);
      } catch (error) {
        console.error("Error al cargar tecnologías:", error);
        setTechnologies([]);
      } finally {
        setLoading(false);
      }
    };

    loadTechnologies();
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!containerRef.current || loading) return;

    const rows = containerRef.current.querySelectorAll(".tech-card");
    gsap.fromTo(
      rows,
      {
        opacity: 0,
        x: -20,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.4,
        stagger: 0.03,
        ease: "power2.out",
      }
    );
  }, [loading, filters]);

  // Filtrar tecnologías según todos los filtros
  const filteredTechnologies = technologies.filter((tech) => {
    // Filtro por nombre
    if (
      filters.name &&
      !tech.name.toLowerCase().includes(filters.name.toLowerCase())
    ) {
      return false;
    }

    // Filtro por categoría
    if (filters.category !== "all" && tech.category !== filters.category) {
      return false;
    }

    // Filtro por nivel
    if (filters.level !== "all" && tech.level !== filters.level) {
      return false;
    }

    // Filtro por experiencia
    if (filters.experience !== "all") {
      if (!tech.yearsOfExperience) {
        return false; // Si no tiene años de experiencia y se está filtrando, excluir
      }
      const years = tech.yearsOfExperience;
      if (filters.experience === "1-2" && (years < 1 || years > 2)) {
        return false;
      }
      if (filters.experience === "3-4" && (years < 3 || years > 4)) {
        return false;
      }
      if (filters.experience === "5+" && years < 5) {
        return false;
      }
    }

    return true;
  });

  const getCategoryLabel = (category: Technology["category"]) => {
    const labels = {
      language: "Lenguajes",
      framework: "Frameworks",
      database: "Bases de Datos",
      tool: "Herramientas",
      cloud: "Cloud",
      instrument: "Instrumentos",
      music: "Música",
      other: "Otro",
    };
    return labels[category];
  };

  const getLevelColor = (level: Technology["level"]) => {
    const colors = {
      beginner: "bg-gray-200 text-gray-700",
      intermediate: "bg-blue/20 text-blue",
      advanced: "bg-purple/20 text-purple",
      expert: "bg-green-500/20 text-green-700",
    };
    return colors[level];
  };

  const getLevelLabel = (level: Technology["level"]) => {
    const labels = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      expert: "Experto",
    };
    return labels[level];
  };

  const getProgressWidth = (level: Technology["level"]) => {
    const widths = {
      beginner: "25%",
      intermediate: "50%",
      advanced: "75%",
      expert: "100%",
    };
    return widths[level];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando tecnologías...</div>
      </div>
    );
  }

  // Ordenar tecnologías por categoría y luego por nombre
  const sortedTechnologies = [...filteredTechnologies].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Habilidades y Tecnologías
        </h1>

        {/* Tabla de tecnologías */}
        <div ref={containerRef} className="overflow-x-auto">
          <table className="w-full bg-white rounded-lg shadow-md border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Tecnología
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={filters.name}
                      onChange={(e) =>
                        setFilters({ ...filters, name: e.target.value })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple"
                    />
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Categoría
                    </span>
                    <select
                      value={filters.category}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          category: e.target.value as
                            | Technology["category"]
                            | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">Todas</option>
                      <option value="language">Lenguajes</option>
                      <option value="framework">Frameworks</option>
                      <option value="database">Bases de Datos</option>
                      <option value="tool">Herramientas</option>
                      <option value="cloud">Cloud</option>
                      <option value="instrument">Instrumentos</option>
                      <option value="music">Música</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Nivel
                    </span>
                    <select
                      value={filters.level}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          level: e.target.value as Technology["level"] | "all",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">Todos</option>
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzado</option>
                      <option value="expert">Experto</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Experiencia
                    </span>
                    <select
                      value={filters.experience}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          experience: e.target.value as
                            | "all"
                            | "1-2"
                            | "3-4"
                            | "5+",
                        })
                      }
                      className="ml-2 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="all">Todas</option>
                      <option value="1-2">1-2 años</option>
                      <option value="3-4">3-4 años</option>
                      <option value="5+">5+ años</option>
                    </select>
                  </div>
                </th>
                <th className="px-6 py-4 text-left">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="text-sm font-semibold text-gray-900">
                      Progreso
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedTechnologies.map((tech) => (
                <tr
                  key={tech.id}
                  className="tech-card hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {tech.icon && (
                        <img
                          src={tech.icon}
                          alt={tech.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                      <span className="font-semibold text-gray-900">
                        {tech.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getCategoryLabel(tech.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(
                        tech.level
                      )}`}
                    >
                      {getLevelLabel(tech.level)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tech.yearsOfExperience ? (
                      <span className="text-sm text-gray-600">
                        {tech.yearsOfExperience} año
                        {tech.yearsOfExperience > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          tech.level === "expert"
                            ? "bg-green-500"
                            : tech.level === "advanced"
                            ? "bg-purple"
                            : tech.level === "intermediate"
                            ? "bg-blue"
                            : "bg-gray-400"
                        }`}
                        style={{ width: getProgressWidth(tech.level) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedTechnologies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No se encontraron tecnologías con los filtros aplicados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillsNTechnologies;
