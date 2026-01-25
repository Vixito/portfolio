import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/i18n";

export interface TimelineCheckpoint {
  id: string;
  year: string;
  title: string;
  description: string;
}

interface SnakeTimelineProps {
  checkpoints?: TimelineCheckpoint[];
  className?: string;
}

// Colores base del proyecto con variaciones
const CHECKPOINT_COLORS = [
  "#331d83", // Purple principal
  "#4a2ba6", // Purple claro
  "#2093c4", // Cyan principal
  "#1a7da8", // Cyan oscuro
  "#5a3dc9", // Purple medio
  "#28a8db", // Cyan claro
  "#3d2d99", // Purple intermedio
];

// Posiciones de los checkpoints - curva S clásica más larga (será rotada con CSS)
const CHECKPOINT_POSITIONS = [
  { x: 70, y: 20 },   // Punto 1 - arriba derecha
  { x: 30, y: 100 },  // Punto 2 - izquierda
  { x: 70, y: 180 },  // Punto 3 - derecha
  { x: 30, y: 260 },  // Punto 4 - izquierda
  { x: 70, y: 340 },  // Punto 5 - derecha
  { x: 30, y: 420 },  // Punto 6 - izquierda
  { x: 70, y: 500 },  // Punto 7 - abajo derecha
];

// Path SVG - curva S clásica más larga (será rotada con CSS)
const SNAKE_PATH = `
  M 70 20
  Q 90 60, 30 100
  Q -10 140, 70 180
  Q 110 220, 30 260
  Q -10 300, 70 340
  Q 110 380, 30 420
  Q -10 460, 70 500
`;

