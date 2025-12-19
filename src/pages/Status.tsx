import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gsap } from "gsap";
import { useStatusStore } from "../stores/useStatusStore";
import { useLanguageStore } from "../stores/useLanguageStore";
import StatusBadge from "../components/features/StatusBadge";
import AnimatedInput from "../components/ui/AnimatedInput";
import Textarea from "../components/ui/Textarea";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { createRequest } from "../lib/supabase-functions";
import { useTranslation } from "../lib/i18n";
// Esquema de validación con Zod - se actualizará dinámicamente con traducciones
const createRequestSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t("status.namePlaceholder")),
    email: z.string().email(t("status.emailPlaceholder")),
    requestType: z.enum(["job", "collaboration", "consultation", "other"], {
      error: t("status.typePlaceholder"),
    }),
    message: z.string().min(10, t("status.messagePlaceholder")),
  });

function Status() {
  const { t, language } = useTranslation();

  const requestSchema = createRequestSchema(t);
  type RequestFormData = z.infer<typeof requestSchema>;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>("");
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navHeightRef = useRef<number>(80); // Altura aproximada del Nav

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
  });

  // Calcular altura del Nav al montar
  useEffect(() => {
    const nav = document.querySelector("nav");
    if (nav) {
      navHeightRef.current = nav.offsetHeight;
    }
  }, []);

  // Actualizar hora UTC-5 en tiempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Obtener hora UTC
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const utcSeconds = now.getUTCSeconds();

      // Calcular UTC-5 (restar 5 horas)
      let utc5Hours = utcHours - 5;
      if (utc5Hours < 0) {
        utc5Hours += 24;
      }

      const hours = utc5Hours.toString().padStart(2, "0");
      const minutes = utcMinutes.toString().padStart(2, "0");
      const seconds = utcSeconds.toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds} UTC-5`);
    };

    // Actualizar inmediatamente
    updateTime();

    // Actualizar cada segundo
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Cargar script de Tenor cuando el formulario está abierto
  useEffect(() => {
    if (isFormOpen) {
      // Verificar si el script ya existe
      const existingScript = document.querySelector(
        'script[src="https://tenor.com/embed.js"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = "https://tenor.com/embed.js";
        document.body.appendChild(script);
      }
    }
  }, [isFormOpen]);

  // Animación del sidebar y encogimiento del contenido
  useEffect(() => {
    if (isFormOpen) {
      // Abrir sidebar
      if (sidebarRef.current) {
        sidebarRef.current.style.display = "block";
        gsap.fromTo(
          sidebarRef.current,
          { x: "100%" },
          { x: 0, duration: 0.3, ease: "power3.out" }
        );
      }

      // Encoger contenido principal (responsive)
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          scale: 0.85,
          width: "70%",
          duration: 0.3,
          ease: "power3.out",
        });
      }
    } else {
      // Cerrar sidebar
      if (sidebarRef.current) {
        gsap.to(sidebarRef.current, {
          x: "100%",
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => {
            if (sidebarRef.current) {
              sidebarRef.current.style.display = "none";
            }
          },
        });
      }

      // Restaurar contenido principal
      if (contentRef.current) {
        gsap.to(contentRef.current, {
          scale: 1,
          width: "100%",
          duration: 0.3,
          ease: "power2.out",
        });
      }
    }
  }, [isFormOpen]);

  const onSubmit = async (data: RequestFormData) => {
    try {
      // Llamar a la función RPC para crear la petición
      const requestId = await createRequest({
        name: data.name,
        email: data.email,
        request_type: data.requestType,
        message: data.message,
      });

      // Éxito
      alert(t("status.success"));
      reset();
      setIsFormOpen(false);
    } catch (error) {
      // Error
      console.error(t("status.error"), error);
      alert(
        error instanceof Error ? `Error: ${error.message}` : t("status.error")
      );
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  // Cerrar formulario con tecla Esc
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFormOpen) {
        setIsFormOpen(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isFormOpen]);

  // Datos mock para los gráficos
  const timeData = [
    { date: t("status.mon"), available: 8, away: 2, busy: 0 },
    { date: t("status.tue"), available: 7, away: 1, busy: 2 },
    { date: t("status.wed"), available: 6, away: 3, busy: 1 },
    { date: t("status.thu"), available: 8, away: 0, busy: 2 },
    { date: t("status.fri"), available: 5, away: 2, busy: 3 },
  ];

  const statusDistribution = [
    { name: t("status.available"), value: 34, color: "#10b981" },
    { name: t("status.away"), value: 8, color: "#f59e0b" },
    { name: t("status.busy"), value: 8, color: "#ef4444" },
  ];

  const weeklyStats = [
    { day: t("status.monday"), hours: 8 },
    { day: t("status.tuesday"), hours: 7 },
    { day: t("status.wednesday"), hours: 6 },
    { day: t("status.thursday"), hours: 8 },
    { day: t("status.friday"), hours: 5 },
  ];

  return (
    <>
      <div ref={contentRef} className="min-h-screen py-20 px-4 transition-all">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">
              {t("status.title")}
            </h1>
          </div>

          {/* Botones alineados a la izquierda encima de las gráficas */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <StatusBadge />
              <button
                onClick={() => setIsFormOpen(true)}
                className="px-4 md:px-6 py-1.5 text-sm md:text-base rounded-lg border border-blue-500/50 bg-blue-100/50 text-black font-semibold hover:bg-blue-100/80 transition-all cursor-pointer"
              >
                {t("status.sendRequest")}
              </button>
            </div>
            <a
              href={
                language === "es" ? "https://time.is/es/" : "https://time.is/"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs md:text-sm text-black pr-7 hover:text-purple transition-colors cursor-pointer font-mono"
            >
              {currentTime}
            </a>
          </div>

          {/* Estadísticas y Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
            {/* Gráfico de líneas - Tiempo por día */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                {t("status.hoursByStatus")}
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="available"
                    stroke="#10b981"
                    strokeWidth={2}
                    name={t("status.available")}
                  />
                  <Line
                    type="monotone"
                    dataKey="away"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name={t("status.away")}
                  />
                  <Line
                    type="monotone"
                    dataKey="busy"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name={t("status.busy")}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de barras - Horas semanales */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">
                {t("status.availableHours")}
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#331d83" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de pastel - Distribución de estados */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 border border-gray-200 mb-8 md:mb-12">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4 text-center">
              {t("status.statusDistribution")}
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    percent ? `${name}: ${(percent * 100).toFixed(0)}%` : name
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Resumen de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="text-3xl font-bold text-green-700 mb-2">34h</div>
              <div className="text-gray-600">
                {t("status.availableThisWeek")}
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border border-yellow-200">
              <div className="text-3xl font-bold text-yellow-700 mb-2">8h</div>
              <div className="text-gray-600">{t("status.awayThisWeek")}</div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="text-3xl font-bold text-red-700 mb-2">8h</div>
              <div className="text-gray-600">{t("status.busyThisWeek")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar con Formulario - estilo Sheet */}
      <div
        ref={sidebarRef}
        className="fixed right-0 w-full max-w-md bg-white z-[60] border-l-2 border-purple shadow-2xl"
        style={{
          display: "none",
          transform: "translateX(100%)",
          top: 0,
          bottom: `${navHeightRef.current}px`,
        }}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {t("status.requestForm")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("status.formDescription")}
              </p>
            </div>
            <button
              onClick={handleCloseForm}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer p-1 rounded-sm hover:bg-gray-100"
              aria-label={t("common.close")}
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Formulario - contenido scrollable */}
          <form
            ref={formRef}
            onSubmit={handleSubmit(onSubmit)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nombre */}
              <div className="space-y-2">
                <AnimatedInput
                  type="text"
                  label={`${t("status.name")} *`}
                  placeholder={t("status.namePlaceholder")}
                  {...register("name")}
                  error={!!errors.name}
                  id="name"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <AnimatedInput
                  type="email"
                  label={`${t("status.email")} *`}
                  placeholder={t("status.emailPlaceholder")}
                  {...register("email")}
                  error={!!errors.email}
                  id="email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Tipo de Petición */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  {t("status.type")} *
                </label>
                <select
                  {...register("requestType")}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 transition-colors ${
                    errors.requestType ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">{t("status.typePlaceholder")}</option>
                  <option value="job">{t("status.jobOffer")}</option>
                  <option value="collaboration">
                    {t("status.collaboration")}
                  </option>
                  <option value="consultation">{t("status.project")}</option>
                  <option value="other">{t("status.other")}</option>
                </select>
                {errors.requestType && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.requestType.message}
                  </p>
                )}
              </div>

              {/* Mensaje */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">
                  {t("status.message")} *
                </label>
                <Textarea
                  placeholder={t("status.messagePlaceholder")}
                  rows={4}
                  {...register("message")}
                  className={`w-full ${errors.message ? "border-red-500" : ""}`}
                />
                {errors.message && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.message.message}
                  </p>
                )}
              </div>

              {/* Ejemplo de petición */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">
                  {t("status.example")}:
                </p>
                <div className="text-xs text-gray-500 space-y-1 leading-relaxed">
                  <p>{t("status.exampleName")}</p>
                  <p>{t("status.exampleEmail")}</p>
                  <p>{t("status.exampleType")}</p>
                  <p className="mt-2">{t("status.exampleMessage")}</p>
                  <p className="mt-3 text-gray-400 italic">
                    {t("status.exampleNote")}
                  </p>
                </div>
              </div>

              {/* GIF */}
              <div className="pt-4 flex justify-center">
                <div
                  className="tenor-gif-embed"
                  data-postid="12117773"
                  data-share-method="host"
                  data-aspect-ratio="1.33333"
                  data-width="100%"
                  style={{ maxWidth: "480px", maxHeight: "270px" }}
                >
                  <a href="https://tenor.com/view/big-bang-idea-lightbulb-mind-blown-gif-12117773">
                    Big Bang GIF
                  </a>
                  from <a href="https://tenor.com/search/big-gifs">Big GIFs</a>
                </div>
              </div>
            </div>

            {/* Footer con botones - fijo al final */}
            <div className="border-t border-gray-200 p-6 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t("common.loading") : t("status.submit")}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition-colors cursor-pointer"
                >
                  {t("status.cancel")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default Status;
