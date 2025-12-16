import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Pagination from "../components/ui/Pagination";

interface Client {
  id: string;
  name: string;
  logo: string; // URL desde S3/CloudFront
  description: string;
  url: string;
}

interface Testimonial {
  id: string;
  clientName: string;
  clientLogo: string;
  content: string;
  author: string;
  role: string;
}

function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Datos de ejemplo - reemplaza con tus datos reales
    const mockClients: Client[] = [
      {
        id: "1",
        name: "Airtm",
        logo: "https://img.logo.dev/airtm.com?token=pk_Au6BgsgUQ5SltADJUPu63g&retina=true",
        description:
          "Empresa líder en tecnología financiera que confió en mis servicios.",
        url: "https://app.airtm.com/ivt/vixis",
      },
      {
        id: "2",
        name: "Filippo Cucine",
        logo: "https://tu-cdn.cloudfront.net/clients/logo-2.png",
        description:
          "Startup innovadora con la que trabajamos en proyectos escalables.",
        url: "https://filippocucine.com",
      },
      // Agrega más clientes aquí
    ];

    const mockTestimonials: Testimonial[] = [
      {
        id: "1",
        clientName: "Cliente Ejemplo 1",
        clientLogo: "https://tu-cdn.cloudfront.net/clients/logo-1.png",
        content:
          "Excelente trabajo y profesionalismo. El equipo entregó exactamente lo que necesitábamos y más.",
        author: "Juan Pérez",
        role: "CEO, Cliente Ejemplo 1",
      },
      {
        id: "2",
        clientName: "Cliente Ejemplo 2",
        clientLogo: "https://tu-cdn.cloudfront.net/clients/logo-2.png",
        content:
          "Muy satisfechos con el resultado. La comunicación fue excelente durante todo el proyecto.",
        author: "María García",
        role: "CTO, Cliente Ejemplo 2",
      },
      // Agrega más testimonios aquí
    ];

    setTimeout(() => {
      setClients(mockClients);
      setTestimonials(mockTestimonials);
      setLoading(false);
    }, 500);
  }, []);

  // Animación del carrousel - continuo sin parpadeo
  useEffect(() => {
    if (!carouselRef.current || clients.length === 0) return;

    const container = carouselRef.current;
    const logos = container.querySelectorAll(".carousel-logo");
    const totalWidth = container.scrollWidth / 2; // Porque duplicamos los logos

    // Animación continua
    gsap.to(logos, {
      x: -totalWidth,
      duration: 20,
      repeat: -1,
      ease: "none",
    });
  }, [clients]);

  // Calcular páginas
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClients = clients.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando clientes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Clientes
        </h1>

        {/* Carrousel de logos */}
        <div className="mb-16 overflow-hidden">
          <div className="relative">
            <div
              ref={carouselRef}
              className="flex gap-8 items-center"
              style={{ width: "200%" }}
            >
              {/* Duplicar logos para efecto infinito */}
              {[...clients, ...clients].map((client, index) => (
                <div
                  key={`${client.id}-${index}`}
                  className="carousel-logo flex-shrink-0 w-32 h-32 flex items-center justify-center p-4"
                >
                  <img
                    src={client.logo}
                    alt={client.name}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.errorHandled) {
                        target.dataset.errorHandled = "true";
                        target.src =
                          "https://via.placeholder.com/128x128?text=No+Logo";
                        target.classList.add("opacity-50");
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de clientes (estilo lista sin bordes) */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Nuestros Clientes
          </h2>
          <div className="space-y-4">
            {currentClients.map((client) => (
              <a
                key={client.id}
                href={client.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border-l-4 border-purple hover:border-blue"
              >
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <img
                      src={client.logo}
                      alt={client.name}
                      className="w-16 h-16 object-contain"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.errorHandled) {
                          target.dataset.errorHandled = "true";
                          target.src =
                            "https://via.placeholder.com/64x64?text=No+Logo";
                          target.classList.add("opacity-50");
                        }
                      }}
                    />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      {client.name}
                    </h3>
                    <p className="text-gray-600">{client.description}</p>
                  </div>

                  {/* Icono de enlace */}
                  <div className="flex-shrink-0 text-gray-400">
                    <svg
                      className="w-5 h-5"
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
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* Testimonios estilo Pinterest */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Testimonios</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border border-gray-200"
              >
                {/* Logo del cliente */}
                <div className="mb-4">
                  <img
                    src={testimonial.clientLogo}
                    alt={testimonial.clientName}
                    className="w-12 h-12 object-contain"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.dataset.errorHandled) {
                        target.dataset.errorHandled = "true";
                        target.src =
                          "https://via.placeholder.com/48x48?text=No+Logo";
                        target.classList.add("opacity-50");
                      }
                    }}
                  />
                </div>

                {/* Contenido del testimonio */}
                <p className="text-gray-700 mb-4 italic leading-relaxed">
                  "{testimonial.content}"
                </p>

                {/* Autor */}
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-semibold text-gray-900">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Clients;
