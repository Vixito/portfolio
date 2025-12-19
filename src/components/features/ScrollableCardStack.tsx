import { useRef, useEffect, useState, useMemo } from "react";
import { gsap } from "gsap";
import { useTranslation } from "../../lib/i18n";

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
  const projects = useMemo<Project[]>(
    () => [
      {
        id: "1",
        title: "Vixito - Discord Bot",
        thumbnail: "https://cdn.vixito.gg/Vixito+-+Logo.png",
        month: t("homeSection.december"),
        year: 2025,
        url: "https://vixito.gg",
      },
      {
        id: "2",
        title: "Filippo Cucine",
        thumbnail: "https://cdn.vixis.dev/Filippo+Cucine+-+Thumbnail.webp",
        month: t("homeSection.december"),
        year: 2025,
        url: "https://filippo-cucine.com",
      },
    ],
    [t, language]
  );

  useEffect(() => {
    if (!containerRef.current) return;

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

  const handleCardClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div ref={containerRef} className="relative h-64 perspective-1000">
      {projects.map((project, index) => (
        <div
          key={project.id}
          className="stack-card absolute inset-0 bg-white rounded-lg shadow-xl cursor-pointer transform-gpu border-2 border-gray-200 overflow-hidden"
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
