import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  isVisible?: boolean;
  className?: string;
};

const toastIcons = {
  success: (
    <svg
      className="h-5 w-5 text-emerald-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  error: (
    <svg
      className="h-5 w-5 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  warning: (
    <svg
      className="h-5 w-5 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg
      className="h-5 w-5 text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const toastClasses = {
  success: "border-emerald-200/50 bg-emerald-50 border shadow-md",
  error: "border-red-200/50 bg-red-50 border shadow-md",
  warning: "border-amber-200/50 bg-amber-50 border shadow-md",
  info: "border-blue-200/50 bg-blue-50 border shadow-md",
};

export default function BasicToast({
  message,
  type = "info",
  duration = 3000,
  onClose,
  isVisible = true,
  className = "",
}: ToastProps) {
  const [mounted, setMounted] = useState(false);
  const [internalVisible, setInternalVisible] = useState(isVisible);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mantener onClose actualizado en el ref
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      setInternalVisible(true);
    } else {
      setInternalVisible(false);
    }
  }, [isVisible]);

  // Timer para cerrar automáticamente - se ejecuta cuando internalVisible cambia a true
  useEffect(() => {
    // Limpiar timers anteriores
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    // Solo configurar el timer si está visible y tiene duración válida
    if (!internalVisible || duration <= 0) {
      return;
    }

    // Configurar el timer para cerrar automáticamente
    timerRef.current = setTimeout(() => {
      setInternalVisible(false);
      // Esperar a que termine la animación de salida antes de llamar onClose
      closeTimerRef.current = setTimeout(() => {
        onCloseRef.current?.();
      }, 250);
    }, duration);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalVisible, duration]);

  const handleClose = () => {
    // Limpiar timers si el usuario cierra manualmente
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setInternalVisible(false);
    setTimeout(() => {
      onCloseRef.current?.();
    }, 250);
  };

  if (!mounted) {
    return null;
  }

  const toastContent = (
    <AnimatePresence>
      {internalVisible && (
        <motion.div
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className={`fixed top-4 right-4 z-50 flex w-80 items-center gap-3 rounded-lg border p-4 ${toastClasses[type]} ${className}`}
          exit={{
            opacity: 0,
            x: 50,
            scale: 0.8,
            transition: { duration: 0.2 },
          }}
          initial={{ opacity: 0, x: 50, scale: 0.8 }}
          transition={{ type: "spring", bounce: 0.25, duration: 0.3 }}
        >
          <div className="flex-shrink-0">{toastIcons[type]}</div>
          <p className="flex-1 text-sm font-medium text-gray-900">{message}</p>
          <button
            className="flex-shrink-0 rounded-full p-1 transition-colors hover:bg-black/5 text-gray-400 hover:text-gray-600"
            onClick={handleClose}
            type="button"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(toastContent, document.body);
}
