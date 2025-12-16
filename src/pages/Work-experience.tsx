import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Button from "../components/ui/Button";

interface WorkExperience {
  id: string;
  position: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string; // URL desde S3/CloudFront
  location: string;
  startDate: string;
  endDate?: string; // Opcional si es trabajo actual
  description: string;
  responsibilities: string[];
  technologies: string[];
  type: "full-time" | "part-time" | "contract" | "freelance";
  status: "current" | "past";
}

function WorkExperience() {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExperience, setSelectedExperience] =
    useState<WorkExperience | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mockExperiences: WorkExperience[] = [
      {
        id: "1",
        position: "Senior Backend Developer",
        company: "Tech Company Example",
        companyUrl: "https://example.com",
        companyLogo: "https://tu-cdn.cloudfront.net/work/company-1.png",
        location: "Bogotá, Colombia",
        startDate: "2023-01",
        status: "current",
        type: "full-time",
        description:
          "Lidero el desarrollo de APIs escalables y arquitecturas de microservicios. Trabajo con equipos multidisciplinarios para entregar soluciones de alta calidad.",
        responsibilities: [
          "Diseño e implementación de APIs REST y GraphQL",
          "Arquitectura de microservicios con Docker y Kubernetes",
          "Optimización de bases de datos y consultas SQL",
          "Mentoría a desarrolladores junior",
        ],
        technologies: [
          "TypeScript",
          "Node.js",
          "PostgreSQL",
          "Redis",
          "Docker",
          "Kubernetes",
        ],
      },
      {
        id: "2",
        position: "Backend Developer",
        company: "Startup Example",
        companyUrl: "https://startup.example.com",
        companyLogo: "https://tu-cdn.cloudfront.net/work/company-2.png",
        location: "Remoto",
        startDate: "2021-06",
        endDate: "2022-12",
        status: "past",
        type: "full-time",
        description:
          "Desarrollé y mantuve servicios backend para una plataforma SaaS. Implementé funcionalidades críticas y mejoré el rendimiento del sistema.",
        responsibilities: [
          "Desarrollo de endpoints REST",
          "Integración con servicios de terceros",
          "Implementación de autenticación y autorización",
          "Testing y debugging",
        ],
        technologies: ["JavaScript", "Express", "MongoDB", "AWS", "Jest"],
      },
    ];

    setTimeout(() => {
      setExperiences(mockExperiences);
      setLoading(false);
    }, 500);
  }, []);

  // Animación de entrada
  useEffect(() => {
    if (!containerRef.current || loading) return;

    const cards = containerRef.current.querySelectorAll(".experience-card");
    gsap.fromTo(
      cards,
      {
        opacity: 0,
        x: -30,
      },
      {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
      }
    );
  }, [loading]);

  const getTypeLabel = (type: WorkExperience["type"]) => {
    const labels = {
      "full-time": "Tiempo Completo",
      "part-time": "Medio Tiempo",
      contract: "Contrato",
      freelance: "Freelance",
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando experiencia...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Experiencia Laboral
        </h1>

        <div ref={containerRef} className="space-y-8">
          {experiences.map((experience) => (
            <div
              key={experience.id}
              className="experience-card bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Logo de la empresa */}
                  <div className="flex-shrink-0">
                    {experience.companyLogo ? (
                      <img
                        src={experience.companyLogo}
                        alt={experience.company}
                        className="w-24 h-24 object-contain rounded-lg border border-gray-200 p-3 bg-gray-50"
                        onError={(e) => {
                          e.currentTarget.src =
                            "https://tu-cdn.cloudfront.net/default-logo.png";
                        }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-purple flex items-center justify-center text-white text-3xl font-bold">
                        {experience.company.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {experience.position}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {experience.companyUrl ? (
                            <a
                              href={experience.companyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg text-purple hover:text-blue transition-colors font-semibold"
                            >
                              {experience.company}
                            </a>
                          ) : (
                            <p className="text-lg text-gray-600">
                              {experience.company}
                            </p>
                          )}
                          {experience.status === "current" && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Actual
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
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
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            <span>{experience.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
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
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {new Date(
                                experience.startDate
                              ).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "long",
                              })}
                              {" - "}
                              {experience.endDate
                                ? new Date(
                                    experience.endDate
                                  ).toLocaleDateString("es-ES", {
                                    year: "numeric",
                                    month: "long",
                                  })
                                : "Presente"}
                            </span>
                          </div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {getTypeLabel(experience.type)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {experience.description}
                    </p>

                    {/* Responsabilidades */}
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        Responsabilidades:
                      </h3>
                      <ul className="list-disc list-inside space-y-1 text-gray-600 text-sm">
                        {experience.responsibilities.map((resp, index) => (
                          <li key={index}>{resp}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Tecnologías */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">
                        Tecnologías:
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {experience.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 rounded-full text-xs font-medium bg-purple/10 text-purple border border-purple/20"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WorkExperience;
