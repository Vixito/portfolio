import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { optimizeAndUpload } from "../lib/storage-functions";
import NotFound from "./NotFound";
import { useTranslation } from "../lib/i18n";
import { useStatusStore } from "../stores/useStatusStore";
import { useLanguageStore } from "../stores/useLanguageStore";
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
  getUserStatus,
  updateUserStatus,
  getExchangeRate,
  getProductPricing,
  updateProductPricing,
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getHomeContentItems,
  createHomeContentItem,
  updateHomeContentItem,
  deleteHomeContentItem,
  getRadioSettings,
  updateRadioSettings,
  getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
} from "../lib/supabase-functions";
import { supabase } from "../lib/supabase";
import Invoice from "../components/features/Invoice";

function Admin() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasValidKey, setHasValidKey] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { status: currentStatus, setStatus, loadStatus } = useStatusStore();
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const statusSelectorRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

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
    | "blog_posts"
    | "home_content"
    | "radio_settings"
    | "invoices"
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
  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [homeContentItems, setHomeContentItems] = useState<any[]>([]);
  const [radioSettings, setRadioSettings] = useState<any | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingCRUD, setLoadingCRUD] = useState(false);
  
  // Función para descargar factura como PDF (usando window.print)
  const downloadInvoicePDF = async (invoice: any) => {
    try {
      // Obtener producto completo si no está incluido
      let fullInvoice = invoice;
      if (!invoice.product && invoice.product_id) {
        const product = products.find((p: any) => p.id === invoice.product_id);
        fullInvoice = { ...invoice, product };
      }
      
      // Crear ventana temporal para mostrar Invoice y permitir imprimir/guardar como PDF
      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        alert("Por favor, permite ventanas emergentes para descargar la factura");
        return;
      }
      
      // Obtener HTML del componente Invoice (simplificado)
      // Por ahora, mostrar mensaje y usar print del navegador
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${fullInvoice.invoice_number}</title>
          <meta charset="UTF-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .invoice-container {
              border: 2px solid black;
              padding: 20px;
              max-width: 600px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <h1>Invoice #${fullInvoice.invoice_number}</h1>
            <p><strong>User:</strong> ${fullInvoice.user_name}</p>
            <p><strong>Request Type:</strong> ${fullInvoice.request_type}</p>
            <p><strong>Amount:</strong> ${fullInvoice.currency} ${fullInvoice.amount}</p>
            <p><strong>Delivery Time:</strong> ${fullInvoice.delivery_time}</p>
            <div class="no-print" style="margin-top: 20px;">
              <button onclick="window.print()" style="padding: 10px 20px; background: #2093c4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Imprimir / Guardar como PDF
              </button>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Nota: Para una solución más completa con el diseño exacto, 
      // se necesitaría usar jsPDF + html2canvas o una librería similar
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar PDF. Usa la función de imprimir del navegador.");
    }
  };
  const [showCRUDModal, setShowCRUDModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [crudFormData, setCrudFormData] = useState<any>({});
  const [extractingEventData, setExtractingEventData] = useState(false);
  const [eventUrl, setEventUrl] = useState("");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [loadingExchangeRate, setLoadingExchangeRate] = useState(false);

  // Verificar key de autenticación inicial (solo para permitir mostrar el formulario)
  useEffect(() => {
    // Verificar que esté en admin.vixis.dev y en la ruta raíz
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname !== "admin.vixis.dev" || pathname !== "/") {
      setHasValidKey(false);
      return;
    }

    const key = searchParams.get("key");
    const validKey = import.meta.env.VITE_ADMIN_KEY; // Variable de entorno desde Doppler

    if (!validKey) {
      console.error(
        "VITE_ADMIN_KEY no está configurada en las variables de entorno"
      );
      setHasValidKey(false);
      return;
    }

    // Verificar si la key es válida, pero NO autenticar automáticamente
    // La key solo permite mostrar el formulario de login
    if (key === validKey) {
      setHasValidKey(true);
    } else {
      setHasValidKey(false);
    }
  }, [searchParams]);

  // Función de login con usuario y contraseña
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const validKey = import.meta.env.VITE_ADMIN_KEY;
    const validUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const validPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (!validKey || !validUsername || !validPassword) {
      setLoginError("Error de configuración: Credenciales no configuradas");
      return;
    }

    // Verificar key de URL primero
    const key = searchParams.get("key");
    if (key !== validKey) {
      setLoginError("Key de acceso inválida");
      return;
    }

    // Verificar usuario y contraseña
    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true);
      setUsername("");
      setPassword("");
    } else {
      setLoginError("Usuario o contraseña incorrectos");
    }
  };

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

  // Cargar datos CRUD y status
  useEffect(() => {
    if (isAuthenticated) {
      loadCRUDData();
      loadStatus(); // Cargar status desde base de datos
    }
  }, [isAuthenticated, activeTab, loadStatus]);

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

  // Animación del dropdown de estado
  useEffect(() => {
    if (statusDropdownRef.current) {
      if (showStatusSelector) {
        statusDropdownRef.current.style.display = "block";
        gsap.fromTo(
          statusDropdownRef.current,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "power2.out" }
        );
      } else {
        if (statusDropdownRef.current.style.display !== "none") {
          gsap.to(statusDropdownRef.current, {
            opacity: 0,
            y: -10,
            scale: 0.95,
            duration: 0.2,
            ease: "power2.in",
            onComplete: () => {
              if (statusDropdownRef.current) {
                statusDropdownRef.current.style.display = "none";
              }
            },
          });
        }
      }
    }
  }, [showStatusSelector]);

  // Cerrar selector de estado al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusSelectorRef.current &&
        !statusSelectorRef.current.contains(event.target as Node)
      ) {
        setShowStatusSelector(false);
      }
    };

    if (showStatusSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStatusSelector]);

  // Permitir scroll del body incluso cuando el modal está abierto
  // El modal tiene su propio scroll interno

  // Cargar tasa de cambio cuando se monta el componente o cuando se abre el modal de productos
  useEffect(() => {
    const loadExchangeRate = async () => {
      if (activeTab === "products" && showCRUDModal) {
        try {
          setLoadingExchangeRate(true);
          const rate = await getExchangeRate("USD", "COP");
          if (rate && rate.exchange_rate) {
            setExchangeRate(rate.exchange_rate);
          } else {
            console.error("Error: No se pudo obtener tasa de cambio válida");
            // No usar fallback hardcodeado - mostrar error al usuario
            alert(
              "Error al obtener tasa de cambio. Por favor, intenta de nuevo."
            );
          }
        } catch (error) {
          console.error("Error al obtener tasa de cambio:", error);
          // No usar fallback hardcodeado - mostrar error al usuario
          alert(
            "Error al obtener tasa de cambio. Por favor, verifica tu conexión e intenta de nuevo."
          );
        } finally {
          setLoadingExchangeRate(false);
        }
      }
    };
    loadExchangeRate();
  }, [activeTab, showCRUDModal]);

  const loadCRUDData = async () => {
    setLoadingCRUD(true);
    try {
      switch (activeTab) {
        case "products":
          const productsData = await getProducts();
          setProducts(productsData || []);
          break;
        case "projects":
          const projectsData = await getProjects(true); // Incluir inactivos en Admin
          setProjects(projectsData || []);
          break;
        case "clients":
          const clientsData = await getClients(true); // Incluir inactivos en Admin
          setClients(clientsData || []);
          break;
        case "testimonials":
          const testimonialsData = await getTestimonials(true); // Incluir inactivos en Admin
          setTestimonials(testimonialsData || []);
          break;
        case "socials":
          const socialsData = await getSocials(true); // Incluir inactivos en Admin
          setSocials(socialsData || []);
          break;
        case "events":
          const eventsData = await getEvents(true); // Incluir inactivos en Admin
          setEvents(eventsData || []);
          break;
        case "work_experiences":
          const workExperiencesData = await getWorkExperiences(true); // Incluir inactivos en Admin
          setWorkExperiences(workExperiencesData || []);
          break;
        case "technologies":
          const technologiesData = await getTechnologies(true); // Incluir inactivos en Admin
          setTechnologies(technologiesData || []);
          break;
        case "studies":
          const studiesData = await getStudies(true); // Incluir inactivos en Admin
          setStudies(studiesData || []);
          break;
        case "blog_posts":
          const blogPostsData = await getBlogPosts(true); // Incluir inactivos en Admin
          setBlogPosts(blogPostsData || []);
          break;
        case "home_content":
          const homeContentData = await getHomeContentItems();
          setHomeContentItems(homeContentData || []);
          break;
        case "radio_settings":
          const radioSettingsData = await getRadioSettings();
          setRadioSettings(radioSettingsData);
          break;
        case "invoices":
          const invoicesData = await getInvoices();
          setInvoices(invoicesData || []);
          break;
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
        case "blog_posts":
          setBlogPosts([]);
          break;
        case "home_content":
          setHomeContentItems([]);
          break;
        case "radio_settings":
          setRadioSettings(null);
          break;
        case "invoices":
          setInvoices([]);
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
    } else if (activeTab === "blog_posts") {
      defaultFormData.platform = "Dev.to";
      defaultFormData.published_at = new Date().toISOString().split("T")[0];
    } else if (activeTab === "home_content") {
      defaultFormData.content_type = "latest_post";
      defaultFormData.is_active = true;
      defaultFormData.order_index = 0;
    } else if (activeTab === "radio_settings") {
      // Cargar configuración actual de radio
      if (radioSettings) {
        defaultFormData.jingle_url = radioSettings.jingle_url || "";
        defaultFormData.jingle_interval = radioSettings.jingle_interval || 5;
        defaultFormData.is_active = radioSettings.is_active !== false;
      } else {
        defaultFormData.jingle_url = "";
        defaultFormData.jingle_interval = 5;
        defaultFormData.is_active = true;
      }
    } else if (activeTab === "products") {
      // Valores por defecto para productos
      defaultFormData.button_type = "buy";
      defaultFormData.buy_button_type = "external_link";
      defaultFormData.price_currency = "USD";
      defaultFormData.is_active = true;
    } else if (activeTab === "invoices") {
      // Valores por defecto para facturas
      defaultFormData.currency = "USD";
      defaultFormData.status = "pending";
      defaultFormData.custom_fields = {};
      // Cargar productos si no están cargados
      if (products.length === 0) {
        getProducts().then(setProducts).catch(console.error);
      }
    } else if (activeTab === "invoices") {
      // Valores por defecto para facturas
      defaultFormData.currency = "USD";
      defaultFormData.status = "pending";
      defaultFormData.custom_fields = { features: [] };
    }
    setCrudFormData(defaultFormData);
    setEventUrl("");
    setShowCRUDModal(true);
  };

  // Funciones helper para manejar traducciones
  const extractTranslations = (
    translations: any,
    fallback: string = ""
  ): { es: string; en: string } => {
    if (!translations || typeof translations !== "object") {
      return { es: fallback, en: fallback };
    }
    return {
      es: translations.es || fallback,
      en: translations.en || fallback,
    };
  };

  const buildTranslations = (es: string, en: string): any => {
    if (!es && !en) return null;
    const result: any = {};
    if (es) result.es = es;
    if (en) result.en = en;
    return result;
  };

  const handleEdit = async (item: any) => {
    // Recargar datos primero para asegurar que tenemos la versión más reciente
    await loadCRUDData();
    // Esperar un momento para que React actualice el estado
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Buscar el item actualizado de la lista para asegurar que tenemos los datos más recientes
    let currentItem = item;
    switch (activeTab) {
      case "products":
        currentItem = products.find((p) => p.id === item.id) || item;
        break;
      case "projects":
        currentItem = projects.find((p) => p.id === item.id) || item;
        break;
      case "clients":
        currentItem = clients.find((c) => c.id === item.id) || item;
        break;
      case "socials":
        currentItem = socials.find((s) => s.id === item.id) || item;
        break;
      case "events":
        currentItem = events.find((e) => e.id === item.id) || item;
        break;
      case "work_experiences":
        currentItem = workExperiences.find((w) => w.id === item.id) || item;
        break;
      case "technologies":
        currentItem = technologies.find((t) => t.id === item.id) || item;
        break;
      case "studies":
        currentItem = studies.find((s) => s.id === item.id) || item;
        break;
      case "blog_posts":
        currentItem = blogPosts.find((b) => b.id === item.id) || item;
        break;
      case "home_content":
        currentItem = homeContentItems.find((h) => h.id === item.id) || item;
        break;
      case "invoices":
        currentItem = invoices.find((i) => i.id === item.id) || item;
        break;
    }

    setEditingItem(currentItem);
    const formData = { ...currentItem };

    // Migrar campos antiguos de CV a nuevos campos por idioma (compatibilidad)
    if (activeTab === "home_content" && currentItem.content_type === "cv_download") {
      // Si existen campos antiguos pero no los nuevos, migrar
      if (currentItem.cv_download_url && !currentItem.cv_download_url_es && !currentItem.cv_download_url_en) {
        formData.cv_download_url_es = currentItem.cv_download_url;
        formData.cv_download_url_en = currentItem.cv_download_url;
      }
      if (currentItem.cv_download_text && !currentItem.cv_download_text_es && !currentItem.cv_download_text_en) {
        formData.cv_download_text_es = currentItem.cv_download_text;
        formData.cv_download_text_en = currentItem.cv_download_text;
      }
    }

    // Extraer traducciones de campos JSONB a campos separados ES/EN
    if (activeTab === "products") {
      const titleTrans = extractTranslations(
        currentItem.title_translations,
        currentItem.title || ""
      );
      formData.title_es = titleTrans.es;
      formData.title_en = titleTrans.en;

      const descTrans = extractTranslations(
        currentItem.description_translations,
        currentItem.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;

      const fullDescTrans = extractTranslations(
        currentItem.full_description_translations,
        currentItem.full_description || ""
      );
      formData.full_description_es = fullDescTrans.es;
      formData.full_description_en = fullDescTrans.en;

      // Manejar buy_button_url como array de links externos
      if (currentItem.buy_button_type === "external_link") {
        // Si es un string (legacy), convertir a array
        if (
          typeof currentItem.buy_button_url === "string" &&
          currentItem.buy_button_url
        ) {
          formData.buy_external_links = [
            { label: "Link 1", url: currentItem.buy_button_url },
          ];
        } else if (Array.isArray(currentItem.buy_button_url)) {
          // Preservar simultaneous_urls si existen
          formData.buy_external_links = currentItem.buy_button_url.map(
            (link: any) => ({
              label: link.label || "",
              url: link.url || "",
              simultaneous_urls: link.simultaneous_urls || undefined,
            })
          );
        } else {
          formData.buy_external_links = [];
        }
      }
    } else if (activeTab === "projects") {
      const titleTrans = extractTranslations(
        item.title_translations,
        item.title || ""
      );
      formData.title_es = titleTrans.es;
      formData.title_en = titleTrans.en;
    } else if (activeTab === "clients") {
      const nameTrans = extractTranslations(
        item.name_translations,
        item.name || ""
      );
      formData.name_es = nameTrans.es;
      formData.name_en = nameTrans.en;

      const descTrans = extractTranslations(
        item.description_translations,
        item.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;

      const testimonialContentTrans = extractTranslations(
        item.testimonial_content_translations,
        item.testimonial_content || ""
      );
      formData.testimonial_content_es = testimonialContentTrans.es;
      formData.testimonial_content_en = testimonialContentTrans.en;

      const testimonialAuthorTrans = extractTranslations(
        item.testimonial_author_translations,
        item.testimonial_author || ""
      );
      formData.testimonial_author_es = testimonialAuthorTrans.es;
      formData.testimonial_author_en = testimonialAuthorTrans.en;

      const testimonialRoleTrans = extractTranslations(
        item.testimonial_role_translations,
        item.testimonial_role || ""
      );
      formData.testimonial_role_es = testimonialRoleTrans.es;
      formData.testimonial_role_en = testimonialRoleTrans.en;
    } else if (activeTab === "socials") {
      const titleTrans = extractTranslations(
        item.title_translations,
        item.title || ""
      );
      formData.title_es = titleTrans.es;
      formData.title_en = titleTrans.en;

      const descTrans = extractTranslations(
        item.description_translations,
        item.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;
    } else if (activeTab === "events") {
      const titleTrans = extractTranslations(
        item.title_translations,
        item.title || ""
      );
      formData.title_es = titleTrans.es;
      formData.title_en = titleTrans.en;

      const descTrans = extractTranslations(
        item.description_translations,
        item.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;
    } else if (activeTab === "work_experiences") {
      const positionTrans = extractTranslations(
        item.position_translations,
        item.position || ""
      );
      formData.position_es = positionTrans.es;
      formData.position_en = positionTrans.en;

      const companyTrans = extractTranslations(
        item.company_translations,
        item.company || ""
      );
      formData.company_es = companyTrans.es;
      formData.company_en = companyTrans.en;

      const locationTrans = extractTranslations(
        item.location_translations,
        item.location || ""
      );
      formData.location_es = locationTrans.es;
      formData.location_en = locationTrans.en;

      const descTrans = extractTranslations(
        item.description_translations,
        item.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;
    } else if (activeTab === "technologies") {
      const nameTrans = extractTranslations(
        item.name_translations,
        item.name || ""
      );
      formData.name_es = nameTrans.es;
      formData.name_en = nameTrans.en;
    } else if (activeTab === "studies") {
      const titleTrans = extractTranslations(
        item.title_translations,
        item.title || ""
      );
      formData.title_es = titleTrans.es;
      formData.title_en = titleTrans.en;

      const institutionTrans = extractTranslations(
        item.institution_translations,
        item.institution || ""
      );
      formData.institution_es = institutionTrans.es;
      formData.institution_en = institutionTrans.en;

      const descTrans = extractTranslations(
        item.description_translations,
        item.description || ""
      );
      formData.description_es = descTrans.es;
      formData.description_en = descTrans.en;
    }

    if (activeTab === "products") {
      // Cargar pricing del producto (incluyendo ofertas)
      try {
        const pricing = await getProductPricing(currentItem.id);
        if (pricing) {
          formData.is_on_sale = pricing.is_on_sale;
          formData.sale_percentage = pricing.sale_percentage;
          formData.sale_starts_at = pricing.sale_starts_at
            ? new Date(pricing.sale_starts_at).toISOString().slice(0, 16)
            : "";
          formData.sale_ends_at = pricing.sale_ends_at
            ? new Date(pricing.sale_ends_at).toISOString().slice(0, 16)
            : "";
        }
      } catch (error) {
        console.error("Error al cargar pricing:", error);
      }

      // Si no hay price_currency, usar USD por defecto
      if (!formData.price_currency) {
        formData.price_currency = "USD";
      }

      // Si no hay button_type, usar "buy" por defecto
      if (!formData.button_type) {
        formData.button_type = "buy";
      }

      // Si no hay buy_button_type, usar "external_link" por defecto
      if (!formData.buy_button_type) {
        formData.buy_button_type = "external_link";
      }

      // Si no hay request_button_type, usar "external_link" por defecto
      if (!formData.request_button_type) {
        formData.request_button_type = "external_link";
      }

      // Si hay precio en USD pero no en COP, calcular COP
      if (formData.base_price_usd && !formData.base_price_cop && exchangeRate) {
        formData.base_price_cop = formData.base_price_usd * exchangeRate;
      }
      // Si hay precio en COP pero no en USD, calcular USD
      if (formData.base_price_cop && !formData.base_price_usd && exchangeRate) {
        formData.base_price_usd = formData.base_price_cop / exchangeRate;
      }
    }
    // Para testimonios, usar el ID del cliente como client_id (opcional)
    if (activeTab === "testimonials") {
      // Solo asignar client_id si se seleccionó un cliente
      if (currentItem.id) {
        formData.client_id = currentItem.id;
      } else if (crudFormData.client_id) {
        formData.client_id = crudFormData.client_id;
      }
      // Si no hay client_id, dejarlo como null (opcional)
    }
    // Para work_experiences, convertir arrays a formato de lista con ES/EN
    if (activeTab === "work_experiences") {
      // Convertir responsabilidades a formato de lista
      let responsibilitiesList: Array<{ es: string; en: string }> = [];
      if (currentItem.responsibilities) {
        if (Array.isArray(currentItem.responsibilities)) {
          // Si es array de strings simples, convertir a objetos con ES/EN
          responsibilitiesList = currentItem.responsibilities.map(
            (resp: any) => {
              if (typeof resp === "string") {
                return { es: resp, en: resp };
              } else if (
                resp &&
                typeof resp === "object" &&
                (resp.es || resp.en)
              ) {
                return { es: resp.es || "", en: resp.en || "" };
              }
              return { es: "", en: "" };
            }
          );
        } else if (typeof currentItem.responsibilities === "string") {
          try {
            const parsed = JSON.parse(currentItem.responsibilities);
            if (Array.isArray(parsed)) {
              responsibilitiesList = parsed.map((resp: any) => {
                if (typeof resp === "string") {
                  return { es: resp, en: resp };
                } else if (
                  resp &&
                  typeof resp === "object" &&
                  (resp.es || resp.en)
                ) {
                  return { es: resp.es || "", en: resp.en || "" };
                }
                return { es: "", en: "" };
              });
            }
          } catch (e) {
            // Si no es JSON válido, crear un item con el texto
            responsibilitiesList = [
              {
                es: currentItem.responsibilities,
                en: currentItem.responsibilities,
              },
            ];
          }
        }
      }
      formData.responsibilities_list =
        responsibilitiesList.length > 0
          ? responsibilitiesList
          : [{ es: "", en: "" }];

      // Convertir tecnologías a formato de lista
      let technologiesList: Array<{ es: string; en: string }> = [];
      if (currentItem.technologies) {
        if (Array.isArray(currentItem.technologies)) {
          technologiesList = currentItem.technologies.map((tech: any) => {
            if (typeof tech === "string") {
              return { es: tech, en: tech };
            } else if (
              tech &&
              typeof tech === "object" &&
              (tech.es || tech.en)
            ) {
              return { es: tech.es || "", en: tech.en || "" };
            }
            return { es: "", en: "" };
          });
        } else if (typeof currentItem.technologies === "string") {
          try {
            const parsed = JSON.parse(currentItem.technologies);
            if (Array.isArray(parsed)) {
              technologiesList = parsed.map((tech: any) => {
                if (typeof tech === "string") {
                  return { es: tech, en: tech };
                } else if (
                  tech &&
                  typeof tech === "object" &&
                  (tech.es || tech.en)
                ) {
                  return { es: tech.es || "", en: tech.en || "" };
                }
                return { es: "", en: "" };
              });
            }
          } catch (e) {
            technologiesList = [
              { es: currentItem.technologies, en: currentItem.technologies },
            ];
          }
        }
      }
      formData.technologies_list =
        technologiesList.length > 0 ? technologiesList : [{ es: "", en: "" }];
    }
    setCrudFormData(formData);
    setEventUrl(currentItem.passline_url || "");
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
        case "blog_posts":
          await deleteBlogPost(id);
          break;
        case "home_content":
          await deleteHomeContentItem(id);
          break;
        case "invoices":
          await deleteInvoice(id);
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
        // Si los datos extraídos vienen en un solo idioma, ponerlos en ambos campos
        const extractedTitle = extractedData.title || "";
        const extractedDescription = extractedData.description || "";
        setCrudFormData({
          ...crudFormData,
          title_es: extractedTitle,
          title_en: extractedTitle, // Por defecto, usar el mismo texto para ambos idiomas
          date: extractedData.date || "",
          description_es: extractedDescription,
          description_en: extractedDescription, // Por defecto, usar el mismo texto para ambos idiomas
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
            const updateProductData: any = { ...crudFormData };
            // Validar que el sector sea obligatorio
            if (
              !updateProductData.sector ||
              updateProductData.sector.trim() === ""
            ) {
              alert(
                "Error: El campo Sector es obligatorio. Por favor, selecciona un sector."
              );
              return;
            }
            if (!exchangeRate) {
              alert(
                "Error: No se pudo obtener la tasa de cambio. Por favor, intenta de nuevo."
              );
              return;
            }
            const rate = exchangeRate;

            // Establecer campos requeridos (title, description, full_description) antes de convertir traducciones
            // Usar title_es como fallback si title no existe
            if (!updateProductData.title && updateProductData.title_es) {
              updateProductData.title = updateProductData.title_es;
            }
            if (
              !updateProductData.description &&
              updateProductData.description_es
            ) {
              updateProductData.description = updateProductData.description_es;
            }
            if (
              !updateProductData.full_description &&
              updateProductData.full_description_es
            ) {
              updateProductData.full_description =
                updateProductData.full_description_es;
            }

            // Convertir campos ES/EN a JSONB
            updateProductData.title_translations = buildTranslations(
              updateProductData.title_es || "",
              updateProductData.title_en || ""
            );
            updateProductData.description_translations = buildTranslations(
              updateProductData.description_es || "",
              updateProductData.description_en || ""
            );
            updateProductData.full_description_translations = buildTranslations(
              updateProductData.full_description_es || "",
              updateProductData.full_description_en || ""
            );

            // Eliminar campos ES/EN temporales
            delete updateProductData.title_es;
            delete updateProductData.title_en;
            delete updateProductData.description_es;
            delete updateProductData.description_en;
            delete updateProductData.full_description_es;
            delete updateProductData.full_description_en;

            // Manejar buy_external_links: convertir array a JSONB si es external_link
            if (updateProductData.buy_button_type === "external_link") {
              if (
                updateProductData.buy_external_links &&
                Array.isArray(updateProductData.buy_external_links)
              ) {
                // Filtrar links vacíos y procesar simultaneous_urls
                const validLinks = updateProductData.buy_external_links
                  .filter((link: any) => link && link.url && link.url.trim())
                  .map((link: any) => {
                    // Filtrar simultaneous_urls vacíos
                    if (
                      link.simultaneous_urls &&
                      Array.isArray(link.simultaneous_urls)
                    ) {
                      link.simultaneous_urls = link.simultaneous_urls.filter(
                        (url: string) => url && url.trim()
                      );
                      // Si no hay simultaneous_urls válidos, eliminar el campo
                      if (link.simultaneous_urls.length === 0) {
                        delete link.simultaneous_urls;
                      }
                    }
                    return link;
                  });
                updateProductData.buy_button_url =
                  validLinks.length > 0 ? validLinks : null;
              } else {
                updateProductData.buy_button_url = null;
              }
              delete updateProductData.buy_external_links;
            }

            // Determinar moneda y convertir precios
            const priceCurrency = updateProductData.price_currency || "USD";

            // Si no hay precio (null o undefined), establecer ambos como null
            if (updateProductData.base_price_usd === null || updateProductData.base_price_usd === undefined) {
              updateProductData.base_price_usd = null;
              updateProductData.base_price_cop = null;
            } else if (priceCurrency === "COP" && updateProductData.base_price_cop !== null && updateProductData.base_price_cop !== undefined) {
              // Si se ingresó en COP, calcular USD
              updateProductData.base_price_usd =
                updateProductData.base_price_cop / rate;
            } else if (
              priceCurrency === "USD" &&
              updateProductData.base_price_usd !== null &&
              updateProductData.base_price_usd !== undefined
            ) {
              // Si se ingresó en USD, calcular COP
              updateProductData.base_price_cop =
                updateProductData.base_price_usd * rate;
            }

            // Separar datos de oferta del producto
            const saleData = {
              is_on_sale: updateProductData.is_on_sale || false,
              sale_percentage: updateProductData.sale_percentage,
              sale_starts_at: updateProductData.sale_starts_at
                ? new Date(updateProductData.sale_starts_at).toISOString()
                : null,
              sale_ends_at: updateProductData.sale_ends_at
                ? new Date(updateProductData.sale_ends_at).toISOString()
                : null,
            };

            // Eliminar campos de oferta del objeto del producto
            delete updateProductData.is_on_sale;
            delete updateProductData.sale_percentage;
            delete updateProductData.sale_starts_at;
            delete updateProductData.sale_ends_at;

            // Debug: ver qué se está enviando
            console.log("Actualizando producto con datos:", {
              id: editingItem.id,
              data: updateProductData,
              buy_button_url: updateProductData.buy_button_url,
              title_translations: updateProductData.title_translations,
            });

            // Guardar producto
            const updatedProduct = await updateProduct(
              editingItem.id,
              updateProductData
            );

            // Debug: ver qué se devolvió
            console.log("Producto actualizado, respuesta:", updatedProduct);

            // Actualizar o crear product_pricing solo si hay precio
            if (updateProductData.base_price_usd !== null && updateProductData.base_price_usd !== undefined) {
              // Verificar si ya existe pricing
              const existingPricing = await getProductPricing(editingItem.id);
              
              if (existingPricing) {
                // Actualizar pricing existente
                await supabase
                  .from("product_pricing")
                  .update({
                    current_price_usd: updateProductData.base_price_usd,
                    current_price_cop: updateProductData.base_price_cop || (updateProductData.base_price_usd * rate),
                    updated_at: new Date().toISOString(),
                  })
                  .eq("product_id", editingItem.id);

                // Guardar pricing y ofertas
                if (saleData.is_on_sale && saleData.sale_percentage) {
                  await updateProductPricing(editingItem.id, saleData);
                } else {
                  // Si no hay oferta, desactivarla
                  await updateProductPricing(editingItem.id, { is_on_sale: false });
                }
              } else {
                // Crear nuevo pricing
                await supabase
                  .from("product_pricing")
                  .insert({
                    product_id: editingItem.id,
                    current_price_usd: updateProductData.base_price_usd,
                    current_price_cop: updateProductData.base_price_cop || (updateProductData.base_price_usd * rate),
                    is_on_sale: false,
                  });

                // Guardar pricing y ofertas si hay
                if (saleData.is_on_sale && saleData.sale_percentage) {
                  await updateProductPricing(editingItem.id, saleData);
                }
              }
            } else {
              // Si no hay precio, eliminar pricing si existe
              const existingPricing = await getProductPricing(editingItem.id);
              if (existingPricing) {
                await supabase
                  .from("product_pricing")
                  .delete()
                  .eq("product_id", editingItem.id);
              }
            }
            break;
          case "projects":
            const updateProjectData: any = { ...crudFormData };
            updateProjectData.title_translations = buildTranslations(
              updateProjectData.title_es || "",
              updateProjectData.title_en || ""
            );
            delete updateProjectData.title_es;
            delete updateProjectData.title_en;
            await updateProject(editingItem.id, updateProjectData);
            break;
          case "clients":
            const updateClientData: any = { ...crudFormData };
            updateClientData.name_translations = buildTranslations(
              updateClientData.name_es || "",
              updateClientData.name_en || ""
            );
            updateClientData.description_translations = buildTranslations(
              updateClientData.description_es || "",
              updateClientData.description_en || ""
            );
            updateClientData.testimonial_content_translations =
              buildTranslations(
                updateClientData.testimonial_content_es || "",
                updateClientData.testimonial_content_en || ""
              );
            updateClientData.testimonial_author_translations =
              buildTranslations(
                updateClientData.testimonial_author_es || "",
                updateClientData.testimonial_author_en || ""
              );
            updateClientData.testimonial_role_translations = buildTranslations(
              updateClientData.testimonial_role_es || "",
              updateClientData.testimonial_role_en || ""
            );
            delete updateClientData.name_es;
            delete updateClientData.name_en;
            delete updateClientData.description_es;
            delete updateClientData.description_en;
            delete updateClientData.testimonial_content_es;
            delete updateClientData.testimonial_content_en;
            delete updateClientData.testimonial_author_es;
            delete updateClientData.testimonial_author_en;
            delete updateClientData.testimonial_role_es;
            delete updateClientData.testimonial_role_en;
            await updateClient(editingItem.id, updateClientData);
            break;
          case "testimonials":
            const updateTestimonialData: any = { ...crudFormData };
            updateTestimonialData.testimonial_content_translations =
              buildTranslations(
                updateTestimonialData.testimonial_content_es || "",
                updateTestimonialData.testimonial_content_en || ""
              );
            updateTestimonialData.testimonial_author_translations =
              buildTranslations(
                updateTestimonialData.testimonial_author_es || "",
                updateTestimonialData.testimonial_author_en || ""
              );
            updateTestimonialData.testimonial_role_translations =
              buildTranslations(
                updateTestimonialData.testimonial_role_es || "",
                updateTestimonialData.testimonial_role_en || ""
              );
            delete updateTestimonialData.testimonial_content_es;
            delete updateTestimonialData.testimonial_content_en;
            delete updateTestimonialData.testimonial_author_es;
            delete updateTestimonialData.testimonial_author_en;
            delete updateTestimonialData.testimonial_role_es;
            delete updateTestimonialData.testimonial_role_en;
            await updateTestimonial(editingItem.id, updateTestimonialData);
            break;
          case "socials":
            const updateSocialData: any = { ...crudFormData };
            updateSocialData.title_translations = buildTranslations(
              updateSocialData.title_es || "",
              updateSocialData.title_en || ""
            );
            updateSocialData.description_translations = buildTranslations(
              updateSocialData.description_es || "",
              updateSocialData.description_en || ""
            );
            delete updateSocialData.title_es;
            delete updateSocialData.title_en;
            delete updateSocialData.description_es;
            delete updateSocialData.description_en;
            await updateSocial(editingItem.id, updateSocialData);
            break;
          case "events":
            const updateEventData: any = { ...crudFormData };
            // El campo title es requerido, usar title_es como título principal
            updateEventData.title =
              updateEventData.title_es || updateEventData.title_en || "";
            updateEventData.title_translations = buildTranslations(
              updateEventData.title_es || "",
              updateEventData.title_en || ""
            );
            updateEventData.description_translations = buildTranslations(
              updateEventData.description_es || "",
              updateEventData.description_en || ""
            );
            // Si description existe, usar description_es como descripción principal
            if (
              updateEventData.description_es ||
              updateEventData.description_en
            ) {
              updateEventData.description =
                updateEventData.description_es ||
                updateEventData.description_en ||
                null;
            }
            delete updateEventData.title_es;
            delete updateEventData.title_en;
            delete updateEventData.description_es;
            delete updateEventData.description_en;
            await updateEvent(editingItem.id, updateEventData);
            break;
          case "work_experiences":
            // Parsear JSON arrays si vienen como strings
            const workExpData = { ...crudFormData };
            // Convertir traducciones
            workExpData.position_translations = buildTranslations(
              workExpData.position_es || "",
              workExpData.position_en || ""
            );
            workExpData.company_translations = buildTranslations(
              workExpData.company_es || "",
              workExpData.company_en || ""
            );
            workExpData.location_translations = buildTranslations(
              workExpData.location_es || "",
              workExpData.location_en || ""
            );
            workExpData.description_translations = buildTranslations(
              workExpData.description_es || "",
              workExpData.description_en || ""
            );
            delete workExpData.position_es;
            delete workExpData.position_en;
            delete workExpData.company_es;
            delete workExpData.company_en;
            delete workExpData.location_es;
            delete workExpData.location_en;
            delete workExpData.description_es;
            delete workExpData.description_en;

            // Convertir responsabilidades_list a array de objetos {es, en} para guardar traducciones
            if (
              workExpData.responsibilities_list &&
              Array.isArray(workExpData.responsibilities_list)
            ) {
              workExpData.responsibilities = workExpData.responsibilities_list
                .filter(
                  (item: { es?: string; en?: string }) =>
                    (item.es && item.es.trim() !== "") ||
                    (item.en && item.en.trim() !== "")
                )
                .map((item: { es?: string; en?: string }) => ({
                  es: item.es || "",
                  en: item.en || "",
                }));
            } else if (typeof workExpData.responsibilities === "string") {
              try {
                const parsed = JSON.parse(workExpData.responsibilities);
                if (Array.isArray(parsed)) {
                  workExpData.responsibilities = parsed.map((item: any) => {
                    if (typeof item === "string") {
                      return { es: item, en: item };
                    } else if (item && typeof item === "object") {
                      return { es: item.es || "", en: item.en || "" };
                    }
                    return { es: "", en: "" };
                  });
                } else {
                  workExpData.responsibilities = [];
                }
              } catch (e) {
                // Si falla, convertir a array de objetos
                workExpData.responsibilities = workExpData.responsibilities
                  .split(",")
                  .map((s: string) => {
                    const trimmed = s.trim();
                    return trimmed ? { es: trimmed, en: trimmed } : null;
                  })
                  .filter((item: any) => item !== null);
              }
            }
            delete workExpData.responsibilities_list;

            // Convertir technologies_list a array de objetos {es, en} para guardar traducciones
            if (
              workExpData.technologies_list &&
              Array.isArray(workExpData.technologies_list)
            ) {
              workExpData.technologies = workExpData.technologies_list
                .filter(
                  (item: { es?: string; en?: string }) =>
                    (item.es && item.es.trim() !== "") ||
                    (item.en && item.en.trim() !== "")
                )
                .map((item: { es?: string; en?: string }) => ({
                  es: item.es || "",
                  en: item.en || "",
                }));
            } else if (typeof workExpData.technologies === "string") {
              try {
                const parsed = JSON.parse(workExpData.technologies);
                if (Array.isArray(parsed)) {
                  workExpData.technologies = parsed.map((item: any) => {
                    if (typeof item === "string") {
                      return { es: item, en: item };
                    } else if (item && typeof item === "object") {
                      return { es: item.es || "", en: item.en || "" };
                    }
                    return { es: "", en: "" };
                  });
                } else {
                  workExpData.technologies = [];
                }
              } catch (e) {
                // Si falla, convertir a array de objetos
                workExpData.technologies = workExpData.technologies
                  .split(",")
                  .map((s: string) => {
                    const trimmed = s.trim();
                    return trimmed ? { es: trimmed, en: trimmed } : null;
                  })
                  .filter((item: any) => item !== null);
              }
            }
            delete workExpData.technologies_list;
            await updateWorkExperience(editingItem.id, workExpData);
            break;
          case "technologies":
            // Calcular años de experiencia automáticamente desde start_year
            const techUpdateData = { ...crudFormData };
            techUpdateData.name_translations = buildTranslations(
              techUpdateData.name_es || "",
              techUpdateData.name_en || ""
            );
            delete techUpdateData.name_es;
            delete techUpdateData.name_en;
            if (techUpdateData.start_year) {
              const currentYear = new Date().getFullYear();
              const startYear = parseInt(techUpdateData.start_year.toString());
              techUpdateData.years_of_experience = currentYear - startYear;
              // Mantener start_year para futuras actualizaciones
            }
            await updateTechnology(editingItem.id, techUpdateData);
            break;
          case "studies":
            const updateStudyData: any = { ...crudFormData };
            updateStudyData.title_translations = buildTranslations(
              updateStudyData.title_es || "",
              updateStudyData.title_en || ""
            );
            updateStudyData.institution_translations = buildTranslations(
              updateStudyData.institution_es || "",
              updateStudyData.institution_en || ""
            );
            updateStudyData.description_translations = buildTranslations(
              updateStudyData.description_es || "",
              updateStudyData.description_en || ""
            );
            delete updateStudyData.title_es;
            delete updateStudyData.title_en;
            delete updateStudyData.institution_es;
            delete updateStudyData.institution_en;
            delete updateStudyData.description_es;
            delete updateStudyData.description_en;
            await updateStudy(editingItem.id, updateStudyData);
            break;
          case "blog_posts":
            await updateBlogPost(editingItem.id, crudFormData);
            break;
          case "home_content":
            await updateHomeContentItem(editingItem.id, crudFormData);
            break;
          case "invoices":
            const updateInvoiceData: any = { ...crudFormData };
            // Parsear custom_fields si es string
            if (typeof updateInvoiceData.custom_fields === "string") {
              try {
                updateInvoiceData.custom_fields = JSON.parse(updateInvoiceData.custom_fields);
              } catch {
                updateInvoiceData.custom_fields = {};
              }
            }
            await updateInvoice(editingItem.id, updateInvoiceData);
            break;
        }
      } else {
        // Crear
        switch (activeTab) {
          case "products":
            const productData: any = { ...crudFormData };
            // Validar que el sector sea obligatorio
            if (!productData.sector || productData.sector.trim() === "") {
              alert(
                "Error: El campo Sector es obligatorio. Por favor, selecciona un sector."
              );
              return;
            }
            if (!exchangeRate) {
              alert(
                "Error: No se pudo obtener la tasa de cambio. Por favor, intenta de nuevo."
              );
              return;
            }
            const createRate = exchangeRate;

            // Establecer campos requeridos (title, description, full_description) antes de convertir traducciones
            // Usar title_es como fallback si title no existe
            if (!productData.title && productData.title_es) {
              productData.title = productData.title_es;
            }
            if (!productData.description && productData.description_es) {
              productData.description = productData.description_es;
            }
            if (
              !productData.full_description &&
              productData.full_description_es
            ) {
              productData.full_description = productData.full_description_es;
            }

            // Convertir campos ES/EN a JSONB
            productData.title_translations = buildTranslations(
              productData.title_es || "",
              productData.title_en || ""
            );
            productData.description_translations = buildTranslations(
              productData.description_es || "",
              productData.description_en || ""
            );
            productData.full_description_translations = buildTranslations(
              productData.full_description_es || "",
              productData.full_description_en || ""
            );

            // Eliminar campos ES/EN temporales
            delete productData.title_es;
            delete productData.title_en;
            delete productData.description_es;
            delete productData.description_en;
            delete productData.full_description_es;
            delete productData.full_description_en;

            // Manejar buy_external_links: convertir array a JSONB si es external_link
            if (productData.buy_button_type === "external_link") {
              if (
                productData.buy_external_links &&
                Array.isArray(productData.buy_external_links)
              ) {
                // Filtrar links vacíos y procesar simultaneous_urls
                const validLinks = productData.buy_external_links
                  .filter((link: any) => link && link.url && link.url.trim())
                  .map((link: any) => {
                    // Filtrar simultaneous_urls vacíos
                    if (
                      link.simultaneous_urls &&
                      Array.isArray(link.simultaneous_urls)
                    ) {
                      link.simultaneous_urls = link.simultaneous_urls.filter(
                        (url: string) => url && url.trim()
                      );
                      // Si no hay simultaneous_urls válidos, eliminar el campo
                      if (link.simultaneous_urls.length === 0) {
                        delete link.simultaneous_urls;
                      }
                    }
                    return link;
                  });
                productData.buy_button_url =
                  validLinks.length > 0 ? validLinks : null;
              } else {
                productData.buy_button_url = null;
              }
              delete productData.buy_external_links;
            }

            // Determinar moneda y convertir precios
            const createPriceCurrency = productData.price_currency || "USD";

            // Si no hay precio (null o undefined), establecer ambos como null
            if (productData.base_price_usd === null || productData.base_price_usd === undefined) {
              productData.base_price_usd = null;
              productData.base_price_cop = null;
            } else if (createPriceCurrency === "COP" && productData.base_price_cop !== null && productData.base_price_cop !== undefined) {
              // Si se ingresó en COP, calcular USD
              productData.base_price_usd =
                productData.base_price_cop / exchangeRate;
            } else if (
              createPriceCurrency === "USD" &&
              productData.base_price_usd !== null &&
              productData.base_price_usd !== undefined
            ) {
              // Si se ingresó en USD, calcular COP
              productData.base_price_cop =
                productData.base_price_usd * exchangeRate;
            }

            // Separar datos de oferta del producto
            const createSaleData = {
              is_on_sale: productData.is_on_sale || false,
              sale_percentage: productData.sale_percentage,
              sale_starts_at: productData.sale_starts_at
                ? new Date(productData.sale_starts_at).toISOString()
                : null,
              sale_ends_at: productData.sale_ends_at
                ? new Date(productData.sale_ends_at).toISOString()
                : null,
            };

            // Eliminar campos de oferta del objeto del producto
            delete productData.is_on_sale;
            delete productData.sale_percentage;
            delete productData.sale_starts_at;
            delete productData.sale_ends_at;

            // Asegurar que is_active esté incluido (por defecto true si no está definido)
            if (productData.is_active === undefined) {
              productData.is_active = true;
            }

            // Crear producto
            // IMPORTANTE: Si no hay precio, el trigger de la BD intentará crear product_pricing con null
            // Por eso necesitas modificar el trigger o permitir NULL en current_price_cop
            const newProduct = await createProduct(productData);

            // Si hay un trigger que crea product_pricing automáticamente, necesitamos manejarlo
            // Opción 1: Si el trigger falla, eliminamos el registro creado y creamos uno nuevo solo si hay precio
            // Opción 2: Modificar el trigger para que solo cree product_pricing si hay precio
            
            // Verificar si se creó product_pricing automáticamente (por trigger)
            const existingPricing = await getProductPricing(newProduct.id);
            
            if (existingPricing) {
              // Si existe pero no hay precio, eliminarlo
              if (productData.base_price_usd === null || productData.base_price_usd === undefined) {
                await supabase
                  .from("product_pricing")
                  .delete()
                  .eq("product_id", newProduct.id);
              } else {
                // Si existe y hay precio, actualizarlo
                await supabase
                  .from("product_pricing")
                  .update({
                    current_price_usd: productData.base_price_usd,
                    current_price_cop: productData.base_price_cop || (productData.base_price_usd * exchangeRate),
                    is_on_sale: false,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("product_id", newProduct.id);

                // Guardar pricing y ofertas si hay
                if (createSaleData.is_on_sale && createSaleData.sale_percentage) {
                  await updateProductPricing(newProduct.id, createSaleData);
                }
              }
            } else {
              // Si no existe, crearlo solo si hay precio
              if (productData.base_price_usd !== null && productData.base_price_usd !== undefined) {
                const { error: pricingError } = await supabase
                  .from("product_pricing")
                  .insert({
                    product_id: newProduct.id,
                    current_price_usd: productData.base_price_usd,
                    current_price_cop: productData.base_price_cop || (productData.base_price_usd * exchangeRate),
                    is_on_sale: false,
                  });

                if (pricingError) {
                  console.error("Error al crear pricing:", pricingError);
                  throw new Error(`Error al crear pricing: ${pricingError.message}`);
                }

                // Guardar pricing y ofertas si hay
                if (createSaleData.is_on_sale && createSaleData.sale_percentage) {
                  await updateProductPricing(newProduct.id, createSaleData);
                }
              }
            }
            break;
          case "projects":
            const createProjectData: any = { ...crudFormData };
            createProjectData.title_translations = buildTranslations(
              createProjectData.title_es || "",
              createProjectData.title_en || ""
            );
            delete createProjectData.title_es;
            delete createProjectData.title_en;
            await createProject(createProjectData);
            break;
          case "clients":
            const createClientData: any = { ...crudFormData };
            createClientData.name_translations = buildTranslations(
              createClientData.name_es || "",
              createClientData.name_en || ""
            );
            createClientData.description_translations = buildTranslations(
              createClientData.description_es || "",
              createClientData.description_en || ""
            );
            createClientData.testimonial_content_translations =
              buildTranslations(
                createClientData.testimonial_content_es || "",
                createClientData.testimonial_content_en || ""
              );
            createClientData.testimonial_author_translations =
              buildTranslations(
                createClientData.testimonial_author_es || "",
                createClientData.testimonial_author_en || ""
              );
            createClientData.testimonial_role_translations = buildTranslations(
              createClientData.testimonial_role_es || "",
              createClientData.testimonial_role_en || ""
            );
            delete createClientData.name_es;
            delete createClientData.name_en;
            delete createClientData.description_es;
            delete createClientData.description_en;
            delete createClientData.testimonial_content_es;
            delete createClientData.testimonial_content_en;
            delete createClientData.testimonial_author_es;
            delete createClientData.testimonial_author_en;
            delete createClientData.testimonial_role_es;
            delete createClientData.testimonial_role_en;
            await createClient(createClientData);
            break;
          case "testimonials":
            const createTestimonialData: any = { ...crudFormData };
            createTestimonialData.testimonial_content_translations =
              buildTranslations(
                createTestimonialData.testimonial_content_es || "",
                createTestimonialData.testimonial_content_en || ""
              );
            createTestimonialData.testimonial_author_translations =
              buildTranslations(
                createTestimonialData.testimonial_author_es || "",
                createTestimonialData.testimonial_author_en || ""
              );
            createTestimonialData.testimonial_role_translations =
              buildTranslations(
                createTestimonialData.testimonial_role_es || "",
                createTestimonialData.testimonial_role_en || ""
              );
            delete createTestimonialData.testimonial_content_es;
            delete createTestimonialData.testimonial_content_en;
            delete createTestimonialData.testimonial_author_es;
            delete createTestimonialData.testimonial_author_en;
            delete createTestimonialData.testimonial_role_es;
            delete createTestimonialData.testimonial_role_en;
            await createTestimonial(createTestimonialData);
            break;
          case "socials":
            const createSocialData: any = { ...crudFormData };
            createSocialData.title_translations = buildTranslations(
              createSocialData.title_es || "",
              createSocialData.title_en || ""
            );
            createSocialData.description_translations = buildTranslations(
              createSocialData.description_es || "",
              createSocialData.description_en || ""
            );
            delete createSocialData.title_es;
            delete createSocialData.title_en;
            delete createSocialData.description_es;
            delete createSocialData.description_en;
            await createSocial(createSocialData);
            break;
          case "events":
            const createEventData: any = {
              ...crudFormData,
              passline_url: crudFormData.passline_url || eventUrl,
            };
            // El campo title es requerido, usar title_es como título principal
            createEventData.title =
              createEventData.title_es || createEventData.title_en || "";
            createEventData.title_translations = buildTranslations(
              createEventData.title_es || "",
              createEventData.title_en || ""
            );
            createEventData.description_translations = buildTranslations(
              createEventData.description_es || "",
              createEventData.description_en || ""
            );
            // Si description existe, usar description_es como descripción principal
            if (
              createEventData.description_es ||
              createEventData.description_en
            ) {
              createEventData.description =
                createEventData.description_es ||
                createEventData.description_en ||
                null;
            }
            delete createEventData.title_es;
            delete createEventData.title_en;
            delete createEventData.description_es;
            delete createEventData.description_en;
            await createEvent(createEventData);
            break;
          case "work_experiences":
            // Parsear JSON arrays si vienen como strings
            const newWorkExpData = { ...crudFormData };
            // Convertir traducciones
            newWorkExpData.position_translations = buildTranslations(
              newWorkExpData.position_es || "",
              newWorkExpData.position_en || ""
            );
            newWorkExpData.company_translations = buildTranslations(
              newWorkExpData.company_es || "",
              newWorkExpData.company_en || ""
            );
            newWorkExpData.location_translations = buildTranslations(
              newWorkExpData.location_es || "",
              newWorkExpData.location_en || ""
            );
            newWorkExpData.description_translations = buildTranslations(
              newWorkExpData.description_es || "",
              newWorkExpData.description_en || ""
            );
            delete newWorkExpData.position_es;
            delete newWorkExpData.position_en;
            delete newWorkExpData.company_es;
            delete newWorkExpData.company_en;
            delete newWorkExpData.location_es;
            delete newWorkExpData.location_en;
            delete newWorkExpData.description_es;
            delete newWorkExpData.description_en;

            // Convertir responsabilidades_list a array de strings (usar ES por defecto, o EN si ES está vacío)
            if (
              newWorkExpData.responsibilities_list &&
              Array.isArray(newWorkExpData.responsibilities_list)
            ) {
              newWorkExpData.responsibilities =
                newWorkExpData.responsibilities_list
                  .map((item: { es?: string; en?: string }) => {
                    const lang = useLanguageStore.getState().language;
                    return item[lang] || item.es || item.en || "";
                  })
                  .filter((s: string) => s.trim() !== "");
            } else if (typeof newWorkExpData.responsibilities === "string") {
              try {
                newWorkExpData.responsibilities = JSON.parse(
                  newWorkExpData.responsibilities
                );
              } catch (e) {
                newWorkExpData.responsibilities =
                  newWorkExpData.responsibilities
                    .split(",")
                    .map((s: string) => s.trim())
                    .filter((s: string) => s.length > 0);
              }
            }
            delete newWorkExpData.responsibilities_list;

            // Convertir technologies_list a array de strings
            if (
              newWorkExpData.technologies_list &&
              Array.isArray(newWorkExpData.technologies_list)
            ) {
              newWorkExpData.technologies = newWorkExpData.technologies_list
                .map((item: { es?: string; en?: string }) => {
                  const lang = useLanguageStore.getState().language;
                  return item[lang] || item.es || item.en || "";
                })
                .filter((s: string) => s.trim() !== "");
            } else if (typeof newWorkExpData.technologies === "string") {
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
            delete newWorkExpData.technologies_list;
            await createWorkExperience(newWorkExpData);
            break;
          case "technologies":
            // Calcular años de experiencia automáticamente desde start_year
            const techCreateData = { ...crudFormData };
            techCreateData.name_translations = buildTranslations(
              techCreateData.name_es || "",
              techCreateData.name_en || ""
            );
            delete techCreateData.name_es;
            delete techCreateData.name_en;
            if (techCreateData.start_year) {
              const currentYear = new Date().getFullYear();
              const startYear = parseInt(techCreateData.start_year.toString());
              techCreateData.years_of_experience = currentYear - startYear;
              // Mantener start_year para futuras actualizaciones
            }
            await createTechnology(techCreateData);
            break;
          case "studies":
            // Asegurar que status siempre tenga un valor
            const studyData: any = {
              ...crudFormData,
              status: crudFormData.status || "completed",
            };
            studyData.title_translations = buildTranslations(
              studyData.title_es || "",
              studyData.title_en || ""
            );
            studyData.institution_translations = buildTranslations(
              studyData.institution_es || "",
              studyData.institution_en || ""
            );
            studyData.description_translations = buildTranslations(
              studyData.description_es || "",
              studyData.description_en || ""
            );
            delete studyData.title_es;
            delete studyData.title_en;
            delete studyData.institution_es;
            delete studyData.institution_en;
            delete studyData.description_es;
            delete studyData.description_en;
            await createStudy(studyData);
            break;
          case "blog_posts":
            await createBlogPost(crudFormData);
            break;
          case "home_content":
            await createHomeContentItem(crudFormData);
            break;
          case "invoices":
            const createInvoiceData: any = { ...crudFormData };
            // Parsear custom_fields si es string
            if (typeof createInvoiceData.custom_fields === "string") {
              try {
                createInvoiceData.custom_fields = JSON.parse(createInvoiceData.custom_fields);
              } catch {
                createInvoiceData.custom_fields = {};
              }
            }
            // Crear factura y enviar email automáticamente
            const newInvoice = await createInvoice(createInvoiceData);
            // Enviar email con la factura
            try {
              const emailResponse = await supabase.functions.invoke("send-invoice-email", {
                body: { invoice_id: newInvoice.id },
              });
              if (emailResponse.error) {
                console.error("Error al enviar email:", emailResponse.error);
                alert(`Factura creada (ID: ${newInvoice.invoice_number}) pero error al enviar email. Verifica la configuración en Doppler: MAKE_INVOICE_WEBHOOK_URL, RESEND_API_KEY o SENDGRID_API_KEY`);
              } else {
                const result = emailResponse.data;
                if (result?.error) {
                  alert(`Factura creada (ID: ${newInvoice.invoice_number}) pero error al enviar email: ${result.error}`);
                } else {
                  alert(`Factura #${newInvoice.invoice_number} creada y email enviado exitosamente a ${createInvoiceData.user_email}`);
                }
              }
            } catch (emailError) {
              console.error("Error al enviar email:", emailError);
              alert(`Factura creada (ID: ${newInvoice.invoice_number}) pero error al enviar email. Verifica la configuración en Doppler.`);
              // No fallar la creación si el email falla
            }
            // Guardar referencia de la factura creada para descarga
            setEditingItem(newInvoice);
            break;
        }
      }
      // Guardar referencia de si estaba editando antes de limpiar
      const wasEditing = !!editingItem;
      // Cerrar modal inmediatamente (comportamiento anterior)
      setShowCRUDModal(false);
      setEditingItem(null);
      setCrudFormData({});
      // Recargar datos después de cerrar el modal
      await loadCRUDData();
      alert(
        wasEditing
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
    // Si no hay key válida, mostrar NotFound
    if (!hasValidKey) {
      return <NotFound />;
    }

    // Si hay key válida pero no está autenticado, mostrar formulario de login
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-lg p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            {t("admin.login") || "Iniciar Sesión"}
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                {t("admin.username") || "Usuario"}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("admin.username") || "Usuario"}
                required
              />
            </div>
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                {t("admin.password") || "Contraseña"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-10 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("admin.password") || "Contraseña"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginError && (
              <div className="text-red-400 text-sm text-center">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              className="w-full px-6 py-3 font-semibold rounded-lg transition-all duration-300 cursor-pointer text-white"
              style={{
                backgroundColor: "#10b981",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#059669";
                e.currentTarget.style.boxShadow =
                  "0 0 30px rgba(16, 185, 129, 0.7)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#10b981";
                e.currentTarget.style.boxShadow =
                  "0 0 20px rgba(16, 185, 129, 0.5)";
              }}
            >
              {t("admin.login") || "Iniciar Sesión"}
            </button>
          </form>
        </div>
      </div>
    );
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

        {/* Botones de Recursos Multimedia y Estado */}
        <div className="mb-8 flex flex-wrap gap-4">
          <button
            onClick={() => setShowMediaManager(!showMediaManager)}
            className="px-6 py-3 bg-cyan/20 hover:bg-cyan/30 rounded-lg border border-cyan/30 text-white transition-colors cursor-pointer font-semibold"
          >
            {showMediaManager ? t("admin.hide") : t("admin.show")}{" "}
            {t("admin.mediaResources")}
          </button>

          {/* Selector de Estado y Botón de Cerrar Sesión */}
          <div className="flex items-center gap-3">
            <div className="relative" ref={statusSelectorRef}>
              <button
                onClick={() => setShowStatusSelector(!showStatusSelector)}
                className="px-6 py-3 rounded-lg border text-white transition-colors cursor-pointer font-semibold flex items-center gap-2"
                style={{
                  backgroundColor: "rgba(51, 29, 131, 0.3)",
                  borderColor: "rgba(51, 29, 131, 0.5)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(51, 29, 131, 0.4)";
                  e.currentTarget.style.borderColor = "rgba(51, 29, 131, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(51, 29, 131, 0.3)";
                  e.currentTarget.style.borderColor = "rgba(51, 29, 131, 0.5)";
                }}
              >
                {t("admin.changeStatus")}: {t(`statusBadge.${currentStatus}`)}
                <svg
                  className={`w-4 h-4 transition-transform ${
                    showStatusSelector ? "rotate-180" : ""
                  }`}
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

              <div
                ref={statusDropdownRef}
                style={{
                  display: "none",
                  borderColor: "rgba(51, 29, 131, 0.5)",
                }}
                className="absolute top-full left-0 mt-2 bg-black/90 backdrop-blur-lg rounded-lg border shadow-lg z-50 min-w-[200px]"
              >
                {(["available", "away", "busy"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={async () => {
                      try {
                        // Guardar en base de datos (como loadCRUDData)
                        await updateUserStatus(status);

                        // Actualizar el store inmediatamente
                        setStatus(status);
                        setShowStatusSelector(false);

                        // Forzar actualización inmediata del store
                        const { setStatus: updateStatus } =
                          useStatusStore.getState();
                        updateStatus(status);

                        // Disparar evento para notificar a todos los componentes
                        window.dispatchEvent(
                          new CustomEvent("statusChanged", { detail: status })
                        );
                      } catch (error) {
                        console.error("Error al actualizar status:", error);
                        alert(
                          `Error al actualizar status: ${
                            error instanceof Error
                              ? error.message
                              : "Error desconocido"
                          }`
                        );
                      }
                    }}
                    className={`w-full px-4 py-2 text-left text-white transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg`}
                    style={{
                      backgroundColor:
                        currentStatus === status
                          ? "rgba(51, 29, 131, 0.4)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (currentStatus !== status) {
                        e.currentTarget.style.backgroundColor =
                          "rgba(51, 29, 131, 0.2)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentStatus !== status) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    {t(`statusBadge.${status}`)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setHasValidKey(false);
                // Limpiar cualquier estado relacionado
                window.location.href = "/";
              }}
              className="px-6 py-3 rounded-lg border text-white transition-colors cursor-pointer font-semibold flex items-center gap-2"
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.3)",
                borderColor: "rgba(220, 38, 38, 0.5)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(220, 38, 38, 0.4)";
                e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(220, 38, 38, 0.3)";
                e.currentTarget.style.borderColor = "rgba(220, 38, 38, 0.5)";
              }}
            >
              {t("admin.logout") || "Cerrar Sesión"}
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
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
                "blog_posts",
                "home_content",
                "radio_settings",
                "invoices",
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
                {tab === "blog_posts" && "Blog Posts"}
                {tab === "home_content" && "Home Content"}
                {tab === "radio_settings" && "Radio Settings"}
                {tab === "invoices" && "Invoices"}
              </button>
            ))}
          </div>

          {/* Lista de items o formulario de radio_settings */}
          {activeTab === "radio_settings" ? (
            <div className="admin-card bg-gray-900 rounded-lg p-4 md:p-6 border border-white/20">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">
                Configuración de Radio
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await updateRadioSettings({
                      jingle_url:
                        crudFormData.jingle_url ||
                        radioSettings?.jingle_url ||
                        "",
                      jingle_interval:
                        crudFormData.jingle_interval ||
                        radioSettings?.jingle_interval ||
                        5,
                      is_active:
                        crudFormData.is_active !== undefined
                          ? crudFormData.is_active
                          : true,
                    });
                    await loadCRUDData();
                    alert(
                      t("admin.saveSuccess") ||
                        "Configuración guardada exitosamente"
                    );
                    setCrudFormData({});
                  } catch (error) {
                    console.error(
                      "Error al guardar configuración de radio:",
                      error
                    );
                    alert(
                      `Error: ${
                        error instanceof Error
                          ? error.message
                          : String(error) || "Error desconocido"
                      }`
                    );
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    URL del Jingle/Station ID *
                  </label>
                  <input
                    type="url"
                    value={
                      crudFormData.jingle_url !== undefined
                        ? crudFormData.jingle_url
                        : radioSettings?.jingle_url || ""
                    }
                    onChange={(e) =>
                      setCrudFormData({
                        ...crudFormData,
                        jingle_url: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                    placeholder="https://cdn.vixis.dev/jingle.m4a"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL del archivo de audio del jingle (formato .m4a, .mp3,
                    etc.)
                  </p>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-2">
                    Intervalo (cada cuántas canciones) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={
                      crudFormData.jingle_interval !== undefined
                        ? crudFormData.jingle_interval
                        : radioSettings?.jingle_interval || 5
                    }
                    onChange={(e) =>
                      setCrudFormData({
                        ...crudFormData,
                        jingle_interval: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                    placeholder="5"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cada cuántas canciones se reproducirá el jingle (mínimo: 1)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={
                      crudFormData.is_active !== undefined
                        ? crudFormData.is_active
                        : radioSettings?.is_active !== false
                    }
                    onChange={(e) =>
                      setCrudFormData({
                        ...crudFormData,
                        is_active: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <label className="text-gray-300 text-sm">
                    Activo (el jingle se reproducirá)
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCrudFormData({});
                      loadCRUDData();
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </form>
            </div>
          ) : loadingCRUD ? (
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
                : activeTab === "blog_posts"
                ? blogPosts
                : activeTab === "home_content"
                ? homeContentItems
                : activeTab === "invoices"
                ? invoices
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
                        : activeTab === "invoices"
                        ? `Invoice #${item.invoice_number} - ${item.user_name}`
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
                        : activeTab === "home_content"
                        ? item.content_type || t("admin.noDescription")
                        : activeTab === "invoices"
                        ? `${item.request_type} - ${item.currency} ${item.amount} - ${item.status}`
                        : item.description ||
                          item.url ||
                          t("admin.noDescription")}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto items-center">
                    {/* Toggle is_active (ocultar para invoices) */}
                    {activeTab !== "invoices" && (
                      <button
                        onClick={async () => {
                        try {
                          const newIsActive = !item.is_active;
                          switch (activeTab) {
                            case "products":
                              await updateProduct(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "projects":
                              await updateProject(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "clients":
                              await updateClient(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "testimonials":
                              await updateClient(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "socials":
                              await updateSocial(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "events":
                              await updateEvent(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "work_experiences":
                              await updateWorkExperience(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "technologies":
                              await updateTechnology(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "studies":
                              await updateStudy(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "blog_posts":
                              await updateBlogPost(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                            case "home_content":
                              await updateHomeContentItem(item.id, {
                                is_active: newIsActive,
                              });
                              break;
                          }
                          await loadCRUDData();
                        } catch (error) {
                          alert(
                            `Error al actualizar: ${
                              error instanceof Error
                                ? error.message
                                : "Error desconocido"
                            }`
                          );
                        }
                      }}
                      className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded transition-colors cursor-pointer ${
                        item.is_active
                          ? "bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-white"
                          : "bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 text-gray-400"
                      }`}
                      title={
                        item.is_active ? t("admin.active") : t("admin.inactive")
                      }
                    >
                      {item.is_active ? "✓" : "○"}
                      </button>
                    )}
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
                : activeTab === "blog_posts"
                ? blogPosts
                : activeTab === "home_content"
                ? homeContentItems
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
                  {activeTab === "blog_posts" && (
                    <p className="text-lg mb-2">No hay posts de blog</p>
                  )}
                  {activeTab === "home_content" && (
                    <p className="text-lg mb-2">No hay contenido configurado</p>
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
                    : activeTab === "blog_posts"
                    ? editingItem
                      ? "Editar Post"
                      : "Crear Post"
                    : activeTab === "home_content"
                    ? editingItem
                      ? "Editar Contenido Home"
                      : "Crear Contenido Home"
                    : activeTab === "invoices"
                    ? editingItem
                      ? `Edit Invoice #${editingItem.invoice_number || ""}`
                      : "Create Invoice"
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
                        {t("admin.fieldTitle")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (Español)
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (English)
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldFullDescription")} (Español)
                        <span className="text-gray-500 text-xs ml-2">
                          (Soporta HTML: &lt;strong&gt;, &lt;em&gt;, &lt;u&gt;, &lt;br/&gt;)
                        </span>
                      </label>
                      <textarea
                        value={crudFormData.full_description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            full_description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-mono text-sm"
                        rows={8}
                        placeholder="Puedes usar HTML: &lt;strong&gt;negrita&lt;/strong&gt;, &lt;em&gt;cursiva&lt;/em&gt;, &lt;u&gt;subrayado&lt;/u&gt;, &lt;br/&gt; para saltos de línea"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Ejemplo: &lt;strong&gt;Texto en negrita&lt;/strong&gt;&lt;br/&gt;&lt;em&gt;Texto en cursiva&lt;/em&gt;
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldFullDescription")} (English)
                        <span className="text-gray-500 text-xs ml-2">
                          (Supports HTML: &lt;strong&gt;, &lt;em&gt;, &lt;u&gt;, &lt;br/&gt;)
                        </span>
                      </label>
                      <textarea
                        value={crudFormData.full_description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            full_description_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-mono text-sm"
                        rows={8}
                        placeholder="You can use HTML: &lt;strong&gt;bold&lt;/strong&gt;, &lt;em&gt;italic&lt;/em&gt;, &lt;u&gt;underline&lt;/u&gt;, &lt;br/&gt; for line breaks"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Example: &lt;strong&gt;Bold text&lt;/strong&gt;&lt;br/&gt;&lt;em&gt;Italic text&lt;/em&gt;
                      </p>
                    </div>
                    {/* Selector de moneda */}
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Moneda del precio *
                      </label>
                      <select
                        value={crudFormData.price_currency || "USD"}
                        onChange={(e) => {
                          const currency = e.target.value as "USD" | "COP";
                          setCrudFormData({
                            ...crudFormData,
                            price_currency: currency,
                          });
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="USD">USD (Dólares)</option>
                        <option value="COP">COP (Pesos Colombianos)</option>
                      </select>
                    </div>

                    {/* Campo de precio según moneda seleccionada */}
                    {crudFormData.price_currency === "COP" ? (
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Precio en COP
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={crudFormData.base_price_cop !== undefined && crudFormData.base_price_cop !== null ? crudFormData.base_price_cop : ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === null || value === undefined) {
                              // Si está vacío, establecer como null (sin precio)
                              setCrudFormData({
                                ...crudFormData,
                                base_price_cop: null,
                                base_price_usd: null,
                              });
                            } else {
                              const copPrice = parseFloat(value);
                              if (isNaN(copPrice)) {
                                setCrudFormData({
                                  ...crudFormData,
                                  base_price_cop: null,
                                  base_price_usd: null,
                                });
                              } else {
                                const usdPrice = exchangeRate
                                  ? copPrice / exchangeRate
                                  : null;
                                setCrudFormData({
                                  ...crudFormData,
                                  base_price_cop: copPrice,
                                  base_price_usd: usdPrice,
                                });
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Si el campo queda vacío después de perder el foco, establecer como null
                            if (e.target.value === "") {
                              setCrudFormData({
                                ...crudFormData,
                                base_price_cop: null,
                                base_price_usd: null,
                              });
                            }
                          }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        />
                        {exchangeRate && crudFormData.base_price_cop && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${crudFormData.base_price_usd?.toFixed(2)} USD
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Precio en USD
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={crudFormData.base_price_usd !== undefined && crudFormData.base_price_usd !== null ? crudFormData.base_price_usd : ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "" || value === null || value === undefined) {
                              // Si está vacío, establecer como null (sin precio)
                              setCrudFormData({
                                ...crudFormData,
                                base_price_usd: null,
                                base_price_cop: null,
                              });
                            } else {
                              const usdPrice = parseFloat(value);
                              if (isNaN(usdPrice)) {
                                setCrudFormData({
                                  ...crudFormData,
                                  base_price_usd: null,
                                  base_price_cop: null,
                                });
                              } else {
                                const copPrice = exchangeRate
                                  ? usdPrice * exchangeRate
                                  : null;
                                setCrudFormData({
                                  ...crudFormData,
                                  base_price_usd: usdPrice,
                                  base_price_cop: copPrice,
                                });
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Si el campo queda vacío después de perder el foco, establecer como null
                            if (e.target.value === "") {
                              setCrudFormData({
                                ...crudFormData,
                                base_price_usd: null,
                                base_price_cop: null,
                              });
                            }
                          }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        />
                        {exchangeRate && crudFormData.base_price_usd && (
                          <p className="text-xs text-gray-400 mt-1">
                            ≈ ${crudFormData.base_price_cop?.toFixed(2)} COP
                          </p>
                        )}
                      </div>
                    )}

                    {/* Campo de sector (obligatorio, dropdown) */}
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Sector <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={crudFormData.sector || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            sector: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="">Selecciona un sector</option>
                        <option value="programación">Programación</option>
                        <option value="ropa">Ropa</option>
                        <option value="diseño">Diseño</option>
                        <option value="asesoría">Asesoría</option>
                        <option value="curso">Curso</option>
                        <option value="inversión">Inversión</option>
                        <option value="música">Música</option>
                        <option value="idiomas">Idiomas</option>
                      </select>
                    </div>

                    {/* Sección de ofertas */}
                    <div className="border-t border-gray-700 pt-4">
                      <label className="flex items-center gap-2 text-gray-300 text-sm mb-4">
                        <input
                          type="checkbox"
                          checked={crudFormData.is_on_sale || false}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              is_on_sale: e.target.checked,
                            })
                          }
                          className="w-4 h-4"
                        />
                        Producto en oferta
                      </label>

                      {crudFormData.is_on_sale && (
                        <>
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              Porcentaje de descuento (%) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={crudFormData.sale_percentage || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  sale_percentage:
                                    parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              required={crudFormData.is_on_sale}
                            />
                          </div>

                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              Fecha de inicio de oferta
                            </label>
                            <input
                              type="datetime-local"
                              value={crudFormData.sale_starts_at || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  sale_starts_at: e.target.value,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-gray-300 text-sm mb-2">
                              Fecha de fin de oferta
                            </label>
                            <input
                              type="datetime-local"
                              value={crudFormData.sale_ends_at || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  sale_ends_at: e.target.value,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            />
                          </div>
                        </>
                      )}
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
                    {/* Nueva estructura clara de botones */}
                    <div className="border-t border-gray-700 pt-4">
                      <h3 className="text-lg font-semibold text-white mb-4">
                        Configuración de Botones
                      </h3>

                      {/* Tipo de botón principal */}
                      <div className="mb-4">
                        <label className="block text-gray-300 text-sm mb-2">
                          Tipo de Botón *
                        </label>
                        <select
                          value={crudFormData.button_type || "buy"}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              button_type: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                        >
                          <option value="buy">Comprar</option>
                          <option value="request">Solicitar</option>
                        </select>
                      </div>

                      {/* Configuración del botón "Comprar" */}
                      {crudFormData.button_type === "buy" && (
                        <>
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              Tipo de Acción para "Comprar" *
                            </label>
                            <select
                              value={
                                crudFormData.buy_button_type || "external_link"
                              }
                              onChange={(e) => {
                                const newType = e.target.value;
                                setCrudFormData({
                                  ...crudFormData,
                                  buy_button_type: newType,
                                  // Limpiar datos según el tipo
                                  buy_button_url:
                                    newType === "custom_checkout"
                                      ? crudFormData.buy_button_url
                                      : undefined,
                                  buy_external_links:
                                    newType === "external_link"
                                      ? crudFormData.buy_external_links || []
                                      : undefined,
                                });
                              }}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              required
                            >
                              <option value="external_link">
                                Link Externo (Amazon, Hotmart, Airtm, etc.)
                              </option>
                              <option value="custom_checkout">
                                Checkout Propio (/checkout/:id)
                              </option>
                            </select>
                          </div>

                          {crudFormData.buy_button_type === "external_link" && (
                            <div className="mb-4">
                              <label className="block text-gray-300 text-sm mb-2">
                                Links Externos (puedes agregar múltiples) *
                              </label>
                              {(crudFormData.buy_external_links || []).map(
                                (link: any, index: number) => (
                                  <div key={index} className="mb-3 space-y-2">
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Etiqueta (ej: Airtm, Amazon, etc.)"
                                        value={link.label || ""}
                                        onChange={(e) => {
                                          const newLinks = [
                                            ...(crudFormData.buy_external_links ||
                                              []),
                                          ];
                                          newLinks[index] = {
                                            ...link,
                                            label: e.target.value,
                                          };
                                          setCrudFormData({
                                            ...crudFormData,
                                            buy_external_links: newLinks,
                                          });
                                        }}
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newLinks = [
                                            ...(crudFormData.buy_external_links ||
                                              []),
                                          ];
                                          newLinks.splice(index, 1);
                                          setCrudFormData({
                                            ...crudFormData,
                                            buy_external_links:
                                              newLinks.length > 0
                                                ? newLinks
                                                : undefined,
                                          });
                                        }}
                                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="flex gap-2">
                                      <input
                                        type="url"
                                        placeholder="URL principal (https://...)"
                                        value={link.url || ""}
                                        onChange={(e) => {
                                          const newLinks = [
                                            ...(crudFormData.buy_external_links ||
                                              []),
                                          ];
                                          newLinks[index] = {
                                            ...link,
                                            url: e.target.value,
                                          };
                                          setCrudFormData({
                                            ...crudFormData,
                                            buy_external_links: newLinks,
                                          });
                                        }}
                                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        id={`simultaneous-${index}`}
                                        checked={
                                          link.simultaneous_urls ? true : false
                                        }
                                        onChange={(e) => {
                                          const newLinks = [
                                            ...(crudFormData.buy_external_links ||
                                              []),
                                          ];
                                          newLinks[index] = {
                                            ...link,
                                            simultaneous_urls: e.target.checked
                                              ? []
                                              : undefined,
                                          };
                                          setCrudFormData({
                                            ...crudFormData,
                                            buy_external_links: newLinks,
                                          });
                                        }}
                                        className="w-4 h-4"
                                      />
                                      <label
                                        htmlFor={`simultaneous-${index}`}
                                        className="text-gray-300 text-sm"
                                      >
                                        Abrir múltiples links simultáneamente
                                      </label>
                                    </div>
                                    {link.simultaneous_urls !== undefined && (
                                      <div className="ml-4 space-y-2">
                                        {(link.simultaneous_urls || []).map(
                                          (
                                            simUrl: string,
                                            simIndex: number
                                          ) => (
                                            <div
                                              key={simIndex}
                                              className="flex gap-2"
                                            >
                                              <input
                                                type="url"
                                                placeholder="URL adicional (https://...)"
                                                value={simUrl || ""}
                                                onChange={(e) => {
                                                  const newLinks = [
                                                    ...(crudFormData.buy_external_links ||
                                                      []),
                                                  ];
                                                  if (
                                                    !newLinks[index]
                                                      .simultaneous_urls
                                                  ) {
                                                    newLinks[
                                                      index
                                                    ].simultaneous_urls = [];
                                                  }
                                                  newLinks[
                                                    index
                                                  ].simultaneous_urls[
                                                    simIndex
                                                  ] = e.target.value;
                                                  setCrudFormData({
                                                    ...crudFormData,
                                                    buy_external_links:
                                                      newLinks,
                                                  });
                                                }}
                                                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                              />
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const newLinks = [
                                                    ...(crudFormData.buy_external_links ||
                                                      []),
                                                  ];
                                                  if (
                                                    newLinks[index]
                                                      .simultaneous_urls
                                                  ) {
                                                    newLinks[
                                                      index
                                                    ].simultaneous_urls.splice(
                                                      simIndex,
                                                      1
                                                    );
                                                  }
                                                  setCrudFormData({
                                                    ...crudFormData,
                                                    buy_external_links:
                                                      newLinks,
                                                  });
                                                }}
                                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                              >
                                                ×
                                              </button>
                                            </div>
                                          )
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newLinks = [
                                              ...(crudFormData.buy_external_links ||
                                                []),
                                            ];
                                            if (
                                              !newLinks[index].simultaneous_urls
                                            ) {
                                              newLinks[
                                                index
                                              ].simultaneous_urls = [];
                                            }
                                            newLinks[
                                              index
                                            ].simultaneous_urls.push("");
                                            setCrudFormData({
                                              ...crudFormData,
                                              buy_external_links: newLinks,
                                            });
                                          }}
                                          className="w-full px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                                        >
                                          + Agregar URL adicional
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setCrudFormData({
                                    ...crudFormData,
                                    buy_external_links: [
                                      ...(crudFormData.buy_external_links ||
                                        []),
                                      { label: "", url: "" },
                                    ],
                                  });
                                }}
                                className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                              >
                                + Agregar Link
                              </button>
                            </div>
                          )}

                          {crudFormData.buy_button_type ===
                            "custom_checkout" && (
                            <div className="mb-4">
                              <label className="block text-gray-300 text-sm mb-2">
                                ID del Producto para Checkout (se generará
                                /checkout/:id) *
                              </label>
                              <input
                                type="text"
                                value={crudFormData.buy_button_url || ""}
                                onChange={(e) =>
                                  setCrudFormData({
                                    ...crudFormData,
                                    buy_button_url: e.target.value,
                                  })
                                }
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                placeholder="producto-123"
                                required
                              />
                              <p className="text-xs text-gray-400 mt-1">
                                El link generado será: /checkout/
                                {crudFormData.buy_button_url || "id"}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Configuración del botón "Solicitar" */}
                      {crudFormData.button_type === "request" && (
                        <>
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              Tipo de Acción para "Solicitar" *
                            </label>
                            <select
                              value={
                                crudFormData.request_button_type ||
                                "external_link"
                              }
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  request_button_type: e.target.value,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              required
                            >
                              <option value="external_link">
                                Link Externo
                              </option>
                              <option value="custom_form">
                                Formulario Propio
                              </option>
                            </select>
                          </div>
                          <div className="mb-4">
                            <label className="block text-gray-300 text-sm mb-2">
                              {crudFormData.request_button_type ===
                              "external_link"
                                ? "URL Externa"
                                : "URL del Formulario Propio"}
                              *
                            </label>
                            <input
                              type="url"
                              value={crudFormData.request_button_url || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  request_button_url: e.target.value,
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              placeholder={
                                crudFormData.request_button_type ===
                                "external_link"
                                  ? "https://..."
                                  : "/request/:id"
                              }
                              required
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {activeTab === "projects" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_en: e.target.value,
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
                        Nombre (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Nombre (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name_en: e.target.value,
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
                        Descripción (Español) *
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Descripción (English) *
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
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
                        {t("admin.fieldTestimonialContent")} (Español) *
                      </label>
                      <textarea
                        value={crudFormData.testimonial_content_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_content_es: e.target.value,
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
                        {t("admin.fieldTestimonialContent")} (English) *
                      </label>
                      <textarea
                        value={crudFormData.testimonial_content_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_content_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={4}
                        placeholder="Ej: 'Excellent work, very professional...'"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialAuthor")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_author_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_author_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Juan Pérez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialAuthor")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_author_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_author_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Juan Pérez"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialRole")} (Español)
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_role_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_role_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: CEO, Director de Marketing"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTestimonialRole")} (English)
                      </label>
                      <input
                        type="text"
                        value={crudFormData.testimonial_role_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            testimonial_role_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: CEO, Marketing Director"
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
                        {t("admin.fieldTitle")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (Español) *
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (English) *
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
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
                        {t("admin.fieldTitle")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        placeholder="Se llenará automáticamente al extraer datos"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        placeholder="Will be filled automatically when extracting data"
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
                        {t("admin.fieldDescription")} (Español)
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        placeholder="Se llenará automáticamente al extraer datos"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (English)
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        placeholder="Will be filled automatically when extracting data"
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
                        Posición/Cargo (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.position_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            position_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Posición/Cargo (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.position_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            position_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCompany")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.company_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            company_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldCompany")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.company_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            company_en: e.target.value,
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
                        {t("admin.fieldLocation")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.location_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            location_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: Bogotá, Colombia"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldLocation")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.location_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            location_en: e.target.value,
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
                        Descripción (Español)
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Descripción (English)
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldResponsibilities")}
                      </label>
                      {(
                        crudFormData.responsibilities_list || [
                          { es: "", en: "" },
                        ]
                      ).map(
                        (item: { es: string; en: string }, index: number) => (
                          <div
                            key={index}
                            className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                          >
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                  Español
                                </label>
                                <input
                                  type="text"
                                  value={item.es || ""}
                                  onChange={(e) => {
                                    const newList = [
                                      ...(crudFormData.responsibilities_list || [
                                        { es: "", en: "" },
                                      ]),
                                    ];
                                    newList[index] = {
                                      ...newList[index],
                                      es: e.target.value,
                                    };
                                    setCrudFormData({
                                      ...crudFormData,
                                      responsibilities_list: newList,
                                    });
                                  }}
                                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                  placeholder="Ej: Desarrollar APIs"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                  English
                                </label>
                                <input
                                  type="text"
                                  value={item.en || ""}
                                  onChange={(e) => {
                                    const newList = [
                                      ...(crudFormData.responsibilities_list || [
                                        { es: "", en: "" },
                                      ]),
                                    ];
                                    newList[index] = {
                                      ...newList[index],
                                      en: e.target.value,
                                    };
                                    setCrudFormData({
                                      ...crudFormData,
                                      responsibilities_list: newList,
                                    });
                                  }}
                                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                  placeholder="Ej: Develop APIs"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newList = [
                                  ...(crudFormData.responsibilities_list || [
                                    { es: "", en: "" },
                                  ]),
                                ];
                                newList.splice(index, 1);
                                setCrudFormData({
                                  ...crudFormData,
                                  responsibilities_list:
                                    newList.length > 0
                                      ? newList
                                      : [{ es: "", en: "" }],
                                });
                              }}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCrudFormData({
                            ...crudFormData,
                            responsibilities_list: [
                              ...(crudFormData.responsibilities_list || [
                                { es: "", en: "" },
                              ]),
                              { es: "", en: "" },
                            ],
                          });
                        }}
                        className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        + Agregar Responsabilidad
                      </button>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTechnologies")} *
                      </label>
                      {(
                        crudFormData.technologies_list || [{ es: "", en: "" }]
                      ).map(
                        (item: { es: string; en: string }, index: number) => (
                          <div
                            key={index}
                            className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                          >
                            <div className="grid grid-cols-2 gap-3 mb-2">
                              <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                  Español
                                </label>
                                <input
                                  type="text"
                                  value={item.es || ""}
                                  onChange={(e) => {
                                    const newList = [
                                      ...(crudFormData.technologies_list || [
                                        { es: "", en: "" },
                                      ]),
                                    ];
                                    newList[index] = {
                                      ...newList[index],
                                      es: e.target.value,
                                    };
                                    setCrudFormData({
                                      ...crudFormData,
                                      technologies_list: newList,
                                    });
                                  }}
                                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                  placeholder="Ej: TypeScript"
                                />
                              </div>
                              <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                  English
                                </label>
                                <input
                                  type="text"
                                  value={item.en || ""}
                                  onChange={(e) => {
                                    const newList = [
                                      ...(crudFormData.technologies_list || [
                                        { es: "", en: "" },
                                      ]),
                                    ];
                                    newList[index] = {
                                      ...newList[index],
                                      en: e.target.value,
                                    };
                                    setCrudFormData({
                                      ...crudFormData,
                                      technologies_list: newList,
                                    });
                                  }}
                                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm"
                                  placeholder="Ej: TypeScript"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newList = [
                                  ...(crudFormData.technologies_list || [
                                    { es: "", en: "" },
                                  ]),
                                ];
                                newList.splice(index, 1);
                                setCrudFormData({
                                  ...crudFormData,
                                  technologies_list:
                                    newList.length > 0
                                      ? newList
                                      : [{ es: "", en: "" }],
                                });
                              }}
                              className="text-red-400 hover:text-red-300 text-xs"
                            >
                              Eliminar
                            </button>
                          </div>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCrudFormData({
                            ...crudFormData,
                            technologies_list: [
                              ...(crudFormData.technologies_list || [
                                { es: "", en: "" },
                              ]),
                              { es: "", en: "" },
                            ],
                          });
                        }}
                        className="mt-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                      >
                        + Agregar Tecnología
                      </button>
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
                        Nombre (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Nombre (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.name_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            name_en: e.target.value,
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
                        {t("admin.fieldIcon")} (Legacy - Opcional)
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
                        placeholder="https://..."
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        URL del icono (se usará si no hay badge_url)
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        URL del Badge (shields.io u otro) *
                      </label>
                      <input
                        type="url"
                        value={crudFormData.badge_url || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            badge_url: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="https://img.shields.io/badge/..."
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Ejemplo:
                        https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Año de Inicio
                      </label>
                      <input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={crudFormData.start_year || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            start_year: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Ej: 2020"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Los años de experiencia se calcularán automáticamente
                      </p>
                    </div>
                  </>
                )}

                {activeTab === "blog_posts" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Título *
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
                        Excerpt (Descripción breve) *
                      </label>
                      <textarea
                        value={crudFormData.excerpt || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            excerpt: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        URL *
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
                        placeholder="https://dev.to/usuario/post"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Plataforma *
                      </label>
                      <select
                        value={crudFormData.platform || "Dev.to"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            platform: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="Dev.to">Dev.to</option>
                        <option value="Medium">Medium</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Autor (opcional)
                      </label>
                      <input
                        type="text"
                        value={crudFormData.author || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            author: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="Nombre del autor"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Thumbnail URL (opcional)
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
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Fecha de Publicación *
                      </label>
                      <input
                        type="date"
                        value={crudFormData.published_at || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            published_at: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                  </>
                )}

                {activeTab === "studies" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldTitle")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.title_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            title_en: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldInstitution")} (Español) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.institution_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            institution_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldInstitution")} (English) *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.institution_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            institution_en: e.target.value,
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
                        {t("admin.fieldDescription")} (Español) *
                      </label>
                      <textarea
                        value={crudFormData.description_es || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_es: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        rows={3}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        {t("admin.fieldDescription")} (English) *
                      </label>
                      <textarea
                        value={crudFormData.description_en || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            description_en: e.target.value,
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

                {activeTab === "home_content" && (
                  <>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Tipo de Contenido *
                      </label>
                      <select
                        value={crudFormData.content_type || "latest_post"}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            content_type: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                      >
                        <option value="latest_post">Último Post</option>
                        <option value="work_experience">
                          Experiencia Laboral
                        </option>
                        <option value="projects">Proyectos</option>
                        <option value="cv_download">Descargar CV</option>
                      </select>
                    </div>

                    {crudFormData.content_type === "latest_post" && (
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Blog Post ID (opcional - dejar vacío para usar el
                            más reciente)
                          </label>
                          <input
                            type="text"
                            value={crudFormData.blog_post_id || ""}
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                blog_post_id: e.target.value || undefined,
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="UUID del blog post"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Tags (separados por comas, opcional)
                          </label>
                          <input
                            type="text"
                            value={
                              crudFormData.latest_post_tags?.join(", ") || ""
                            }
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                latest_post_tags: e.target.value
                                  ? e.target.value
                                      .split(",")
                                      .map((t) => t.trim())
                                  : [],
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="#Desarrollo, #Git, #Tutorial"
                          />
                        </div>
                      </>
                    )}

                    {crudFormData.content_type === "work_experience" && (
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Work Experience ID (opcional - dejar vacío para usar
                            datos directos)
                          </label>
                          <input
                            type="text"
                            value={crudFormData.work_experience_id || ""}
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                work_experience_id: e.target.value || undefined,
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="UUID del work experience"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Datos Directos (JSON, opcional si hay ID)
                          </label>
                          <textarea
                            value={
                              crudFormData.work_experience_data
                                ? JSON.stringify(
                                    crudFormData.work_experience_data,
                                    null,
                                    2
                                  )
                                : ""
                            }
                            onChange={(e) => {
                              try {
                                const parsed = e.target.value
                                  ? JSON.parse(e.target.value)
                                  : undefined;
                                setCrudFormData({
                                  ...crudFormData,
                                  work_experience_data: parsed,
                                });
                              } catch {
                                // Ignorar JSON inválido mientras se escribe
                              }
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white font-mono text-xs"
                            rows={10}
                            placeholder='Ejemplo completo:
{
  "company": "Nombre de la Empresa",
  "company_translations": {
    "es": "Nombre de la Empresa",
    "en": "Company Name"
  },
  "position": "Desarrollador Full Stack",
  "position_translations": {
    "es": "Desarrollador Full Stack",
    "en": "Full Stack Developer"
  },
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "status": "current",
  "company_logo": "https://cdn.vixis.dev/logo-empresa.png"
}

NOTA: company_logo es la URL de la imagen del logo que se mostrará en la Home. Si no se proporciona, se mostrará la primera letra de la empresa.'
                          />
                        </div>
                      </>
                    )}

                    {crudFormData.content_type === "projects" && (
                      <>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Project IDs (separados por comas, en orden)
                          </label>
                          <input
                            type="text"
                            value={crudFormData.project_ids?.join(", ") || ""}
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                project_ids: e.target.value
                                  ? e.target.value
                                      .split(",")
                                      .map((id) => id.trim())
                                  : [],
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="uuid1, uuid2, uuid3"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Dejar vacío para crear un proyecto fuera de
                            /projects (usar campos de abajo)
                          </p>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Nombre del Proyecto * (requerido si no hay Project
                            IDs)
                          </label>
                          <input
                            type="text"
                            value={crudFormData.project_data?.title || ""}
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                project_data: {
                                  ...crudFormData.project_data,
                                  title: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="Nombre del proyecto"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Nombre que se mostrará en la Home. Requerido si no
                            usas Project IDs.
                          </p>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Link del Proyecto (URL, opcional - se usa si el
                            proyecto no tiene URL en /projects)
                          </label>
                          <input
                            type="url"
                            value={crudFormData.project_data?.url || ""}
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                project_data: {
                                  ...crudFormData.project_data,
                                  url: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="https://ejemplo.com/proyecto"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            URL alternativa si el proyecto no aparece en
                            /projects o tiene un link diferente
                          </p>
                        </div>
                        <div>
                          <label className="block text-gray-300 text-sm mb-2">
                            Link del Thumbnail (URL de la imagen)
                          </label>
                          <input
                            type="url"
                            value={
                              crudFormData.project_data?.thumbnail_url || ""
                            }
                            onChange={(e) =>
                              setCrudFormData({
                                ...crudFormData,
                                project_data: {
                                  ...crudFormData.project_data,
                                  thumbnail_url: e.target.value,
                                },
                              })
                            }
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                            placeholder="https://cdn.vixis.dev/proyecto-thumbnail.jpg"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            URL de la imagen que se mostrará en la Home. Al
                            hacer click en la imagen, se abrirá el link del
                            proyecto en una nueva pestaña.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">
                              Mes (string, opcional - para proyectos que no
                              están en /projects)
                            </label>
                            <input
                              type="text"
                              value={crudFormData.project_data?.month || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  project_data: {
                                    ...crudFormData.project_data,
                                    month: e.target.value,
                                  },
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              placeholder="Enero"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Ejemplo: Enero, Febrero, Marzo...
                            </p>
                          </div>
                          <div>
                            <label className="block text-gray-300 text-sm mb-2">
                              Año (number, opcional - para proyectos que no
                              están en /projects)
                            </label>
                            <input
                              type="number"
                              value={crudFormData.project_data?.year || ""}
                              onChange={(e) =>
                                setCrudFormData({
                                  ...crudFormData,
                                  project_data: {
                                    ...crudFormData.project_data,
                                    year: e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined,
                                  },
                                })
                              }
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                              placeholder="2026"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Ejemplo: 2026
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {crudFormData.content_type === "cv_download" && (
                      <>
                        <div className="space-y-4">
                          <div className="border-b border-gray-700 pb-2">
                            <h3 className="text-gray-300 font-semibold text-sm mb-3">
                              CV en Español
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                  URL del CV (Español) *
                                </label>
                                <input
                                  type="url"
                                  value={crudFormData.cv_download_url_es || ""}
                                  onChange={(e) =>
                                    setCrudFormData({
                                      ...crudFormData,
                                      cv_download_url_es: e.target.value,
                                    })
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                  placeholder="https://..."
                                  required={
                                    crudFormData.content_type === "cv_download"
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                  Texto del Botón (Español)
                                </label>
                                <input
                                  type="text"
                                  value={crudFormData.cv_download_text_es || ""}
                                  onChange={(e) =>
                                    setCrudFormData({
                                      ...crudFormData,
                                      cv_download_text_es: e.target.value,
                                    })
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                  placeholder="Descargar CV"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-gray-300 font-semibold text-sm mb-3">
                              CV en Inglés
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                  URL del CV (Inglés) *
                                </label>
                                <input
                                  type="url"
                                  value={crudFormData.cv_download_url_en || ""}
                                  onChange={(e) =>
                                    setCrudFormData({
                                      ...crudFormData,
                                      cv_download_url_en: e.target.value,
                                    })
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                  placeholder="https://..."
                                  required={
                                    crudFormData.content_type === "cv_download"
                                  }
                                />
                              </div>
                              <div>
                                <label className="block text-gray-300 text-sm mb-2">
                                  Texto del Botón (Inglés)
                                </label>
                                <input
                                  type="text"
                                  value={crudFormData.cv_download_text_en || ""}
                                  onChange={(e) =>
                                    setCrudFormData({
                                      ...crudFormData,
                                      cv_download_text_en: e.target.value,
                                    })
                                  }
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                                  placeholder="Download CV"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Orden (order_index)
                      </label>
                      <input
                        type="number"
                        value={crudFormData.order_index || 0}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            order_index: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={crudFormData.is_active !== false}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <label className="text-gray-300 text-sm">
                        Activo (visible en frontend)
                      </label>
                    </div>
                  </>
                )}

                {activeTab === "invoices" && (
                  <>
                    {editingItem && (
                      <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <p className="text-gray-300 text-sm">
                          <span className="font-semibold">Invoice Number:</span>{" "}
                          {editingItem.invoice_number}
                        </p>
                        <p className="text-gray-300 text-sm mt-1">
                          <span className="font-semibold">Status:</span>{" "}
                          <span
                            className={
                              editingItem.status === "paid" ||
                              editingItem.status === "completed"
                                ? "text-red-400"
                                : "text-green-400"
                            }
                          >
                            {editingItem.status}
                          </span>
                        </p>
                        {(editingItem.status === "paid" ||
                          editingItem.status === "completed") && (
                          <p className="text-red-400 text-xs mt-2">
                            ⚠️ This invoice cannot be edited or deleted because it has been paid or completed.
                          </p>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Product * (Select product ID)
                      </label>
                      <select
                        value={crudFormData.product_id || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            product_id: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        disabled={
                          editingItem &&
                          (editingItem.status === "paid" ||
                            editingItem.status === "completed")
                        }
                      >
                        <option value="">Select a product</option>
                        {products.map((product: any) => (
                          <option key={product.id} value={product.id}>
                            {product.id} - {product.title || "No title"}
                          </option>
                        ))}
                      </select>
                      {crudFormData.product_id && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected Product ID: {crudFormData.product_id}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        User Name *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.user_name || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            user_name: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        disabled={
                          editingItem &&
                          (editingItem.status === "paid" ||
                            editingItem.status === "completed")
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        User Email * (for sending invoice)
                      </label>
                      <input
                        type="email"
                        value={crudFormData.user_email || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            user_email: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        required
                        disabled={
                          editingItem &&
                          (editingItem.status === "paid" ||
                            editingItem.status === "completed")
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Request Type *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.request_type || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            request_type: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="e.g., Consultation, Project, etc."
                        required
                        disabled={
                          editingItem &&
                          (editingItem.status === "paid" ||
                            editingItem.status === "completed")
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Amount *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={crudFormData.amount || ""}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              amount: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                          disabled={
                            editingItem &&
                            (editingItem.status === "paid" ||
                              editingItem.status === "completed")
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-gray-300 text-sm mb-2">
                          Currency *
                        </label>
                        <select
                          value={crudFormData.currency || "USD"}
                          onChange={(e) =>
                            setCrudFormData({
                              ...crudFormData,
                              currency: e.target.value,
                            })
                          }
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                          required
                          disabled={
                            editingItem &&
                            (editingItem.status === "paid" ||
                              editingItem.status === "completed")
                          }
                        >
                          <option value="USD">USD</option>
                          <option value="COP">COP</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Approximate Delivery Time *
                      </label>
                      <input
                        type="text"
                        value={crudFormData.delivery_time || ""}
                        onChange={(e) =>
                          setCrudFormData({
                            ...crudFormData,
                            delivery_time: e.target.value,
                          })
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                        placeholder="e.g., 2 weeks, 1 month, etc."
                        required
                        disabled={
                          editingItem &&
                          (editingItem.status === "paid" ||
                            editingItem.status === "completed")
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 text-sm mb-2">
                        Features & Pricing
                      </label>
                      <div className="space-y-3">
                        {(crudFormData.custom_fields?.features || []).map(
                          (feature: any, index: number) => (
                            <div
                              key={index}
                              className="flex gap-2 items-start p-3 bg-gray-800 rounded-lg border border-gray-700"
                            >
                              <div className="flex-1 space-y-2">
                                <input
                                  type="text"
                                  placeholder="Feature name"
                                  value={feature.name || ""}
                                  onChange={(e) => {
                                    const features = [
                                      ...(crudFormData.custom_fields?.features ||
                                        []),
                                    ];
                                    features[index] = {
                                      ...features[index],
                                      name: e.target.value,
                                    };
                                    setCrudFormData({
                                      ...crudFormData,
                                      custom_fields: {
                                        ...crudFormData.custom_fields,
                                        features,
                                      },
                                    });
                                  }}
                                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm"
                                  disabled={
                                    editingItem &&
                                    (editingItem.status === "paid" ||
                                      editingItem.status === "completed")
                                  }
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Price"
                                    value={feature.price || ""}
                                    onChange={(e) => {
                                      const features = [
                                        ...(crudFormData.custom_fields
                                          ?.features || []),
                                      ];
                                      features[index] = {
                                        ...features[index],
                                        price: parseFloat(e.target.value) || 0,
                                      };
                                      setCrudFormData({
                                        ...crudFormData,
                                        custom_fields: {
                                          ...crudFormData.custom_fields,
                                          features,
                                        },
                                      });
                                    }}
                                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm"
                                    disabled={
                                      editingItem &&
                                      (editingItem.status === "paid" ||
                                        editingItem.status === "completed")
                                    }
                                  />
                                  <select
                                    value={feature.currency || "USD"}
                                    onChange={(e) => {
                                      const features = [
                                        ...(crudFormData.custom_fields
                                          ?.features || []),
                                      ];
                                      features[index] = {
                                        ...features[index],
                                        currency: e.target.value,
                                      };
                                      setCrudFormData({
                                        ...crudFormData,
                                        custom_fields: {
                                          ...crudFormData.custom_fields,
                                          features,
                                        },
                                      });
                                    }}
                                    className="bg-gray-700 border border-gray-600 rounded-lg p-2 text-white text-sm"
                                    disabled={
                                      editingItem &&
                                      (editingItem.status === "paid" ||
                                        editingItem.status === "completed")
                                    }
                                  >
                                    <option value="USD">USD</option>
                                    <option value="COP">COP</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const features = [
                                    ...(crudFormData.custom_fields?.features ||
                                      []),
                                  ];
                                  features.splice(index, 1);
                                  setCrudFormData({
                                    ...crudFormData,
                                    custom_fields: {
                                      ...crudFormData.custom_fields,
                                      features,
                                    },
                                  });
                                }}
                                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors cursor-pointer"
                                disabled={
                                  editingItem &&
                                  (editingItem.status === "paid" ||
                                    editingItem.status === "completed")
                                }
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setCrudFormData({
                              ...crudFormData,
                              custom_fields: {
                                ...(crudFormData.custom_fields || {}),
                                features: [
                                  ...(crudFormData.custom_fields?.features ||
                                    []),
                                  { name: "", price: 0, currency: "USD" },
                                ],
                              },
                            });
                          }}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors cursor-pointer"
                          disabled={
                            editingItem &&
                            (editingItem.status === "paid" ||
                              editingItem.status === "completed")
                          }
                        >
                          + Add Feature
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Add features with their prices (optional)
                      </p>
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
                  {activeTab === "invoices" && editingItem && (
                    <button
                      onClick={() => downloadInvoicePDF(editingItem)}
                      className="flex-1 sm:flex-none px-4 py-2 text-sm md:text-base bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      📥 Download Invoice
                    </button>
                  )}
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
