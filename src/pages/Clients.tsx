import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Pagination from "../components/ui/Pagination";
import { getClients } from "../lib/supabase-functions";
import { useTranslation, getTranslatedText } from "../lib/i18n";

interface Client {
  id: string;
  name: string;
  name_translations?: { es?: string; en?: string } | null;
  logo: string;
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  url: string;
  testimonial_content?: string;
  testimonial_content_translations?: { es?: string; en?: string } | null;
  testimonial_author?: string;
  testimonial_author_translations?: { es?: string; en?: string } | null;
  testimonial_role?: string;
  testimonial_role_translations?: { es?: string; en?: string } | null;
  testimonial_url?: string;
}

interface Testimonial {
  id: string;
  clientName: string;
  clientLogo: string;
  content: string;
  author: string;
  role: string;
  url?: string;
}

function Clients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Constantes para la animación (estilo SmoothUI)
  const ANIMATION_DURATION = 10;
  const STAGGER_DELAY = 0.1;
  const HOVER_SCALE = 1.2;
  const HOVER_ROTATE = 5;
  const SPRING_STIFFNESS = 100;
  const SCROLL_DISTANCE_FACTOR = 93.333;

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const clientsData = await getClients();

        // Mapear datos de Supabase al formato de la interfaz, preservando campos de traducción
        const mappedClients: Client[] = (clientsData || []).map(
          (client: any) => ({
            id: client.id,
            name: client.name,
            name_translations: client.name_translations,
            logo: client.logo,
            description: client.description,
            description_translations: client.description_translations,
            url: client.url,
            testimonial_content: client.testimonial_content,
            testimonial_content_translations:
              client.testimonial_content_translations,
            testimonial_author: client.testimonial_author,
            testimonial_author_translations:
              client.testimonial_author_translations,
            testimonial_role: client.testimonial_role,
            testimonial_role_translations: client.testimonial_role_translations,
            testimonial_url: client.testimonial_url,
          })
        );

        setClients(mappedClients);

        // Extraer testimonios de los clientes que los tengan
        // Filtrar solo aquellos que tienen contenido real después de traducir
        const testimonialsData = mappedClients
          .map((client) => {
            const content = getTranslatedText(
              client.testimonial_content_translations ||
                client.testimonial_content ||
                ""
            );
            // Solo incluir si el contenido traducido no está vacío
            if (!content || content.trim() === "") return null;

            return {
              id: client.id,
              clientName: getTranslatedText(
                client.name_translations || client.name
              ),
              clientLogo: client.logo,
              content: content,
              author: getTranslatedText(
                client.testimonial_author_translations ||
                  client.testimonial_author ||
                  ""
              ),
              role: getTranslatedText(
                client.testimonial_role_translations ||
                  client.testimonial_role ||
                  ""
              ),
              url: client.testimonial_url,
            };
          })
          .filter(
            (testimonial): testimonial is Testimonial => testimonial !== null
          );
        setTestimonials(testimonialsData);
      } catch (error) {
        console.error(t("clients.errorLoadingClients"), error);
        setClients([]);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  // Calcular páginas
  const totalPages = Math.ceil(clients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentClients = clients.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("clients.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-6">
          {t("clients.title")}
        </h1>

        {clients.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              {t("clients.noClients")}
            </p>
            <p className="text-gray-500">{t("clients.noClientsDescription")}</p>
          </div>
        ) : (
          <>
            {/* Carrousel de logos - Logo Cloud Animated style (SmoothUI) */}
            {clients.length > 0 && (
              <div className="mb-16 overflow-hidden">
                <div
                  className="relative overflow-hidden"
                  style={{
                    maskImage:
                      "linear-gradient(to right, hsl(0 0% 0% / 0), hsl(0 0% 0% / 1) 20%, hsl(0 0% 0% / 1) 80%, hsl(0 0% 0% / 0))",
                    WebkitMaskImage:
                      "linear-gradient(to right, hsl(0 0% 0% / 0), hsl(0 0% 0% / 1) 20%, hsl(0 0% 0% / 1) 80%, hsl(0 0% 0% / 0))",
                  }}
                >
                  <motion.div
                    animate={{
                      x: [0, -SCROLL_DISTANCE_FACTOR * clients.length],
                    }}
                    className="flex min-w-full shrink-0 items-center justify-around gap-8"
                    transition={{
                      x: {
                        repeat: Number.POSITIVE_INFINITY,
                        repeatType: "loop",
                        duration: ANIMATION_DURATION,
                        ease: "linear",
                      },
                    }}
                  >
                    {/* First set */}
                    {clients.map((client, index) => (
                      <motion.a
                        animate={{ opacity: 1, scale: 1 }}
                        className="group flex shrink-0 flex-col items-center justify-center p-6 transition-all hover:scale-105 cursor-pointer"
                        href={client.url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        key={`first-${client.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                        transition={{
                          duration: 0.4,
                          delay: index * STAGGER_DELAY,
                        }}
                      >
                        <motion.div
                          className="mb-2 w-24 h-24 md:w-20 md:h-32 flex items-center justify-center"
                          transition={{
                            type: "spring",
                            stiffness: SPRING_STIFFNESS,
                          }}
                          whileHover={{
                            scale: HOVER_SCALE,
                            rotate: HOVER_ROTATE,
                          }}
                        >
                          <img
                            src={client.logo}
                            alt={getTranslatedText(
                              client.name_translations || client.name
                            )}
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
                        </motion.div>
                      </motion.a>
                    ))}
                    {/* Second set for seamless loop */}
                    {clients.map((client, index) => (
                      <motion.a
                        animate={{ opacity: 1, scale: 1 }}
                        className="group flex shrink-0 flex-col items-center justify-center p-6 transition-all hover:scale-105 cursor-pointer"
                        href={client.url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        key={`second-${client.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                        transition={{
                          duration: 0.4,
                          delay: index * STAGGER_DELAY,
                        }}
                      >
                        <motion.div
                          className="mb-2 w-24 h-24 md:w-20 md:h-32 flex items-center justify-center"
                          transition={{
                            type: "spring",
                            stiffness: SPRING_STIFFNESS,
                          }}
                          whileHover={{
                            scale: HOVER_SCALE,
                            rotate: HOVER_ROTATE,
                          }}
                        >
                          <img
                            src={client.logo}
                            alt={getTranslatedText(
                              client.name_translations || client.name
                            )}
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
                        </motion.div>
                      </motion.a>
                    ))}
                    {/* Third set for even smoother loop */}
                    {clients.map((client, index) => (
                      <motion.a
                        animate={{ opacity: 1, scale: 1 }}
                        className="group flex shrink-0 flex-col items-center justify-center p-6 transition-all hover:scale-105 cursor-pointer"
                        href={client.url}
                        initial={{ opacity: 0, scale: 0.8 }}
                        key={`third-${client.id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                        transition={{
                          duration: 0.4,
                          delay: index * STAGGER_DELAY,
                        }}
                      >
                        <motion.div
                          className="mb-2 w-24 h-24 md:w-20 md:h-32 flex items-center justify-center"
                          transition={{
                            type: "spring",
                            stiffness: SPRING_STIFFNESS,
                          }}
                          whileHover={{
                            scale: HOVER_SCALE,
                            rotate: HOVER_ROTATE,
                          }}
                        >
                          <img
                            src={client.logo}
                            alt={getTranslatedText(
                              client.name_translations || client.name
                            )}
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
                        </motion.div>
                      </motion.a>
                    ))}
                  </motion.div>
                </div>
              </div>
            )}

            {/* Lista de clientes */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t("clients.title")}
              </h2>
              <div className="space-y-6">
                {currentClients.map((client) => (
                  <div key={client.id} className="flex items-center gap-4">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      <img
                        src={client.logo}
                        alt={getTranslatedText(
                          client.name_translations || client.name
                        )}
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
                        {getTranslatedText(
                          client.name_translations || client.name
                        )}
                      </h3>
                      <p className="text-gray-600">
                        {getTranslatedText(
                          client.description_translations || client.description
                        )}
                      </p>
                    </div>

                    {/* Botón PixelArt */}
                    {client.url && (
                      <div className="flex-shrink-0">
                        <a
                          href={client.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-4 py-2 border-2 border-black bg-white text-black font-bold hover:bg-black hover:text-white transition-all duration-200 cursor-pointer"
                          style={{
                            fontFamily: "'Press Start 2P', monospace",
                            fontSize: "8px",
                            boxShadow: "4px 4px 0px 0px #000",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow =
                              "2px 2px 0px 0px #000";
                            e.currentTarget.style.transform =
                              "translate(2px, 2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow =
                              "4px 4px 0px 0px #000";
                            e.currentTarget.style.transform = "translate(0, 0)";
                          }}
                        >
                          {t("clients.viewLink")}
                        </a>
                      </div>
                    )}
                  </div>
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
            {testimonials.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {t("clients.testimonials")}
                </h2>
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
                      {testimonial.content &&
                        testimonial.content.trim() !== "" && (
                          <p className="text-gray-700 mb-4 italic leading-relaxed">
                            "{testimonial.content}"
                          </p>
                        )}

                      {/* Autor */}
                      <div className="border-t border-gray-200 pt-4">
                        <p className="font-semibold text-gray-900">
                          {testimonial.author}
                        </p>
                        <p className="text-sm text-gray-600">
                          {testimonial.role}
                        </p>
                        {testimonial.url && (
                          <a
                            href={testimonial.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 px-3 py-1 border-2 border-black bg-white text-black font-bold hover:bg-black hover:text-white transition-all duration-200 cursor-pointer"
                            style={{
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: "7px",
                              boxShadow: "3px 3px 0px 0px #000",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow =
                                "1px 1px 0px 0px #000";
                              e.currentTarget.style.transform =
                                "translate(2px, 2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow =
                                "3px 3px 0px 0px #000";
                              e.currentTarget.style.transform =
                                "translate(0, 0)";
                            }}
                          >
                            {t("clients.viewTestimonial")}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Clients;
