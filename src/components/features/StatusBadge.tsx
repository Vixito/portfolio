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
  const { status } = useStatusStore();
  const isStatusPage = location.pathname === "/status";

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

  // Animación de shake con bordes rojos cuando está en rojo
  useEffect(() => {
    if (status === "busy" && badgeRef.current) {
      // Shake del botón
      gsap.to(badgeRef.current, {
        x: [-10, 10, -10, 10, 0],
        duration: 0.5,
        ease: "power2.out",
      });

      // Efecto de bordes rojos en la pantalla
      const redBorder = document.createElement("div");
      redBorder.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 4px solid #ef4444;
        pointer-events: none;
        z-index: 9999;
        animation: shake-border 0.5s ease-out;
      `;
      document.body.appendChild(redBorder);

      const style = document.createElement("style");
      style.textContent = `
        @keyframes shake-border {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-5px, -5px); }
          50% { transform: translate(5px, 5px); }
          75% { transform: translate(-5px, 5px); }
        }
      `;
      document.head.appendChild(style);

      setTimeout(() => {
        if (document.body.contains(redBorder)) {
          document.body.removeChild(redBorder);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      }, 500);
    }
  }, [status]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (status === "available") {
      // Confetti desde la posición del mouse
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;

      // Disparar confetti siempre, tanto en /status como en otras páginas
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: x / 100, y: y / 100 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });

      if (!isStatusPage) {
        navigate("/status");
      }
    } else if (status === "away") {
      const confirmed = window.confirm(t("statusBadge.confirm"));
      if (confirmed) {
        if (!isStatusPage) {
          navigate("/status");
        }
      }
    } else if (status === "busy" && isStatusPage) {
      // Shake con bordes rojos cuando está en rojo y se hace click en /status
      if (badgeRef.current) {
        gsap.to(badgeRef.current, {
          x: [-10, 10, -10, 10, 0],
          duration: 0.5,
          ease: "power2.out",
        });

        const redBorder = document.createElement("div");
        redBorder.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 4px solid #ef4444;
          pointer-events: none;
          z-index: 9999;
          animation: shake-border 0.5s ease-out;
        `;
        document.body.appendChild(redBorder);

        const style = document.createElement("style");
        style.textContent = `
          @keyframes shake-border {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-5px, -5px); }
            50% { transform: translate(5px, 5px); }
            75% { transform: translate(-5px, 5px); }
          }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
          if (document.body.contains(redBorder)) {
            document.body.removeChild(redBorder);
          }
          if (document.head.contains(style)) {
            document.head.removeChild(style);
          }
        }, 500);
      }
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
