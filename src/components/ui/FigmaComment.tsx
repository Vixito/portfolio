import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "./Avatar";
import { cn } from "../../lib/utils";
import { useClickOutside } from "../../hooks/useClickOutside";

// Constantes de animación
const CLOSED_SIZE = 32;
const AVATAR_CLOSED_LEFT = 4;
const AVATAR_CLOSED_TOP = 4;
const AVATAR_OPEN_LEFT = 12;
const AVATAR_OPEN_TOP = 12;
const CONTENT_DELAY = 0.15;
const INITIAL_BLUR_PX = 6;
const EXIT_BLUR_PX = 3;
const MEASURE_DELAY_SHORT = 100;
const MEASURE_DELAY_LONG = 500;
const CONTAINER_CLOSE_DELAY = 0.08;
const BLUR_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface FigmaCommentProps {
  avatarUrl?: string;
  avatarAlt?: string;
  className?: string;
  authorName?: string;
  timestamp?: string;
  message?: string;
  width?: number;
  onOpenChange?: (isOpen: boolean) => void;
}

export default function FigmaComment({
  avatarUrl = "https://cdn.vixis.dev/Foto+de+Perfil+2.webp",
  avatarAlt = "Avatar",
  className,
  authorName = "Vixis",
  timestamp = "Ahora",
  message = "Este es un comentario de ejemplo...",
  width = 200,
  onOpenChange,
}: FigmaCommentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(CLOSED_SIZE);
  const shouldReduceMotion = useReducedMotion();

  // Cerrar al hacer click afuera
  useClickOutside(containerRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  // Notificar cambios de estado al padre
  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  // Medir altura del contenido
  useEffect(() => {
    const measureHeight = () => {
      if (contentRef.current) {
        const innerDiv = contentRef.current.firstElementChild as HTMLElement;
        if (innerDiv) {
          const height = innerDiv.scrollHeight;
          if (height > 0) {
            setContentHeight(height);
          }
        }
      }
    };

    const timeoutId = setTimeout(measureHeight, MEASURE_DELAY_SHORT);
    const timeoutId2 = setTimeout(measureHeight, MEASURE_DELAY_LONG);
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
    };
  }, [message]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className={cn("relative", className)}>
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                width: isOpen ? width : CLOSED_SIZE,
                height: isOpen ? contentHeight : CLOSED_SIZE,
              }
        }
        className="absolute bottom-0 left-0 cursor-pointer overflow-hidden rounded-2xl rounded-bl-none bg-white dark:bg-gray-800 shadow-lg"
        onClick={handleToggle}
        ref={containerRef}
        style={
          shouldReduceMotion
            ? {
                width: isOpen ? width : CLOSED_SIZE,
                height: isOpen ? contentHeight : CLOSED_SIZE,
              }
            : undefined
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : {
                type: "spring",
                stiffness: 550,
                damping: 45,
                mass: 0.7,
                delay: isOpen ? 0 : CONTAINER_CLOSE_DELAY,
                duration: 0.25,
              }
        }
      >
        {/* Avatar - anima posición */}
        <motion.div
          animate={
            shouldReduceMotion
              ? {}
              : {
                  left: isOpen ? AVATAR_OPEN_LEFT : AVATAR_CLOSED_LEFT,
                  top: isOpen ? AVATAR_OPEN_TOP : AVATAR_CLOSED_TOP,
                }
          }
          className="absolute z-10"
          style={
            shouldReduceMotion
              ? {
                  left: isOpen ? AVATAR_OPEN_LEFT : AVATAR_CLOSED_LEFT,
                  top: isOpen ? AVATAR_OPEN_TOP : AVATAR_CLOSED_TOP,
                }
              : undefined
          }
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  duration: 0.25,
                }
          }
        >
          <Avatar className="h-6 w-6">
            <AvatarImage alt={avatarAlt} src={avatarUrl} />
            <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Contenido oculto para medición */}
        <div
          className="pointer-events-none absolute"
          ref={contentRef}
          style={{
            width: `${width}px`,
            top: "-9999px",
            left: 0,
            position: "absolute",
          }}
        >
          <div className="flex flex-col items-start gap-0.5 py-3 pr-4 pl-11">
            <div className="flex items-start gap-1">
              <p className="font-semibold text-[11px] text-gray-900 dark:text-gray-100 leading-4">
                {authorName}
              </p>
              <p className="font-medium text-[11px] text-gray-500 dark:text-gray-400 leading-4">
                {timestamp}
              </p>
            </div>
            <p className="text-left font-medium text-[11px] text-gray-900 dark:text-gray-100 leading-4">
              {message}
            </p>
          </div>
        </div>

        {/* Contenido visible cuando está abierto */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              animate={
                shouldReduceMotion
                  ? { opacity: 1 }
                  : {
                      opacity: 1,
                      filter: "blur(0px)",
                    }
              }
              className="absolute inset-0 flex flex-col items-start gap-0.5 py-3 pr-4 pl-11"
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      filter: `blur(${EXIT_BLUR_PX}px)`,
                    }
              }
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      filter: `blur(${INITIAL_BLUR_PX}px)`,
                    }
              }
              style={{
                width: `${width}px`,
              }}
              transition={{
                opacity: {
                  duration: 0.25,
                  ease: BLUR_EASE,
                  delay: CONTENT_DELAY,
                },
                filter: {
                  duration: 0.25,
                  ease: BLUR_EASE,
                  delay: CONTENT_DELAY,
                },
              }}
            >
              <div className="flex items-start gap-1">
                <p className="font-semibold text-[11px] text-gray-900 dark:text-gray-100 leading-4">
                  {authorName}
                </p>
                <p className="font-medium text-[11px] text-gray-500 dark:text-gray-400 leading-4">
                  {timestamp}
                </p>
              </div>
              <p className="text-left font-medium text-[11px] text-gray-900 dark:text-gray-100 leading-4">
                {message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export { FigmaComment };
