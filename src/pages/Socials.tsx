/*
Nota: Para scroll infinito, puedes usar una librería como react-infinite-scroll-component o implementarlo manualmente con IntersectionObserver.
Por ahora, este código muestra una lista simple que puedes paginar después.
*/

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface SocialLink {
  id: string;
  title: string;
  description: string;
  logo: string;
  url: string;
  image?: string; // Imagen que pondrás tú
  category?: string;
}

function Socials() {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockData: SocialLink[] = [
      {
        id: "1",
        title: "GitHub",
        description: "Repositorios y proyectos de código abierto",
        logo: "https://img.logo.dev/name/GitHub?token=pk_Au6BgsgUQ5SltADJUPu63g&format=webp&retina=true",
        url: "https://github.com/Vixito",
        image: "https://tu-cdn.cloudfront.net/socials/github.jpg", // Imagen que pondrás
        category: "Desarrollo",
      },
      {
        id: "2",
        title: "LinkedIn",
        description: "Perfil profesional y conexiones",
        logo: "https://img.logo.dev/name/LinkedIn?token=pk_Au6BgsgUQ5SltADJUPu63g&format=webp&retina=true",
        url: "https://linkedin.com/in/vixis",
        image: "https://tu-cdn.cloudfront.net/socials/linkedin.jpg",
        category: "Profesional",
      },
      {
        id: "3",
        title: "Twitter/X",
        description: "Actualizaciones y pensamientos",
        logo: "https://img.logo.dev/name/X?token=pk_Au6BgsgUQ5SltADJUPu63g&format=webp&retina=true",
        url: "https://x.com/vizzzis_",
        image: "https://tu-cdn.cloudfront.net/socials/twitter.jpg",
        category: "Social",
      },
      {
        id: "4",
        title: "Instagram",
        description: "Contenido casual",
        logo: "https://img.logo.dev/name/Instagram?token=pk_Au6BgsgUQ5SltADJUPu63g&format=webp&retina=true",
        url: "https://instagram.com/vizzzis_",
        image: "https://tu-cdn.cloudfront.net/socials/instagram.jpg",
        category: "Social",
      },
    ];

    setTimeout(() => {
      setSocialLinks(mockData);
      setLoading(false);
    }, 500);
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
      </div>
    </div>
  );
}

export default Socials;
