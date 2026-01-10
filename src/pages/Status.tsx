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
import { createRequest } from "../lib/supabase-functions";
import { useTranslation } from "../lib/i18n";

// Esquema de validación con Zod - se actualizará dinámicamente con traducciones
const createRequestSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(2, t("status.namePlaceholder")),
    email: z
      .string()
      .min(1, "Tu email completo es requerido")
      .email(t("status.emailPlaceholder") || "Ingresa un email válido"),
    requestType: z.enum(["job", "collaboration", "consultation", "other"], {
      error: t("status.typePlaceholder"),
    }),
    message: z
      .string()
      .min(1, t("status.messagePlaceholder") || "Este campo es requerido")
      .min(
        10,
        t("status.messagePlaceholder") ||
          "El mensaje debe tener al menos 10 caracteres"
      ),
    currency: z.enum(["COP", "USD"], {
      error: t("status.selectCurrency"),
    }),
    investmentRange: z.string().min(1, t("status.selectRange")),
  });

function Status() {
  const { t, language } = useTranslation();
  const { status } = useStatusStore();
  const [currentTime, setCurrentTime] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<"COP" | "USD">(
    "COP"
  );
  const [showInvestmentDropdown, setShowInvestmentDropdown] = useState(false);
  const [showRequestTypeDropdown, setShowRequestTypeDropdown] = useState(false);
  const investmentDropdownRef = useRef<HTMLDivElement>(null);
  const requestTypeDropdownRef = useRef<HTMLDivElement>(null);

  const requestSchema = createRequestSchema(t);
  type RequestFormData = z.infer<typeof requestSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      currency: "COP",
    },
  });

  const watchedCurrency = watch("currency");

  // Sincronizar selectedCurrency con el formulario
  useEffect(() => {
    setSelectedCurrency(watchedCurrency || "COP");
  }, [watchedCurrency]);

  // Resetear campo de inversión cuando cambie la divisa
  useEffect(() => {
    setValue("investmentRange", "");
  }, [selectedCurrency, setValue]);

  // Rangos de inversión según divisa
  const investmentRanges = {
    COP: [
      { value: "250000-500000", label: "$250.000 - $500.000" },
      { value: "500000-1000000", label: "$500.000 - $1.000.000" },
      { value: "1000000-3000000", label: "$1.000.000 - $3.000.000" },
      { value: "3000000+", label: "$3.000.000+" },
      { value: "custom", label: "A convenir / Por definir" },
    ],
    USD: [
      { value: "0-500", label: "$0 - $500" },
      { value: "500-1000", label: "$500 - $1.000" },
      { value: "1000-2000", label: "$1.000 - $2.000" },
      { value: "2000-5000", label: "$2.000 - $5.000" },
      { value: "5000+", label: "$5.000+" },
      { value: "custom", label: "A convenir / Por definir" },
    ],
  };

  // Actualizar hora UTC-5 en tiempo real
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const utcSeconds = now.getUTCSeconds();

      let utc5Hours = utcHours - 5;
      if (utc5Hours < 0) {
        utc5Hours += 24;
      }

      const hours = utc5Hours.toString().padStart(2, "0");
      const minutes = utcMinutes.toString().padStart(2, "0");
      const seconds = utcSeconds.toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds} UTC-5`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animaciones GSAP para los dropdowns
  useEffect(() => {
    if (investmentDropdownRef.current) {
      if (showInvestmentDropdown) {
        gsap.fromTo(
          investmentDropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" }
        );
      } else {
        gsap.to(investmentDropdownRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.95,
          duration: 0.15,
          ease: "power2.in",
        });
      }
    }
  }, [showInvestmentDropdown]);

  useEffect(() => {
    if (requestTypeDropdownRef.current) {
      if (showRequestTypeDropdown) {
        gsap.fromTo(
          requestTypeDropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: "power2.out" }
        );
      } else {
        gsap.to(requestTypeDropdownRef.current, {
          opacity: 0,
          y: -10,
          scale: 0.95,
          duration: 0.15,
          ease: "power2.in",
        });
      }
    }
  }, [showRequestTypeDropdown]);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".investment-dropdown-container")) {
        setShowInvestmentDropdown(false);
      }
      if (!target.closest(".request-type-dropdown-container")) {
        setShowRequestTypeDropdown(false);
      }
    };

    if (showInvestmentDropdown || showRequestTypeDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showInvestmentDropdown, showRequestTypeDropdown]);

  const onSubmit = async (data: RequestFormData) => {
    try {
      await createRequest({
        name: data.name,
        email: data.email,
        request_type: data.requestType,
        message: data.message,
      });

      alert(t("status.success"));
      reset();
    } catch (error) {
      console.error(t("status.error"), error);
      alert(
        error instanceof Error ? `Error: ${error.message}` : t("status.error")
      );
    }
  };

  const handleTestimonialClick = () => {
    // URLs de Tally.so según el idioma
    const tallyUrl =
      language === "es"
        ? "https://tally.so/r/yP2O90"
        : "https://tally.so/r/VLQgPy";
    window.open(tallyUrl, "_blank", "noopener,noreferrer");
  };

  const selectedRange = watch("investmentRange");
  const selectedRangeLabel =
    investmentRanges[selectedCurrency].find((r) => r.value === selectedRange)
      ?.label || t("status.selectRange");

  return (
    <div className="min-h-screen py-20 px-4 bg-white relative overflow-hidden">
      {/* Fondo cuadriculado con Blue Corner Glow (igual que Home) */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f0f0f0 1px, transparent 1px),
            linear-gradient(to bottom, #f0f0f0 1px, transparent 1px),
            radial-gradient(circle 600px at 0% 200px, rgba(32, 148, 197, 0.302), transparent),
            radial-gradient(circle 600px at 100% 200px, rgba(32, 147, 196, 0.3), transparent)
          `,
          backgroundSize: "20px 20px, 20px 20px, 100% 100%, 100% 100%",
        }}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
            {t("status.title")}
          </h1>
        </div>

        {/* Botones y hora */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <StatusBadge />
            <button
              onClick={handleTestimonialClick}
              className="flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 font-medium transition-all cursor-pointer hover:bg-blue-50"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#2093c4";
                e.currentTarget.style.color = "#2093c4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.color = "#111827";
              }}
            >
              <span className="text-sm font-semibold">
                {t("status.giveTestimonial") || "Brindar un Testimonio"}
              </span>
            </button>
          </div>
          <a
            href={
              language === "es" ? "https://time.is/es/" : "https://time.is/"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs md:text-sm text-gray-600 pr-7 hover:text-blue transition-colors cursor-pointer font-mono"
          >
            {currentTime}
          </a>
        </div>

        {/* Layout de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda: Información y pasos */}
          <div className="space-y-8">
            {/* Título y descripción */}
            <div>
              <h2
                className="text-3xl md:text-4xl font-bold mb-4"
                style={{ color: "#331d83" }}
              >
                {t("status.visionTitle") || "TRABAJA CONMIGO"}
              </h2>
              <p className="text-gray-700 text-lg">
                {t("status.visionDescription") ||
                  "¿Tienes un proyecto desafiante, una duda técnica o simplemente quieres expandir tu red? Hablemos."}
              </p>
            </div>

            {/* Pasos del proceso */}
            <div className="space-y-6">
              <div className="flex gap-4">
                <span
                  className="text-2xl font-bold"
                  style={{ color: "#2093c4" }}
                >
                  01
                </span>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">
                    {t("status.step1Title") || "CONTACTO INICIAL"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t("status.step1Description") ||
                      "El contacto se redirigirá a mi correo y analizaré tu mensaje en cuestión de horas."}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span
                  className="text-2xl font-bold"
                  style={{ color: "#2093c4" }}
                >
                  02
                </span>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">
                    {t("status.step2Title") || "DISCOVERY CALL"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t("status.step2Description") ||
                      "Agendamos una reunión de aproximadamente 20 minutos para alinear objetivos y visión."}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <span
                  className="text-2xl font-bold"
                  style={{ color: "#2093c4" }}
                >
                  03
                </span>
                <div>
                  <h3 className="text-gray-900 font-semibold mb-1">
                    {t("status.step3Title") || "PROPUESTA TÉCNICA"}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {t("status.step3Description") ||
                      "Te envío un plan detallado, presupuesto y cronograma real."}
                  </p>
                </div>
              </div>
            </div>

            {/* Contacto directo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "#2093c4" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-gray-900 text-sm font-semibold">
                    {t("status.directEmail") || "CORREO DIRECTO"}
                  </span>
                </div>
                <a
                  href="mailto:carlosvicioso@vixis.dev"
                  className="text-sm hover:underline"
                  style={{ color: "#2093c4" }}
                >
                  carlosvicioso@vixis.dev
                </a>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    className="w-5 h-5"
                    style={{ color: "#2093c4" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <span className="text-gray-900 text-sm font-semibold">
                    {t("status.callWhatsapp") || "WHATSAPP DIRECTO"}
                  </span>
                </div>
                <a
                  href="https://wa.me/16573465912"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                  style={{ color: "#2093c4" }}
                >
                  +1 (657) 3465912
                </a>
              </div>
            </div>

            {/* GIF debajo de los cuadros de contacto */}
            <div className="flex justify-center pt-4">
              <img
                src="https://cdn.vixis.dev/big-bang-1.webp"
                alt="Big Bang Idea"
                className="max-w-full h-auto rounded-lg"
                style={{ maxWidth: "480px", maxHeight: "270px" }}
              />
            </div>
          </div>

          {/* Columna derecha: Agendamiento y Formulario */}
          <div className="space-y-6">
            {/* Opción de videollamada */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(32, 147, 196, 0.1)" }}
                  >
                    <svg
                      className="w-5 h-5"
                      style={{ color: "#2093c4" }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold">
                      {t("status.preferVideocall") ||
                        "¿PREFIERES UNA VIDEOLLAMADA?"}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {t("status.discoveryCall") || "DISCOVERY CALL DE 20 MIN"}
                    </p>
                  </div>
                </div>
                <button
                  className="px-4 py-2 text-white font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2"
                  style={{ backgroundColor: "#2093c4" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1a7ba0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#2093c4";
                  }}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {t("status.scheduleNow") || "AGENDAR AHORA"}
                </button>
              </div>
            </div>

            {/* Separador */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">
                  {t("status.orWriteHere") || "O ESCRÍBEME AQUÍ"}
                </span>
              </div>
            </div>

            {/* Formulario */}
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.identityName") || "IDENTIDAD / NOMBRE"} *
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder={
                      t("status.namePlaceholder") || "Ej. Carlos Vicioso"
                    }
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ focusRingColor: "#331d83" }}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.linkChannelEmail") || "CANAL DE ENLACE / EMAIL"}{" "}
                    *
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder={t("status.emailPlaceholder") || "tu@email.com"}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ focusRingColor: "#331d83" }}
                  />
                  {errors.email && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.mobileFrequencyPhone") ||
                      "FRECUENCIA MÓVIL / TELÉFONO"}
                  </label>
                  <input
                    type="tel"
                    placeholder="+57..."
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ focusRingColor: "#331d83" }}
                  />
                </div>

                {/* Inversión Estimada - Dropdown unificado */}
                <div className="relative investment-dropdown-container">
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.estimatedInvestment") || "INVERSIÓN ESTIMADA"} *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowInvestmentDropdown(!showInvestmentDropdown)
                      }
                      className="w-full px-4 py-2 bg-white border-2 rounded-lg text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-between"
                      style={{
                        borderColor: "#2093c4",
                        focusRingColor: "#331d83",
                      }}
                    >
                      <span
                        className={
                          selectedRange ? "text-gray-900" : "text-gray-500"
                        }
                      >
                        {selectedRange
                          ? selectedRangeLabel
                          : t("status.selectRange")}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          showInvestmentDropdown ? "rotate-180" : ""
                        }`}
                        style={{ color: "#2093c4" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showInvestmentDropdown && (
                      <div
                        ref={investmentDropdownRef}
                        className="absolute z-10 w-full mt-2 bg-white border-2 rounded-lg overflow-hidden shadow-lg"
                        style={{ borderColor: "#2093c4" }}
                      >
                        {/* Selector de divisa */}
                        <div className="flex border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCurrency("COP");
                              setValue("currency", "COP");
                              setValue("investmentRange", "");
                            }}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                              selectedCurrency === "COP"
                                ? "text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                            style={
                              selectedCurrency === "COP"
                                ? { backgroundColor: "#2093c4" }
                                : {}
                            }
                          >
                            {t("status.currencyCOP") || "COP"} (
                            {t("status.pesos") || "PESOS"})
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCurrency("USD");
                              setValue("currency", "USD");
                              setValue("investmentRange", "");
                            }}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
                              selectedCurrency === "USD"
                                ? "text-white"
                                : "text-gray-600 hover:bg-gray-100"
                            }`}
                            style={
                              selectedCurrency === "USD"
                                ? { backgroundColor: "#2093c4" }
                                : {}
                            }
                          >
                            {t("status.currencyUSD") || "USD"} (
                            {t("status.dollars") || "DÓLAR"})
                          </button>
                        </div>
                        {/* Opciones de rango */}
                        <div className="max-h-60 overflow-y-auto">
                          {investmentRanges[selectedCurrency].map((range) => (
                            <button
                              key={range.value}
                              type="button"
                              onClick={() => {
                                setValue("investmentRange", range.value);
                                setShowInvestmentDropdown(false);
                              }}
                              className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 transition-colors text-sm"
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input type="hidden" {...register("currency")} />
                  <input type="hidden" {...register("investmentRange")} />
                  {errors.investmentRange && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.investmentRange.message}
                    </p>
                  )}
                </div>

                {/* Tipo de Petición - Dropdown animado */}
                <div className="relative request-type-dropdown-container">
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.type") || "TIPO"} *
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowRequestTypeDropdown(!showRequestTypeDropdown)
                      }
                      className="w-full px-4 py-2 bg-white border-2 rounded-lg text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-between"
                      style={{
                        borderColor: watch("requestType")
                          ? "#2093c4"
                          : "#d1d5db",
                        focusRingColor: "#331d83",
                      }}
                    >
                      <span
                        className={
                          watch("requestType")
                            ? "text-gray-900"
                            : "text-gray-500"
                        }
                      >
                        {watch("requestType")
                          ? watch("requestType") === "job"
                            ? t("status.jobOffer")
                            : watch("requestType") === "collaboration"
                            ? t("status.collaboration")
                            : watch("requestType") === "consultation"
                            ? t("status.project")
                            : t("status.other")
                          : t("status.typePlaceholder")}
                      </span>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          showRequestTypeDropdown ? "rotate-180" : ""
                        }`}
                        style={{ color: "#2093c4" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {showRequestTypeDropdown && (
                      <div
                        ref={requestTypeDropdownRef}
                        className="absolute z-10 w-full mt-2 bg-white border-2 rounded-lg overflow-hidden shadow-lg"
                        style={{ borderColor: "#2093c4" }}
                      >
                        {[
                          { value: "job", label: t("status.jobOffer") },
                          {
                            value: "collaboration",
                            label: t("status.collaboration"),
                          },
                          { value: "consultation", label: t("status.project") },
                          { value: "other", label: t("status.other") },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setValue("requestType", option.value as any);
                              setShowRequestTypeDropdown(false);
                            }}
                            className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100 transition-colors text-sm"
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <input type="hidden" {...register("requestType")} />
                  </div>
                  {errors.requestType && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.requestType.message}
                    </p>
                  )}
                </div>

                {/* Brief del Proyecto / Mensaje */}
                <div>
                  <label className="block text-gray-900 text-sm font-medium mb-2">
                    {t("status.message") || "Brief del Proyecto / Mensaje"} *
                  </label>
                  <Textarea
                    {...register("message")}
                    placeholder={
                      t("status.messagePlaceholder") || "Describe tu visión..."
                    }
                    rows={4}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none"
                    style={{ focusRingColor: "#331d83" }}
                  />
                  {errors.message && (
                    <p className="text-red-600 text-xs mt-1">
                      {errors.message.message}
                    </p>
                  )}
                </div>

                {/* Botón de envío y aviso de seguridad - Ajustado con mejor distribución */}
                <div className="flex items-end gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 text-white font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ backgroundColor: "#2093c4" }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = "#1a7ba0";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.backgroundColor = "#2093c4";
                      }
                    }}
                  >
                    {isSubmitting
                      ? t("common.loading")
                      : t("status.sendProposal") || "Enviar Propuesta"}
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </button>
                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-1">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs">
                      {t("status.encryptionNotice")}
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Status;
