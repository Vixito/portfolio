import { useNavigate, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { useRef, useEffect } from "react";
import { useStatusStore } from "../../stores/useStatusStore";
import { useTranslation } from "../../lib/i18n";
import confetti from "canvas-confetti";

function StatusBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const badgeRef = useRef<HTMLButtonElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const { status, setStatus, loadStatus, isLoading } = useStatusStore();
  const isStatusPage = location.pathname === "/status";

  // Cargar status desde la base de datos al montar el componente
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Escuchar cambios en localStorage y eventos personalizados para actualizar el estado
  useEffect(() => {
    const handleStatusChange = ((
      e: CustomEvent<"available" | "away" | "busy">
    ) => {
      const newStatus = e.detail;
      if (["available", "away", "busy"].includes(newStatus)) {
        const store = useStatusStore.getState();
        if (store.status !== newStatus) {
          setStatus(newStatus);
        }
      }
    }) as EventListener;

    // Escuchar eventos personalizados con detail
    window.addEventListener("statusChanged", handleStatusChange);

    // Escuchar cambios en localStorage (desde otras pestañas)
    window.addEventListener("storage", (e) => {
      if (e.key === "user_status" && e.newValue) {
        const saved = e.newValue;
        if (["available", "away", "busy"].includes(saved)) {
          const store = useStatusStore.getState();
          if (store.status !== saved) {
            setStatus(saved as "available" | "away" | "busy");
          }
        }
      }
    });

    return () => {
      window.removeEventListener("statusChanged", handleStatusChange);
    };
  }, [setStatus]);

  // Animación de pulso para el indicador verde
  useEffect(() => {
    if (indicatorRef.current && status === "available") {
      const indicator = indicatorRef.current;

      // Crear efecto de glow/pulso
      const pulseAnimation = gsap.to(indicator, {
        scale: 1.2,
        opacity: 0.7,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "power2.inOut",
      });

      return () => {
        pulseAnimation.kill();
      };
    }
  }, [status]);

  // Función para aplicar parpadeo del borde rojo (solo cuando se hace click en /status)
  const applyRedBorderBlink = () => {
    const redBorder = document.createElement("div");
    redBorder.id = "status-red-border";
    redBorder.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 4px solid #ef4444;
      pointer-events: none;
      z-index: 9999;
      opacity: 1;
    `;
    document.body.appendChild(redBorder);

    // Parpadeo usando GSAP
    const blinkAnimation = gsap.to(redBorder, {
      opacity: 0,
      duration: 0.15,
      repeat: 7, // 8 parpadeos totales (0-7)
      yoyo: true,
      ease: "power2.inOut",
      onComplete: () => {
        if (document.body.contains(redBorder)) {
          document.body.removeChild(redBorder);
        }
      },
    });

    // Eliminar después de ~3 segundos por seguridad
    setTimeout(() => {
      blinkAnimation.kill();
      if (document.body.contains(redBorder)) {
        document.body.removeChild(redBorder);
      }
    }, 3000);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Si no estamos en /status, solo navegar
    if (!isStatusPage) {
      navigate("/status");
      return;
    }

    // Efectos según el estado (solo en /status y solo cuando se hace clic en el badge)
    if (status === "available") {
      // Confetti desde la posición del mouse
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: x / 100, y: y / 100 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
    } else if (status === "busy") {
      // Parpadeo del borde rojo solo cuando se hace click en el badge en /status
      applyRedBorderBlink();
    }
  };

  const statusConfig = {
    available: {
      indicatorColor: "bg-green-500",
      text: t("statusBadge.available"),
    },
    away: {
      indicatorColor: "bg-yellow-500",
      text: t("statusBadge.away"),
    },
    busy: {
      indicatorColor: "bg-red-700",
      text: t("statusBadge.busy"),
    },
  };

  const config = statusConfig[status];

  return (
    <button
      ref={badgeRef}
      onClick={handleClick}
      disabled={false}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 font-medium transition-all ${
        status === "busy" ? "opacity-75" : "hover:bg-gray-50"
      } ${isStatusPage ? "" : "cursor-pointer"}`}
    >
      {/* Indicador circular con glow */}
      <span
        ref={indicatorRef}
        className={`relative w-3 h-3 rounded-full ${config.indicatorColor}`}
      >
        {/* Glow effect */}
        {status === "available" && (
          <span
            className={`absolute inset-0 rounded-full ${config.indicatorColor} opacity-50 blur-sm`}
            style={{
              animation: "pulse-glow 1.5s ease-in-out infinite",
            }}
          />
        )}
      </span>
      <span className="text-sm font-semibold">{config.text}</span>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.5);
            opacity: 0.3;
          }
        }
      `}</style>
    </button>
  );
}

export default StatusBadge;
