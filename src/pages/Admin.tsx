import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { optimizeAndUpload } from "../lib/storage-functions";
import NotFound from "./NotFound";
import { useTranslation } from "../lib/i18n";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  getSocials,
  createSocial,
  updateSocial,
  deleteSocial,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  calculatePricing,
  extractEventData,
  getWorkExperiences,
  createWorkExperience,
  updateWorkExperience,
  deleteWorkExperience,
  getTechnologies,
  createTechnology,
  updateTechnology,
  deleteTechnology,
  getStudies,
  createStudy,
  updateStudy,
  deleteStudy,
} from "../lib/supabase-functions";

function Admin() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados para gestión de recursos multimedia
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<
    | "product-thumbnails"
    | "product-images"
    | "event-thumbnails"
    | "general-assets"
  >("general-assets");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Estados para CRUD
  const [activeTab, setActiveTab] = useState<
    | "products"
    | "projects"
    | "clients"
    | "testimonials"
    | "socials"
    | "events"
    | "work_experiences"
    | "technologies"
    | "studies"
  >("products");
  const [products, setProducts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [socials, setSocials] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [workExperiences, setWorkExperiences] = useState<any[]>([]);
  const [technologies, setTechnologies] = useState<any[]>([]);
  const [studies, setStudies] = useState<any[]>([]);
  const [loadingCRUD, setLoadingCRUD] = useState(false);
  const [showCRUDModal, setShowCRUDModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [crudFormData, setCrudFormData] = useState<any>({});
  const [extractingEventData, setExtractingEventData] = useState(false);
  const [eventUrl, setEventUrl] = useState("");

  // Verificar key de autenticación
  useEffect(() => {
    const key = searchParams.get("key");
    const validKey = import.meta.env.VITE_ADMIN_KEY; // Variable de entorno desde Doppler

    if (!validKey) {
      console.error(
        "VITE_ADMIN_KEY no está configurada en las variables de entorno"
      );
      alert("Error de configuración: VITE_ADMIN_KEY no está definida");
      return;
    }

    if (key === validKey) {
      setIsAuthenticated(true);
    }
  }, [searchParams]);

  // Animación de entrada
  useEffect(() => {
    if (isAuthenticated && containerRef.current) {
      const elements = containerRef.current.querySelectorAll(".admin-card");
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.1,
          ease: "power2.out",
        }
      );
    }
  }, [isAuthenticated]);

  // Cargar datos CRUD
  useEffect(() => {
    if (isAuthenticated) {
      loadCRUDData();
    }
  }, [isAuthenticated, activeTab]);

  // Cargar clientes cuando se selecciona el tab de testimonios (para el selector)
  useEffect(() => {
    if (
      isAuthenticated &&
      activeTab === "testimonials" &&
      clients.length === 0
    ) {
      getClients().catch(console.error);
    }
  }, [isAuthenticated, activeTab]);

  // Permitir scroll del body incluso cuando el modal está abierto
  // El modal tiene su propio scroll interno

  const loadCRUDData = async () => {
    setLoadingCRUD(true);
    try {
      switch (activeTab) {
        case "products":
          const productsData = await getProducts();
          setProducts(productsData || []);
          break;
        case "projects":
          const projectsData = await getProjects();
          setProjects(projectsData || []);
          break;
        case "clients":
          const clientsData = await getClients();
          setClients(clientsData || []);
          break;
        case "testimonials":
          const testimonialsData = await getTestimonials();
          setTestimonials(testimonialsData || []);
          break;
        case "socials":
          const socialsData = await getSocials();
          setSocials(socialsData || []);
          break;
        case "events":
          const eventsData = await getEvents();
          setEvents(eventsData || []);
          break;
        case "work_experiences":
          const workExperiencesData = await getWorkExperiences();
          setWorkExperiences(workExperiencesData || []);
          break;
        case "technologies":
          const technologiesData = await getTechnologies();
          setTechnologies(technologiesData || []);
          break;
        case "studies":
          const studiesData = await getStudies();
          setStudies(studiesData || []);
          break;
      }
    } catch (error) {
      // Solo loggear el error, no mostrar alerta
      console.error(`Error al cargar ${activeTab}:`, error);
      // Inicializar arrays vacíos si hay error
      switch (activeTab) {
        case "products":
          setProducts([]);
          break;
        case "projects":
          setProjects([]);
          break;
        case "clients":
          setClients([]);
          break;
        case "testimonials":
          setTestimonials([]);
          break;
        case "socials":
          setSocials([]);
          break;
        case "events":
          setEvents([]);
          break;
        case "work_experiences":
          setWorkExperiences([]);
          break;
        case "technologies":
          setTechnologies([]);
          break;
        case "studies":
          setStudies([]);
          break;
      }
    } finally {
      setLoadingCRUD(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    // Inicializar valores por defecto según el tab activo
    const defaultFormData: any = {};
    if (activeTab === "studies") {
      defaultFormData.status = "completed";
    } else if (activeTab === "work_experiences") {
      defaultFormData.status = "past";
      defaultFormData.type = "full-time";
      defaultFormData.responsibilities = "[]";
      defaultFormData.technologies = "[]";
    } else if (activeTab === "technologies") {
      defaultFormData.level = "beginner";
      defaultFormData.category = "other";
    }
    setCrudFormData(defaultFormData);
    setEventUrl("");
    setShowCRUDModal(true);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    // Convertir USD a COP para productos al editar
    const copToUsdRate = 4000;
    const formData = { ...item };
    if (activeTab === "products" && item.base_price_usd) {
      formData.base_price_cop = item.base_price_usd * copToUsdRate;
    }
    // Para testimonios, usar el ID del cliente como client_id
    if (activeTab === "testimonials") {
      formData.client_id = item.id;
    }
    // Para work_experiences, convertir arrays a JSON strings para el textarea
    if (activeTab === "work_experiences") {
      if (Array.isArray(item.responsibilities)) {
        formData.responsibilities = JSON.stringify(
          item.responsibilities,
          null,
          2
        );
      }
      if (Array.isArray(item.technologies)) {
        formData.technologies = JSON.stringify(item.technologies, null, 2);
      }
    }
    setCrudFormData(formData);
    setEventUrl(item.passline_url || "");
    setShowCRUDModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este elemento?"))
      return;

    try {
      switch (activeTab) {
        case "products":
          await deleteProduct(id);
          break;
        case "projects":
          await deleteProject(id);
          break;
        case "clients":
          await deleteClient(id);
          break;
        case "testimonials":
          await deleteTestimonial(id);
          break;
        case "socials":
          await deleteSocial(id);
          break;
        case "events":
          await deleteEvent(id);
          break;
        case "work_experiences":
          await deleteWorkExperience(id);
          break;
        case "technologies":
          await deleteTechnology(id);
          break;
        case "studies":
          await deleteStudy(id);
          break;
      }
      await loadCRUDData();
      alert(t("admin.deleteSuccess"));
    } catch (error) {
      alert(
        `${t("admin.errorDeleting")}: ${
          error instanceof Error ? error.message : t("admin.errorUnknown")
        }`
      );
    }
  };

  const handleExtractEventData = async () => {
    if (!eventUrl.trim()) {
      alert(t("admin.pleaseEnterUrl"));
      return;
    }

    setExtractingEventData(true);
    try {
      const result = await extractEventData(eventUrl.trim());
      if (result && result.success && result.data) {
        const extractedData = result.data;
        // Rellenar el formulario con los datos extraídos
        setCrudFormData({
          ...crudFormData,
          title: extractedData.title || "",
          date: extractedData.date || "",
          description: extractedData.description || "",
          passline_url: eventUrl.trim(),
          thumbnail_url: extractedData.thumbnail_url || "",
        });
        alert(
          `Datos extraídos exitosamente desde ${
            extractedData.platform || "la plataforma"
          }`
        );
      } else {
        alert(
          "No se pudieron extraer datos del evento. Por favor, completa el formulario manualmente."
        );
      }
    } catch (error) {
      console.error("Error al extraer datos del evento:", error);
      alert(
        `Error al extraer datos: ${
          error instanceof Error ? error.message : "Error desconocido"
        }\n\nPuedes completar el formulario manualmente.`
      );
    } finally {
      setExtractingEventData(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingItem) {
        // Actualizar
        switch (activeTab) {
          case "products":
            // Convertir COP a USD si se está actualizando el precio
            const copToUsdRate = 4000;
            const updateProductData = { ...crudFormData };
            if (updateProductData.base_price_cop !== undefined) {
              updateProductData.base_price_usd =
                updateProductData.base_price_cop / copToUsdRate;
              delete updateProductData.base_price_cop;
            }
            await updateProduct(editingItem.id, updateProductData);
            break;
          case "projects":
            await updateProject(editingItem.id, crudFormData);
            break;
          case "clients":
            await updateClient(editingItem.id, crudFormData);
            break;
          case "testimonials":
            await updateTestimonial(editingItem.id, crudFormData);
            break;
          case "socials":
            await updateSocial(editingItem.id, crudFormData);
            break;
          case "events":
            await updateEvent(editingItem.id, crudFormData);
            break;
          case "work_experiences":
            // Parsear JSON arrays si vienen como strings
            const workExpData = { ...crudFormData };
            if (typeof workExpData.responsibilities === "string") {
              try {
                workExpData.responsibilities = JSON.parse(
                  workExpData.responsibilities
                );
              } catch (e) {
                // Si falla, intentar como array separado por comas
                workExpData.responsibilities = workExpData.responsibilities
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0);
              }
            }
            if (typeof workExpData.technologies === "string") {
              try {
                workExpData.technologies = JSON.parse(workExpData.technologies);
              } catch (e) {
                workExpData.technologies = workExpData.technologies
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0);
              }
            }
            await updateWorkExperience(editingItem.id, workExpData);
            break;
          case "technologies":
            await updateTechnology(editingItem.id, crudFormData);
            break;
          case "studies":
            await updateStudy(editingItem.id, crudFormData);
            break;
        }
      } else {
        // Crear
        switch (activeTab) {
          case "products":
            // Convertir COP a USD (tasa aproximada: 1 USD = 4000 COP)
            // El usuario puede ajustar esta tasa si es necesario
            const copToUsdRate = 4000; // 1 USD = 4000 COP
            const productData = {
              ...crudFormData,
              base_price_usd: crudFormData.base_price_cop
                ? crudFormData.base_price_cop / copToUsdRate
                : 0,
            };
            // Eliminar base_price_cop del objeto antes de enviar
            delete productData.base_price_cop;
            await createProduct(productData);
            break;
          case "projects":
            await createProject(crudFormData);
            break;
          case "clients":
            await createClient(crudFormData);
            break;
          case "testimonials":
            await createTestimonial(crudFormData);
            break;
          case "socials":
            await createSocial(crudFormData);
            break;
          case "events":
            await createEvent({
              ...crudFormData,
              passline_url: crudFormData.passline_url || eventUrl,
            });
            break;
          case "work_experiences":
            // Parsear JSON arrays si vienen como strings
            const newWorkExpData = { ...crudFormData };
            if (typeof newWorkExpData.responsibilities === "string") {
              try {
                newWorkExpData.responsibilities = JSON.parse(
                  newWorkExpData.responsibilities
                );
              } catch (e) {
                // Si falla, intentar como array separado por comas
                newWorkExpData.responsibilities =
                  newWorkExpData.responsibilities
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
              }
            }
            if (typeof newWorkExpData.technologies === "string") {
              try {
                newWorkExpData.technologies = JSON.parse(
                  newWorkExpData.technologies
                );
              } catch (e) {
                newWorkExpData.technologies = newWorkExpData.technologies
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter((s: string) => s.length > 0);
              }
            }
            await createWorkExperience(newWorkExpData);
            break;
          case "technologies":
            await createTechnology(crudFormData);
            break;
          case "studies":
            // Asegurar que status siempre tenga un valor
            const studyData = {
              ...crudFormData,
              status: crudFormData.status || "completed",
            };
            await createStudy(studyData);
            break;
        }
      }
      await loadCRUDData();
      setShowCRUDModal(false);
      setEditingItem(null);
      setCrudFormData({});
      alert(
        editingItem
          ? "Elemento actualizado exitosamente"
          : "Elemento creado exitosamente"
      );
    } catch (error) {
      alert(
        `Error al guardar: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  };

  const generatePricingLink = async (
    productId: string,
    targetCurrency: string,
    region: string
  ) => {
    try {
      const pricing = await calculatePricing({
        product_id: productId,
        base_currency: "USD",
        target_currency: targetCurrency,
        region: region,
        quantity: 1,
      });
      // Aquí construirías el link de Airtm o el servicio que uses
      // Por ahora retornamos un placeholder
      return `https://airtm.com/send?amount=${pricing.final_price}&currency=${targetCurrency}`;
    } catch (error) {
      throw new Error(
        `Error al generar pricing link: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`
      );
    }
  };

  if (!isAuthenticated) {
    return <NotFound />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-12 md:py-20 px-2 md:px-4"
      style={{ "--blue-color": "#2093c4" } as React.CSSProperties}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header estilo Jarvis */}
        <div className="text-center mb-8 md:mb-12">
          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-3 md:mb-4"
            style={{
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "#2093c4",
              textShadow: "0 0 40px rgba(32, 147, 196, 0.5)",
            }}
          >
            JARVIS
          </h1>
          <p className="text-gray-300 text-base md:text-lg font-bold">
            {t("admin.title")} - Vixis Portfolio
          </p>
          <div className="mt-3 md:mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400 text-xs md:text-sm">
              Sistema Operativo
            </span>
          </div>
        </div>

        {/* Plataformas externas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Analíticas */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
              Analíticas
            </h2>
            <div className="space-y-3">
              <a
                href="https://plausible.io"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-purple-500/20"
                style={{
                  backgroundColor: "rgba(139, 92, 246, 0.2)",
                  borderColor: "rgba(139, 92, 246, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(139, 92, 246, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(139, 92, 246, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
                }}
              >
                Plausible.io →
              </a>
              <a
                href="https://search.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
                style={{
                  backgroundColor: "rgba(59, 130, 246, 0.2)",
                  borderColor: "rgba(59, 130, 246, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(59, 130, 246, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(59, 130, 246, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
                }}
              >
                Google Search Console →
              </a>
              <a
                href="https://www.bing.com/webmasters/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20"
                style={{
                  backgroundColor: "rgba(234, 179, 8, 0.2)",
                  borderColor: "rgba(234, 179, 8, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(234, 179, 8, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(234, 179, 8, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(234, 179, 8, 0.2)";
                  e.currentTarget.style.borderColor = "rgba(234, 179, 8, 0.3)";
                }}
              >
                Bing Webmasters →
              </a>
            </div>
          </div>

          {/* Logs - Logtail */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
              Logs
            </h2>
            <a
              href="https://logtail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                borderColor: "rgba(59, 130, 246, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(59, 130, 246, 0.3)";
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(59, 130, 246, 0.2)";
                e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
              }}
            >
              Ver en Logtail →
            </a>
          </div>

          {/* UX Research - Hotjar */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
              UX Research
            </h2>
            <a
              href="https://insights.hotjar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-pink-500/20"
              style={{
                backgroundColor: "rgba(236, 72, 153, 0.2)",
                borderColor: "rgba(236, 72, 153, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(236, 72, 153, 0.3)";
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(236, 72, 153, 0.2)";
                e.currentTarget.style.borderColor = "rgba(236, 72, 153, 0.3)";
              }}
            >
              Ver en Hotjar →
            </a>
          </div>

          {/* Estado del Proyecto - Better Uptime */}
          <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-3 md:mb-4">
              Estado del Proyecto
            </h2>
            <a
              href="https://betteruptime.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-6 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-white rounded-lg transition-all duration-300 cursor-pointer text-center font-semibold hover:scale-105 hover:shadow-lg hover:shadow-green-500/20"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                borderColor: "rgba(34, 197, 94, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(34, 197, 94, 0.3)";
                e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(34, 197, 94, 0.2)";
                e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.3)";
              }}
            >
              Ver en Better Uptime →
            </a>
          </div>
        </div>

        {/* Botón de Recursos Multimedia */}
        <div className="mb-8">
          <button
            onClick={() => setShowMediaManager(!showMediaManager)}
            className="px-6 py-3 bg-cyan/20 hover:bg-cyan/30 rounded-lg border border-cyan/30 text-white transition-colors cursor-pointer font-semibold"
          >
            {showMediaManager ? "Ocultar" : "Mostrar"} recursos multimedia
          </button>
        </div>

        {/* Sección CRUD */}
        <div className="admin-card bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 border border-white/20 mt-6 md:mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-6">
            <div className="flex-1 w-full">
              <button
                onClick={handleCreate}
                className="w-full sm:w-auto px-3 md:px-4 py-2 text-sm md:text-base bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-white rounded-lg transition-colors cursor-pointer mb-3 md:mb-4"
              >
                + {t("admin.createNew")}
              </button>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {t("admin.contentManagement")}
              </h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 md:gap-2 mb-4 md:mb-6 border-b border-white/20 overflow-x-auto">
            {(
              [
                "products",
                "projects",
                "clients",
                "testimonials",
                "socials",
                "events",
                "work_experiences",
                "technologies",
                "studies",
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 md:px-4 py-1 md:py-2 text-xs md:text-base font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? "text-white border-b-2"
                    : "text-gray-400 hover:text-white"
                }`}
                style={
                  activeTab === tab
                    ? { borderBottomColor: "#2093c4" }
                    : undefined
                }
              >
                {tab === "products" && t("admin.products")}
                {tab === "projects" && t("admin.projects")}
                {tab === "clients" && t("admin.clients")}
                {tab === "testimonials" && t("admin.testimonials")}
                {tab === "socials" && t("admin.socials")}
                {tab === "events" && t("admin.events")}
                {tab === "work_experiences" && t("admin.workExperiences")}
                {tab === "technologies" && t("admin.technologies")}
                {tab === "studies" && t("admin.studies")}
              </button>
            ))}
          </div>

          {/* Lista de items */}
          {loadingCRUD ? (
            <div className="text-center py-8 text-gray-400">
              {t("common.loading")}
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
              {(activeTab === "products"
                ? products
                : activeTab === "projects"
                ? projects
                : activeTab === "clients"
                ? clients
                : activeTab === "testimonials"
                ? testimonials
                : activeTab === "socials"
                ? socials
                : activeTab === "events"
                ? events
                : activeTab === "work_experiences"
                ? workExperiences
                : activeTab === "technologies"
                ? technologies
                : studies
              ).map((item: any) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 p-3 md:p-4 bg-black/20 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm md:text-base truncate">
                      {activeTab === "testimonials"
                        ? item.name || item.title || t("admin.noClient")
                        : item.title || item.name}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm line-clamp-2">
                      {activeTab === "events"
                        ? item.date
                          ? new Date(item.date).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          : item.passline_url || t("admin.noDate")
                        : activeTab === "testimonials"
                        ? item.testimonial_content
                          ? item.testimonial_content.length > 50
                            ? item.testimonial_content.substring(0, 50) + "..."
                            : item.testimonial_content
                          : t("admin.noTestimonial")
                        : item.description ||
                          item.url ||
                          t("admin.noDescription")}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleEdit(item)}
                      className="flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-white rounded transition-colors cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="flex-1 sm:flex-none px-2 md:px-3 py-1 text-xs md:text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-white rounded transition-colors cursor-pointer"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </div>
              ))}
              {(activeTab === "products"
                ? products
                : activeTab === "projects"
                ? projects
                : activeTab === "clients"
                ? clients
                : activeTab === "testimonials"
                ? testimonials
                : activeTab === "socials"
                ? socials
                : activeTab === "events"
                ? events
                : activeTab === "work_experiences"
                ? workExperiences
                : activeTab === "technologies"
                ? technologies
                : studies
              ).length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  {activeTab === "products" && (
                    <p className="text-lg mb-2">{t("admin.noProducts")}</p>
                  )}
                  {activeTab === "projects" && (
                    <p className="text-lg mb-2">{t("admin.noProjects")}</p>
                  )}
                  {activeTab === "clients" && (
                    <p className="text-lg mb-2">{t("admin.noClients")}</p>
                  )}
                  {activeTab === "testimonials" && (
                    <p className="text-lg mb-2">{t("admin.noTestimonials")}</p>
                  )}
                  {activeTab === "socials" && (
                    <p className="text-lg mb-2">{t("admin.noSocials")}</p>
                  )}
                  {activeTab === "events" && (
                    <p className="text-lg mb-2">{t("admin.noEvents")}</p>
                  )}
                  {activeTab === "work_experiences" && (
                    <p className="text-lg mb-2">
                      {t("admin.noWorkExperiences")}
                    </p>
                  )}
                  {activeTab === "technologies" && (
                    <p className="text-lg mb-2">{t("admin.noTechnologies")}</p>
                  )}
                  {activeTab === "studies" && (
                    <p className="text-lg mb-2">{t("admin.noStudies")}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {t("admin.createNewToStart")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Gestión de Recursos Multimedia */}
        {showMediaManager && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowMediaManager(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setUploadedUrl(null);
                setUploadProgress(0);
              }
            }}
          >
            <div className="admin-card bg-gray-900 rounded-lg p-4 md:p-6 border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  Gestión de recursos multimedia
                </h2>
                <button
                  onClick={() => {
                    setShowMediaManager(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setUploadedUrl(null);
                    setUploadProgress(0);
                  }}
                  className="text-gray-400 hover:text-white text-2xl cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* Selector de bucket */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-2">
                  Tipo de Recurso:
                </label>
                <select
                  value={selectedBucket}
                  onChange={(e) =>
                    setSelectedBucket(e.target.value as typeof selectedBucket)
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                >
                  <option value="product-thumbnails">
                    Thumbnails de Productos
                  </option>
                  <option value="product-images">Imágenes de Productos</option>
                  <option value="event-thumbnails">
                    Thumbnails de Eventos
                  </option>
                  <option value="general-assets">Assets Generales</option>
                </select>
              </div>

              {/* Input de archivo */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm mb-2">
                  Seleccionar Archivo:
                </label>
                <input
                  type="file"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                      setUploadedUrl(null);
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold cursor-pointer"
                  style={{
                    // @ts-ignore
                    "--file-bg": "rgba(32, 147, 196, 0.2)",
                    "--file-text": "rgba(32, 147, 196, 0.8)",
                    "--file-hover": "rgba(32, 147, 196, 0.3)",
                  }}
                />
              </div>

              {/* Preview */}
              {previewUrl && selectedFile && (
                <div className="mb-4">
                  <label className="block text-gray-300 text-sm mb-2">
                    Vista Previa:
                  </label>
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    {selectedFile.type.startsWith("image/") ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-64 mx-auto rounded-lg"
                      />
                    ) : selectedFile.type.startsWith("video/") ? (
                      <video
                        src={previewUrl}
                        controls
                        className="max-w-full max-h-64 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        📄 {selectedFile.name}
                      </div>
                    )}
                    <p className="text-gray-400 text-xs mt-2 text-center">
                      {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  </div>
                </div>
              )}

              {/* Botón de subida */}
              <button
                onClick={async () => {
                  if (!selectedFile) {
                    alert("Por favor, selecciona un archivo");
                    return;
                  }

                  try {
                    setUploading(true);
                    setUploadProgress(0);

                    // Simular progreso
                    const progressInterval = setInterval(() => {
                      setUploadProgress((prev) => {
                        if (prev >= 90) {
                          clearInterval(progressInterval);
                          return 90;
                        }
                        return prev + 10;
                      });
                    }, 200);

                    const url = await optimizeAndUpload(
                      selectedFile,
                      selectedBucket,
                      true
                    );

                    clearInterval(progressInterval);
                    setUploadProgress(100);

                    if (url) {
                      setUploadedUrl(url);
                      // Copiar URL al clipboard
                      await navigator.clipboard.writeText(url);
                      alert(
                        "¡Archivo subido exitosamente! URL copiada al portapapeles."
                      );
                    } else {
                      throw new Error("No se pudo obtener la URL del archivo");
                    }
                  } catch (error) {
                    console.error("Error al subir:", error);
                    alert(
                      `Error al subir archivo: ${
                        error instanceof Error
                          ? error.message
                          : "Error desconocido"
                      }`
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={!selectedFile || uploading}
                className="w-full text-white py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold cursor-pointer"
                style={{
                  backgroundColor: "rgba(32, 147, 196, 0.2)",
                  borderColor: "rgba(32, 147, 196, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(32, 147, 196, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(32, 147, 196, 0.2)";
                }}
              >
                {uploading
                  ? `Subiendo... ${uploadProgress}%`
                  : "Optimizar y Subir"}
              </button>

              {/* Barra de progreso */}
              {uploading && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                        backgroundColor: "#2093c4",
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* URL subida */}
              {uploadedUrl && (
                <div className="mt-4 p-4 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-green-300 text-sm mb-2 font-semibold">
                    ✓ Archivo subido exitosamente
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={uploadedUrl}
                      readOnly
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs"
                    />
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(uploadedUrl);
                        alert("URL copiada al portapapeles");
                      }}
                      className="text-white px-4 py-2 rounded-lg text-sm cursor-pointer"
                      style={{
                        backgroundColor: "rgba(32, 147, 196, 0.2)",
                        borderColor: "rgba(32, 147, 196, 0.3)",
                        borderWidth: "1px",
                        borderStyle: "solid",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(32, 147, 196, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(32, 147, 196, 0.2)";
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal CRUD */}
        {showCRUDModal && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCRUDModal(false);
                setEditingItem(null);
                setCrudFormData({});
              }
            }}
          >
            <div className="admin-card bg-gray-900 rounded-lg p-4 md:p-6 border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xl md:text-2xl font-bold text-white">
                  {activeTab === "products"
                    ? editingItem
                      ? t("admin.editProduct")
                      : t("admin.createProduct")
                    : activeTab === "projects"
                    ? editingItem
                      ? t("admin.editProject")
                      : t("admin.createProject")
                    : activeTab === "clients"
                    ? editingItem
                      ? t("admin.editClient")
                      : t("admin.createClient")
                    : activeTab === "testimonials"
                    ? editingItem
                      ? t("admin.editTestimonial")
                      : t("admin.createTestimonial")
                    : activeTab === "socials"
                    ? editingItem
                      ? t("admin.editSocial")
                      : t("admin.createSocial")
                    : activeTab === "events"
                    ? editingItem
                      ? t("admin.editEvent")
                      : t("admin.createEvent")
                    : activeTab === "work_experiences"
                    ? editingItem
                      ? t("admin.editWorkExperience")
                      : t("admin.createWorkExperience")
                    : activeTab === "technologies"
                    ? editingItem
                      ? t("admin.editTechnology")
                      : t("admin.createTechnology")
                    : editingItem
                    ? t("admin.editStudy")
                    : t("admin.createStudy")}
                </h2>
                <button
                  onClick={() => {
                    setShowCRUDModal(false);
                    setEditingItem(null);
                    setCrudFormData({});
                  }}
                  className="text-gray-400 hover:text-white text-2xl cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Campos comunes y específicos según el tab */}
                {activeTab === "products" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")}
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldFullDescription")}
                      </label>
                      <textarea
                        value={crudFormData.full_description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            full_description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={5}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldBasePrice")} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={crudFormData.base_price_cop || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            base_price_cop: parseFloat(e.target.value),
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldThumbnailUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.thumbnail_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            thumbnail_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldActionType")}
                      </label>
                      <select
                        value={crudFormData.action_type || "link"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            action_type: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      >
                        <option value="link">
                          {t("admin.actionTypeLink")}
                        </option>
                        <option value="submit">
                          {t("admin.actionTypeSubmit")}
                        </option>
                        <option value="schedule">
                          {t("admin.actionTypeSchedule")}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldActionUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.action_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            action_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldPricingLink")}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={crudFormData.pricing_link || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              pricing_link: e.target.value,
                            })
                          }
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        />
                        {editingItem && (
                          <button
                            onClick={async () => {
                              try {
                                const link = await generatePricingLink(
                                  editingItem.id,
                                  "COP",
                                  "Colombia"
                                );
                                setCrudFormData({
                                  ...crudFormData,
                                  pricing_link: link,
                                });
                              } catch (error) {
                                alert(
                                  `Error: ${
                                    error instanceof Error
                                      ? error.message
                                      : "Error desconocido"
                                  }`
                                );
                              }
                            }}
                            className="px-4 py-2 text-white rounded-lg text-sm cursor-pointer"
                            style={{
                              backgroundColor: "rgba(32, 147, 196, 0.2)",
                              borderColor: "rgba(32, 147, 196, 0.3)",
                              borderWidth: "1px",
                              borderStyle: "solid",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(32, 147, 196, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "rgba(32, 147, 196, 0.2)";
                            }}
                          >
                            {t("admin.generateLink")}
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Texto del Botón
                      </label>
                      <input
                        type="text"
                        value={crudFormData.button_text || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            button_text: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder={t("admin.buttonTextPlaceholder")}
                      />
                    </div>
                  </>
                )}

                {activeTab === "projects" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldUrl")} *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldRepository")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.repository || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            repository: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          {t("admin.fieldMonth")} *
                        </label>
                        <input
                          type="text"
                          value={crudFormData.month || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              month: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          {t("admin.fieldYear")} *
                        </label>
                        <input
                          type="number"
                          value={crudFormData.year || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              year: parseInt(e.target.value),
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldThumbnailUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.thumbnail || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            thumbnail: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-gray-300 text-sm">
                        <input
                          type="checkbox"
                          checked={crudFormData.is_special || false}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              is_special: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        {t("projects.special")}
                      </label>
                    </div>
                  </>
                )}

                {activeTab === "clients" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldLogo")} *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.logo || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            logo: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Descripción *
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldUrl")} *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                  </>
                )}

                {activeTab === "testimonials" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.clients")} *
                      </label>
                      <select
                        value={crudFormData.client_id || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            client_id: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        disabled={!!editingItem}
                      >
                        <option value="">{t("common.selectOption")}</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}
                          </option>
                        ))}
                      </select>
                      {editingItem && (
                        <p className="text-xs text-gray-500 mt-1">
                          {t("admin.clientCannotChange")}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialContent")} *
                      </label>
                      <textarea
                        value={crudFormData.testimonial_content || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_content: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={4}
                        placeholder="Ej: 'Excelente trabajo, muy profesional...'"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialAuthor")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_author || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_author: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Juan Pérez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialRole")}
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_role || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_role: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: CEO, Director de Marketing"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialUrl")} ({t("common.optional")}
                        )
                      </label>
                      <input
                        type="url"
                        value={crudFormData.testimonial_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}

                {activeTab === "socials" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} *
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldLogo")} *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.logo || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            logo: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldUrl")} *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldThumbnailUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.image || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            image: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCategory")}
                      </label>
                      <input
                        type="text"
                        value={crudFormData.category || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            category: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Desarrollo, Profesional, Social"
                      />
                    </div>
                  </>
                )}

                {activeTab === "events" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.eventUrl")} *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={eventUrl}
                          onChange={(e) => setEventUrl(e.target.value)}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          placeholder="https://www.passline.com/view-event/testixis o https://www.start.gg/tournament/..."
                          disabled={extractingEventData}
                        />
                        <button
                          type="button"
                          onClick={handleExtractEventData}
                          disabled={extractingEventData || !eventUrl.trim()}
                          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {extractingEventData
                            ? t("common.loading")
                            : t("admin.extractEventData")}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {t("admin.supportsEventPlatforms")}
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        placeholder="Se llenará automáticamente al extraer datos"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.eventDate")} *
                      </label>
                      <input
                        type="date"
                        value={crudFormData.date || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            date: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")}
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        placeholder="Se llenará automáticamente al extraer datos"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldThumbnailUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.thumbnail_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            thumbnail_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Se llenará automáticamente al extraer datos"
                      />
                    </div>
                  </>
                )}

                {activeTab === "work_experiences" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Posición/Cargo *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.position || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            position: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCompany")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.company || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            company: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCompanyUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.company_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            company_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCompanyLogo")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.company_logo || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            company_logo: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldLocation")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.location || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            location: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Bogotá, Colombia"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Fecha de Inicio * (YYYY-MM)
                        </label>
                        <input
                          type="text"
                          value={crudFormData.start_date || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              start_date: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          placeholder="2023-01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          {t("admin.fieldEndDate")} (YYYY-MM) -{" "}
                          {t("admin.leaveEmptyIfCurrent")}
                        </label>
                        <input
                          type="text"
                          value={crudFormData.end_date || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              end_date: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          placeholder="2024-12"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Descripción *
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Responsabilidades (JSON Array) *
                      </label>
                      <textarea
                        value={crudFormData.responsibilities || "[]"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            responsibilities: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-mono text-sm"
                        rows={5}
                        placeholder='["Responsabilidad 1", "Responsabilidad 2", ...]'
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Formato JSON: ["Item 1", "Item 2", "Item 3"]
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Tecnologías (JSON Array) *
                      </label>
                      <textarea
                        value={crudFormData.technologies || "[]"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            technologies: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-mono text-sm"
                        rows={5}
                        placeholder='["TypeScript", "React", "Node.js", ...]'
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Formato JSON: ["Tech 1", "Tech 2", "Tech 3"]
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Tipo *
                        </label>
                        <select
                          value={crudFormData.type || "full-time"}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              type: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                        >
                          <option value="full-time">Tiempo Completo</option>
                          <option value="part-time">Medio Tiempo</option>
                          <option value="contract">Contrato</option>
                          <option value="freelance">Freelance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Estado *
                        </label>
                        <select
                          value={crudFormData.status || "past"}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              status: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                        >
                          <option value="past">Pasado</option>
                          <option value="current">Actual</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === "technologies" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Categoría *
                      </label>
                      <select
                        value={crudFormData.category || "other"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            category: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="language">Lenguaje</option>
                        <option value="framework">Framework</option>
                        <option value="database">Base de Datos</option>
                        <option value="tool">Herramienta</option>
                        <option value="cloud">Cloud</option>
                        <option value="instrument">Instrumento</option>
                        <option value="music">Música</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Nivel *
                      </label>
                      <select
                        value={crudFormData.level || "beginner"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            level: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="beginner">Principiante</option>
                        <option value="intermediate">Intermedio</option>
                        <option value="advanced">Avanzado</option>
                        <option value="expert">Experto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldIcon")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.icon || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            icon: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Años de Experiencia
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={crudFormData.years_of_experience || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            years_of_experience: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: 3.5"
                      />
                    </div>
                  </>
                )}

                {activeTab === "studies" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldInstitution")} {"*"}
                      </label>
                      <input
                        type="text"
                        value={crudFormData.institution || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            institution: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldType")} {"*"}
                      </label>
                      <select
                        value={crudFormData.type || "course"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            type: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="degree">
                          {t("admin.fieldTypeOptionDegree")}
                        </option>
                        <option value="certification">
                          {t("admin.fieldTypeOptionCertification")}
                        </option>
                        <option value="course">
                          {t("admin.fieldTypeOptionCourse")}
                        </option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          {t("admin.fieldStartDate")} {"*"} (YYYY-MM)
                        </label>
                        <input
                          type="text"
                          value={crudFormData.start_date || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              start_date: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          placeholder="2023-01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          {t("admin.fieldEndDate")} {"*"} (YYYY-MM)
                        </label>
                        <input
                          type="text"
                          value={crudFormData.end_date || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              end_date: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          placeholder="2024-12"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} {"*"}
                      </label>
                      <textarea
                        value={crudFormData.description || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldLogo")} {"*"}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.logo || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            logo: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCertificateUrl")}
                      </label>
                      <input
                        type="url"
                        value={crudFormData.certificate_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            certificate_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldStatus")} {"*"}
                      </label>
                      <select
                        value={crudFormData.status || "completed"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            status: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="completed">
                          {t("admin.completed")}
                        </option>
                        <option value="in-progress">
                          {t("admin.inProgress")}
                        </option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCRUDModal(false);
                      setEditingItem(null);
                      setCrudFormData({});
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm md:text-base bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 sm:flex-none px-4 py-2 text-sm md:text-base text-white rounded-lg transition-colors cursor-pointer"
                    style={{
                      backgroundColor: "rgba(32, 147, 196, 0.2)",
                      borderColor: "rgba(32, 147, 196, 0.3)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(32, 147, 196, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "rgba(32, 147, 196, 0.2)";
                    }}
                  >
                    {editingItem ? t("common.update") : t("common.create")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