export default function SnakeTimeline({ checkpoints, className }: SnakeTimelineProps) {
  const { t } = useTranslation();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  // Checkpoints por defecto (se pueden pasar como props o usar traducciones)
  const defaultCheckpoints: TimelineCheckpoint[] = [
    {
      id: "1",
      year: t("timeline.checkpoint1.year") || "2015",
      title: t("timeline.checkpoint1.title") || "Inicio en programación",
      description: t("timeline.checkpoint1.description") || "Primeros pasos con SQL y bases de datos",
    },
    {
      id: "2",
      year: t("timeline.checkpoint2.year") || "2017",
      title: t("timeline.checkpoint2.title") || "Desarrollo web",
      description: t("timeline.checkpoint2.description") || "Aprendiendo HTML, CSS y JavaScript",
    },
    {
      id: "3",
      year: t("timeline.checkpoint3.year") || "2019",
      title: t("timeline.checkpoint3.title") || "Backend development",
      description: t("timeline.checkpoint3.description") || "Node.js, Python y APIs",
    },
    {
      id: "4",
      year: t("timeline.checkpoint4.year") || "2020",
      title: t("timeline.checkpoint4.title") || "Universidad",
      description: t("timeline.checkpoint4.description") || "Ingeniería de Sistemas",
    },
    {
      id: "5",
      year: t("timeline.checkpoint5.year") || "2022",
      title: t("timeline.checkpoint5.title") || "Freelance",
      description: t("timeline.checkpoint5.description") || "Primeros clientes y proyectos",
    },
    {
      id: "6",
      year: t("timeline.checkpoint6.year") || "2024",
      title: t("timeline.checkpoint6.title") || "Automatización & AI",
      description: t("timeline.checkpoint6.description") || "Especialización en IA y automatización",
    },
    {
      id: "7",
      year: t("timeline.checkpoint7.year") || "2025",
      title: t("timeline.checkpoint7.title") || "Vixis Studio",
      description: t("timeline.checkpoint7.description") || "Marca personal y servicios",
    },
  ];

  const items = checkpoints || defaultCheckpoints;

  // Obtener longitud del path para animación
  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  const handleCheckpointClick = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-[550px] z-50", className)}>
      <svg
        viewBox="0 0 100 520"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: "rotate(-40deg)", transformOrigin: "center center" }}
      >
        {/* Línea diagonal con animación de dibujo */}
        <motion.path
          ref={pathRef}
          d={SNAKE_PATH}
          fill="none"
          stroke="url(#snakeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        {/* Gradiente para la línea */}
        <defs>
          <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#331d83" />
            <stop offset="50%" stopColor="#2093c4" />
            <stop offset="100%" stopColor="#331d83" />
          </linearGradient>
        </defs>

        {/* Checkpoints */}
        {items.map((checkpoint, index) => {
          const pos = CHECKPOINT_POSITIONS[index];
          const color = CHECKPOINT_COLORS[index % CHECKPOINT_COLORS.length];
          const isHovered = hoveredId === checkpoint.id;
          const isSelected = selectedId === checkpoint.id;

          return (
            <g key={checkpoint.id}>
              {/* Círculo del checkpoint */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={isHovered || isSelected ? 10 : 7}
                fill={color}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  r: isHovered || isSelected ? 10 : 7,
                }}
                transition={{ 
                  delay: 1.5 + index * 0.15,
                  duration: 0.3,
                }}
                onMouseEnter={() => setHoveredId(checkpoint.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleCheckpointClick(checkpoint.id)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.95 }}
              />

              {/* Glow effect */}
              <motion.circle
                cx={pos.x}
                cy={pos.y}
                r={14}
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity={isHovered || isSelected ? 0.4 : 0}
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered || isSelected ? 0.4 : 0 }}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltips y detalles */}
      <AnimatePresence>
        {items.map((checkpoint, index) => {
          const pos = CHECKPOINT_POSITIONS[index];
          const isHovered = hoveredId === checkpoint.id && selectedId !== checkpoint.id;
          const isSelected = selectedId === checkpoint.id;
          const isLeft = pos.x < 50;

          // Posiciones ajustadas manualmente por la rotación de -40deg
          // Cada punto tiene offsets específicos para que tooltip/modal quede cerca
          const tooltipOffsets = [
            { left: 30, top: 5 },    // Punto 1 (2015)
            { left: 27, top: 15 },   // Punto 2 (2017)
            { left: 47, top: 25 },   // Punto 3 (2019)
            { left: 40, top: 38 },   // Punto 4 (2020)
            { left: 42, top: 45 },   // Punto 5 (2022)
            { left: 22, top: 72 },   // Punto 6 (2024)
            { left: 70, top: 68 },   // Punto 7 (2025)
          ];
          
          const modalOffsets = [
            { left: 30, top: 8 },    // Punto 1 (2015)
            { left: 20, top: 18 },   // Punto 2 (2017)
            { left: 50, top: 28 },   // Punto 3 (2019)
            { left: 5, top: 40 },   // Punto 4 (2020)
            { left: 20, top: 52 },   // Punto 5 (2022)
            { left: 25, top: 50 },   // Punto 6 (2024)
            { left: 41, top: 63 },   // Punto 7 (2025)
          ];

          const tOffset = tooltipOffsets[index] || { left: 50, top: 50 };
          const mOffset = modalOffsets[index] || { left: 25, top: 50 };

          // Tooltip (hover) - solo año y título
          if (isHovered) {
            return (
              <motion.div
                key={`tooltip-${checkpoint.id}`}
                className={cn(
                  "absolute pointer-events-none z-[100]",
                  "bg-white dark:bg-gray-900 backdrop-blur-sm",
                  "rounded-lg px-3 py-2 shadow-lg",
                  "border border-purple/30 dark:border-cyan/30"
                )}
                style={{
                  left: `${tOffset.left}%`,
                  top: `${tOffset.top}%`,
                }}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-purple dark:text-cyan-300 font-bold text-sm">{checkpoint.year}</p>
                <p className="text-gray-700 dark:text-gray-200 text-xs">{checkpoint.title}</p>
              </motion.div>
            );
          }

          // Modal (click) - detalles completos
          if (isSelected) {
            return (
              <motion.div
                key={`modal-${checkpoint.id}`}
                className={cn(
                  "absolute z-[200]",
                  "bg-white dark:bg-gray-900 backdrop-blur-md",
                  "rounded-xl p-4 shadow-2xl",
                  "border border-purple/50 dark:border-cyan/50",
                  "max-w-[200px] w-full"
                )}
                style={{
                  left: `${mOffset.left}%`,
                  top: `${mOffset.top}%`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: CHECKPOINT_COLORS[index % CHECKPOINT_COLORS.length] }}
                  />
                  <span className="text-purple dark:text-cyan-400 font-bold text-lg">{checkpoint.year}</span>
                </div>
                <h4 className="text-gray-900 dark:text-white font-semibold text-sm mb-2">{checkpoint.title}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">{checkpoint.description}</p>
                <button
                  className="mt-3 text-purple dark:text-cyan-400 text-xs hover:text-cyan-600 dark:hover:text-purple-400 transition-colors"
                  onClick={() => setSelectedId(null)}
                >
                  {t("timeline.close") || "Cerrar"} ✕
                </button>
              </motion.div>
            );
          }

          return null;
        })}
      </AnimatePresence>

      {/* Click outside to close */}
      {selectedId && (
        <div 
          className="absolute inset-0 z-[150]" 
          onClick={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export { SnakeTimeline };
