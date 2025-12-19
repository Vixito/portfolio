/*
Nota: Para scroll infinito, puedes usar una librería como react-infinite-scroll-component o implementarlo manualmente con IntersectionObserver.
Por ahora, este código muestra una lista simple que puedes paginar después.
*/

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSocials } from "../lib/supabase-functions";

interface SocialLink {
  id: string;
  title: string;
  description: string;
  logo: string;
  url: string;
  image?: string;
  category?: string;
}

function Socials() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSocials = async () => {
      try {
        setLoading(true);
        const socialsData = await getSocials();
        setSocialLinks(socialsData || []);
      } catch (error) {
        console.error("Error al cargar redes sociales:", error);
        setSocialLinks([]);
      } finally {
        setLoading(false);
      }
    };

    loadSocials();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-center mb-12">
          Redes Sociales
        </h1>

        {socialLinks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-600 mb-4">
              No hay redes sociales disponibles
            </p>
            <p className="text-gray-500">
              Vuelve pronto para ver mis redes sociales
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {socialLinks.map((social, index) => (
              <motion.div
                key={social.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-purple/50 h-full flex flex-col">
                  {/* Imagen */}
                  {social.image && (
                    <div className="w-full h-48 overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={social.image}
                        alt={social.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}

                  {/* Contenido */}
                  <div className="p-6 flex flex-col flex-1 min-h-0">
                    {/* Título en negrita */}
                    <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple transition-colors">
                      {social.title}
                    </h3>

                    {/* Badge del logo + texto del enlace - SOLO ESTE ES CLICKEABLE */}
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 mb-3 rounded-lg border border-gray-200 hover:border-purple hover:bg-purple-400/5 transition-all cursor-pointer flex-shrink-0"
                    >
                      <div className="w-4 h-8 ml-2 flex items-center justify-center flex-shrink-0">
                        <img
                          src={social.logo}
                          alt={social.title}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-sm font-medium text-blue group-hover:text-blue transition-colors">
                        Visitar
                      </span>
                    </a>

                    {/* Descripción debajo del badge */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {social.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Socials;
