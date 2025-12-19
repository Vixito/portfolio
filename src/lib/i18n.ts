import { useLanguageStore } from "../stores/useLanguageStore";

// Definición de todas las traducciones
export const translations = {
  es: {
    // Navegación
    nav: {
      home: "Inicio",
      studio: "Studio",
      about: "Acerca de",
      work: "Trabajo",
      projects: "Proyectos",
      clients: "Clientes",
      workExperience: "Experiencia Laboral",
      stack: "Stack",
      studies: "Estudios",
      socials: "Redes Sociales",
      store: "Tienda",
      radio: "Radio",
      blog: "Blog",
      settings: "Ajustes",
      language: "Idioma",
      donations: "Donaciones",
      code: "Código",
      repository: "Repositorio",
    },
    // Páginas comunes
    common: {
      loading: "Cargando...",
      error: "Error",
      noContent: "No hay contenido disponible",
      back: "Volver",
      close: "Cerrar",
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      create: "Crear",
      update: "Actualizar",
    },
    // Store
    store: {
      title: "Tienda",
      noProducts: "No hay productos disponibles",
      noProductsDescription: "Vuelve pronto para ver mis productos",
      buy: "Comprar",
      schedule: "Agéndalo",
      request: "Solicitar",
      viewPricing: "Ver Pricing",
      price: "Precio",
    },
    // Work Experience
    workExperience: {
      title: "Experiencia Laboral",
      noExperiences: "No hay experiencias laborales disponibles",
      noExperiencesDescription:
        "Vuelve pronto para ver mi experiencia profesional",
      downloadCV: "Descargar CV",
    },
    // Studies
    studies: {
      title: "Estudios",
      noStudies: "No hay estudios disponibles",
      noStudiesDescription: "Vuelve pronto para ver mis estudios",
    },
    // Skills & Technologies
    skills: {
      title: "Stack Tecnológico",
      noTechnologies: "No hay tecnologías disponibles",
      noTechnologiesDescription: "Vuelve pronto para ver mis tecnologías",
    },
    // Admin
    admin: {
      title: "Panel de Administración",
      restrictedAccess: "Acceso Restringido",
      contentManagement: "Gestión de Contenido",
      mediaManagement: "Gestión de Recursos Multimedia",
      products: "Productos",
      projects: "Proyectos",
      clients: "Clientes",
      testimonials: "Testimonios",
      socials: "Redes Sociales",
      events: "Eventos",
      workExperiences: "Experiencia Laboral",
      technologies: "Tecnologías",
      studies: "Estudios",
      noItems: "No hay elementos disponibles",
      createNew: "Crear nuevo",
      editItem: "Editar elemento",
      deleteItem: "Eliminar elemento",
      saveSuccess: "Elemento guardado exitosamente",
      deleteSuccess: "Elemento eliminado exitosamente",
      error: "Error al procesar la solicitud",
    },
  },
  en: {
    // Navigation
    nav: {
      home: "Home",
      studio: "Studio",
      about: "About",
      work: "Work",
      projects: "Projects",
      clients: "Clients",
      workExperience: "Work Experience",
      stack: "Stack",
      studies: "Studies",
      socials: "Social Media",
      store: "Store",
      radio: "Radio",
      blog: "Blog",
      settings: "Settings",
      language: "Language",
      donations: "Donations",
      code: "Code",
      repository: "Repository",
    },
    // Common pages
    common: {
      loading: "Loading...",
      error: "Error",
      noContent: "No content available",
      back: "Back",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      create: "Create",
      update: "Update",
    },
    // Store
    store: {
      title: "Store",
      noProducts: "No products available",
      noProductsDescription: "Come back soon to see my products",
      buy: "Buy",
      schedule: "Schedule",
      request: "Request",
      viewPricing: "View Pricing",
      price: "Price",
    },
    // Work Experience
    workExperience: {
      title: "Work Experience",
      noExperiences: "No work experiences available",
      noExperiencesDescription:
        "Come back soon to see my professional experience",
      downloadCV: "Download CV",
    },
    // Studies
    studies: {
      title: "Studies",
      noStudies: "No studies available",
      noStudiesDescription: "Come back soon to see my studies",
    },
    // Skills & Technologies
    skills: {
      title: "Tech Stack",
      noTechnologies: "No technologies available",
      noTechnologiesDescription: "Come back soon to see my technologies",
    },
    // Admin
    admin: {
      title: "Admin Panel",
      restrictedAccess: "Restricted Access",
      contentManagement: "Content Management",
      mediaManagement: "Media Resources Management",
      products: "Products",
      projects: "Projects",
      clients: "Clients",
      testimonials: "Testimonials",
      socials: "Social Media",
      events: "Events",
      workExperiences: "Work Experience",
      technologies: "Technologies",
      studies: "Studies",
      noItems: "No items available",
      createNew: "Create new",
      editItem: "Edit item",
      deleteItem: "Delete item",
      saveSuccess: "Item saved successfully",
      deleteSuccess: "Item deleted successfully",
      error: "Error processing request",
    },
  },
} as const;

// Hook para usar traducciones
export function useTranslation() {
  const { language } = useLanguageStore();
  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };
  return { t, language };
}

// Función helper para obtener traducción directa
export function getTranslation(key: string, lang?: "es" | "en"): string {
  const language = lang || useLanguageStore.getState().language;
  const keys = key.split(".");
  let value: any = translations[language];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}
