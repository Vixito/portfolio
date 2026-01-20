import { supabase } from "./supabase";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Calcula el precio adaptativo de un producto
 */
export async function calculatePricing(params: {
  product_id: string;
  base_currency?: string;
  target_currency: string;
  region?: string;
  quantity?: number;
}) {
  const { data, error } = await supabase.functions.invoke("calculate-pricing", {
    body: params,
  });

  if (error) {
    throw new Error(`Error al calcular precio: ${error.message}`);
  }

  return data;
}

/**
 * Crea una petición usando la función RPC
 */
export async function createRequest(params: {
  name: string;
  email: string;
  request_type: "job" | "collaboration" | "consultation" | "other";
  message: string;
  phone?: string;
  currency?: string;
  investmentRange?: string;
}) {
  // Preparar los parámetros, convirtiendo strings vacíos a null
  const phoneValue = params.phone?.trim() || null;
  const currencyValue = params.currency?.trim() || null;
  const investmentRangeValue = params.investmentRange?.trim() || null;

  const { data, error } = await supabase.rpc("create_request", {
    p_name: params.name,
    p_email: params.email,
    p_request_type: params.request_type,
    p_message: params.message,
    p_phone: phoneValue,
    p_currency: currencyValue,
    p_investment_range: investmentRangeValue,
    // Guardar currency e investmentRange también en metadata por si acaso
    p_metadata: currencyValue || investmentRangeValue
      ? {
          currency: currencyValue,
          investmentRange: investmentRangeValue,
        }
      : null,
  });

  if (error) {
    throw new Error(`Error al crear petición: ${error.message}`);
  }

  // Llamar al webhook de Make.com para enviar email y notificar a Slack (no bloquea si falla)
  const webhookUrl =
    import.meta.env.VITE_MAKE_WEBHOOK_URL ||
    import.meta.env.VITE_N8N_WEBHOOK_URL; // Fallback a n8n si existe
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: params.name,
          email: params.email,
          phone: params.phone || "",
          currency: params.currency || "",
          investmentRange: params.investmentRange || "",
          requestType: params.request_type,
          message: params.message,
        }),
      });
    } catch (webhookError) {
      console.error("Error al enviar webhook a Make.com:", webhookError);
      // No lanzar error, solo loguear
    }
  }

  return data;
}

export async function sendScheduleRequest(params: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
}) {
  // Llamar al webhook de n8n para notificar
  const webhookUrl =
    import.meta.env.VITE_N8N_SCHEDULE_WEBHOOK_URL ||
    "https://n8n-production-cde5.up.railway.app/webhook/status-schedule";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: params.name,
        email: params.email,
        phone: params.phone || "",
        message: params.message || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Error al enviar solicitud de agenda");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al enviar webhook de agenda:", error);
    throw error;
  }
}

/**
 * Obtiene productos con filtros opcionales
 */
export async function getProducts(params?: {
  category_filter?: string;
  min_price?: number;
  max_price?: number;
}) {
  const { data, error } = await supabase.rpc("get_products", params || {});

  if (error) {
    throw new Error(`Error al obtener productos: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene eventos próximos
 */
export async function getUpcomingEvents(limit: number = 10) {
  const { data, error } = await supabase.rpc("get_upcoming_events", {
    limit_count: limit,
  });

  if (error) {
    throw new Error(`Error al obtener eventos: ${error.message}`);
  }

  return data;
}

/**
 * Sincroniza eventos desde passline.com
 */
export async function syncPasslineEvents() {
  const { data, error } = await supabase.functions.invoke(
    "sync-passline-events"
  );

  if (error) {
    throw new Error(`Error al sincronizar eventos: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene posts de blog desde la base de datos
 */
export async function fetchBlogPosts(params?: {
  platform?: "medium" | "devto" | "all";
  username?: string;
}) {
  // Leer desde la tabla blog_posts en Supabase (solo activos)
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("is_active", true)
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener posts: ${error.message}`);
  }

  return { posts: data || [] };
}

/**
 * Obtiene todos los posts de blog (para Admin)
 */
export async function getBlogPosts(includeInactive = false) {
  let query = supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al obtener posts: ${error.message}`);
  }

  return data || [];
}

/**
 * Crea un nuevo post de blog
 */
export async function createBlogPost(post: {
  title: string;
  excerpt: string;
  url: string;
  platform: string;
  thumbnail_url?: string;
  published_at: string;
  author?: string;
}) {
  const { data, error } = await supabase
    .from("blog_posts")
    .insert(post)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear post: ${error.message}`);
  }

  return data;
}

/**
 * Actualiza un post de blog
 */
export async function updateBlogPost(
  id: string,
  updates: Partial<{
    title: string;
    excerpt: string;
    url: string;
    platform: string;
    thumbnail_url: string;
    published_at: string;
    author: string;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar post: ${error.message}`);
  }

  return data;
}

/**
 * Elimina un post de blog
 */
export async function deleteBlogPost(id: string) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar post: ${error.message}`);
  }
}

/**
 * Extrae datos de un evento desde una URL (Passline, start.gg, duel.plus, etc.)
 */
export async function extractEventData(url: string) {
  const { data, error } = await supabase.functions.invoke(
    "extract-event-data",
    {
      body: { url },
    }
  );

  if (error) {
    // Si hay un error con el status code, obtener más detalles
    const errorMessage = error.message || "Error desconocido";
    const statusCode = (error as any).status || (error as any).statusCode;

    if (statusCode && statusCode !== 200) {
      // Intentar obtener el mensaje de error del response
      try {
        const errorData =
          typeof data === "object" && data !== null && "error" in data
            ? (data as any).error
            : errorMessage;
        throw new Error(
          `Error al extraer datos del evento: ${
            errorData || `Status ${statusCode}`
          }`
        );
      } catch {
        throw new Error(
          `Error al extraer datos del evento: ${errorMessage} (Status: ${statusCode})`
        );
      }
    }

    throw new Error(`Error al extraer datos del evento: ${errorMessage}`);
  }

  // Si data tiene un campo error, lanzarlo
  if (data && typeof data === "object" && "error" in data) {
    throw new Error(
      `Error al extraer datos del evento: ${(data as any).error}`
    );
  }

  return data;
}

// ========== CRUD PRODUCTS ==========
/**
 * Genera un ID público aleatorio para productos (8 caracteres alfanuméricos)
 */
function generatePublicId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin I, O, 0, 1 para evitar confusión
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createProduct(product: {
  title: string;
  description?: string;
  full_description?: string;
  base_price_usd?: number;
  base_price_cop?: number;
  price_currency?: "USD" | "COP";
  sector?: string;
  thumbnail_url?: string;
  images?: string[];
  // Nueva estructura de botones
  button_type?: "buy" | "request";
  buy_button_type?: "external_link" | "custom_checkout";
  buy_button_url?: string;
  request_button_type?: "external_link" | "custom_form";
  request_button_url?: string;
  // Campos antiguos (mantener por compatibilidad durante migración)
  action_type?: "link" | "submit" | "schedule";
  action_url?: string;
  pricing_link?: string;
  button_text?: string;
}) {
  // Generar public_id único
  let publicId = generatePublicId();
  let attempts = 0;
  const maxAttempts = 10;
  
  // Verificar que el public_id sea único
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("public_id", publicId)
      .maybeSingle();
    
    if (!existing) {
      break; // public_id es único
    }
    
    publicId = generatePublicId();
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    throw new Error("No se pudo generar un ID público único después de varios intentos");
  }
  
  const { data, error } = await supabase
    .from("products")
    .insert({ ...product, public_id: publicId })
    .select()
    .single();

  if (error) throw new Error(`Error al crear producto: ${error.message}`);
  return data;
}

export async function updateProduct(
  id: string,
  updates: Partial<{
    title: string;
    title_translations?: { es?: string; en?: string } | null;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    full_description: string;
    full_description_translations?: { es?: string; en?: string } | null;
    base_price_usd: number | null;
    base_price_cop: number | null;
    price_currency: "USD" | "COP";
    sector: string;
    thumbnail_url: string;
    images: string[];
    // Nueva estructura de botones
    button_type: "buy" | "request";
    buy_button_type: "external_link" | "custom_checkout";
    buy_button_url:
      | string
      | Array<{ label: string; url: string; simultaneous_urls?: string[] }>
      | null;
    request_button_type: "external_link" | "custom_form";
    request_button_url: string;
    // Campos antiguos (mantener por compatibilidad durante migración)
    action_type: "link" | "submit" | "schedule";
    action_url: string;
    pricing_link: string;
    button_text: string;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("products")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar producto: ${error.message}`);
  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar producto: ${error.message}`);
}

// ========== CRUD PROJECTS ==========
export async function getProjects(includeInactive = false) {
  let query = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false }); // Más nuevo primero

  // Filtrar por is_active solo si no se incluyen inactivos (frontend)
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener proyectos: ${error.message}`);
  return data;
}

export async function createProject(project: {
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  url: string;
  repository?: string;
  month: string;
  year: number;
  thumbnail?: string;
  is_special?: boolean;
}) {
  const { data, error } = await supabase
    .from("projects")
    .insert(project)
    .select()
    .single();
  if (error) throw new Error(`Error al crear proyecto: ${error.message}`);
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<{
    title: string;
    title_translations?: { es?: string; en?: string } | null;
    url: string;
    repository: string;
    month: string;
    year: number;
    thumbnail: string;
    is_special: boolean;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Error al actualizar proyecto: ${error.message}`);
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar proyecto: ${error.message}`);
}

// ========== CRUD CLIENTS ==========
export async function getClients(includeInactive = false) {
  let query = supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener abonadores: ${error.message}`);
  return data;
}

export async function createClient(client: {
  name: string;
  name_translations?: { es?: string; en?: string } | null;
  logo: string;
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  url: string;
  testimonial_content?: string;
  testimonial_content_translations?: { es?: string; en?: string } | null;
  testimonial_author?: string;
  testimonial_author_translations?: { es?: string; en?: string } | null;
  testimonial_role?: string;
  testimonial_role_translations?: { es?: string; en?: string } | null;
  testimonial_url?: string;
}) {
  const { data, error } = await supabase
    .from("clients")
    .insert(client)
    .select()
    .single();
  if (error) throw new Error(`Error al crear abonador: ${error.message}`);
  return data;
}

export async function updateClient(
  id: string,
  updates: Partial<{
    name: string;
    name_translations?: { es?: string; en?: string } | null;
    logo: string;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    url: string;
    testimonial_content: string;
    testimonial_content_translations?: { es?: string; en?: string } | null;
    testimonial_author: string;
    testimonial_author_translations?: { es?: string; en?: string } | null;
    testimonial_role: string;
    testimonial_role_translations?: { es?: string; en?: string } | null;
    testimonial_url: string;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Error al actualizar abonador: ${error.message}`);
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar abonador: ${error.message}`);
}

// ========== CRUD TESTIMONIALS ==========
// Los testimonios están en la tabla clients, pero los tratamos como entidad separada (nota: "clients" es el nombre técnico de la tabla, pero conceptualmente son "abonadores")
export async function getTestimonials(includeInactive = false) {
  let query = supabase
    .from("clients")
    .select("*")
    .not("testimonial_content", "is", null)
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener testimonios: ${error.message}`);
  return data;
}

export async function createTestimonial(testimonial: {
  client_id: string; // ID del cliente al que pertenece el testimonio
  testimonial_content: string;
  testimonial_author: string;
  testimonial_role?: string;
  testimonial_url?: string;
}) {
  const { data, error } = await supabase
    .from("clients")
    .update({
      testimonial_content: testimonial.testimonial_content,
      testimonial_author: testimonial.testimonial_author,
      testimonial_role: testimonial.testimonial_role,
      testimonial_url: testimonial.testimonial_url,
    })
    .eq("id", testimonial.client_id)
    .select()
    .single();
  if (error) throw new Error(`Error al crear testimonio: ${error.message}`);
  return data;
}

export async function updateTestimonial(
  clientId: string,
  updates: Partial<{
    testimonial_content: string;
    testimonial_author: string;
    testimonial_role: string;
    testimonial_url: string;
  }>
) {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", clientId)
    .select()
    .single();
  if (error)
    throw new Error(`Error al actualizar testimonio: ${error.message}`);
  return data;
}

export async function deleteTestimonial(clientId: string) {
  // Eliminar el testimonio (poner campos en null) pero mantener el abonador
  const { data, error } = await supabase
    .from("clients")
    .update({
      testimonial_content: null,
      testimonial_author: null,
      testimonial_role: null,
      testimonial_url: null,
    })
    .eq("id", clientId)
    .select()
    .single();
  if (error) throw new Error(`Error al eliminar testimonio: ${error.message}`);
  return data;
}

// ========== CRUD SOCIALS ==========
export async function getSocials(includeInactive = false) {
  let query = supabase
    .from("socials")
    .select("*")
    .order("created_at", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`Error al obtener redes sociales: ${error.message}`);
  return data;
}

export async function createSocial(social: {
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  logo: string;
  url: string;
  image?: string;
  category?: string;
}) {
  const { data, error } = await supabase
    .from("socials")
    .insert(social)
    .select()
    .single();
  if (error) throw new Error(`Error al crear red social: ${error.message}`);
  return data;
}

export async function updateSocial(
  id: string,
  updates: Partial<{
    title: string;
    title_translations?: { es?: string; en?: string } | null;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    logo: string;
    url: string;
    image: string;
    category: string;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("socials")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    throw new Error(`Error al actualizar red social: ${error.message}`);
  return data;
}

export async function deleteSocial(id: string) {
  const { error } = await supabase.from("socials").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar red social: ${error.message}`);
}

// ========== CRUD EVENTS ==========
export async function getEvents(includeInactive = false) {
  let query = supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener eventos: ${error.message}`);
  return data;
}

export async function createEvent(event: {
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  date: string;
  description?: string;
  description_translations?: { es?: string; en?: string } | null;
  passline_url: string;
  thumbnail_url?: string;
}) {
  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select()
    .single();
  if (error) throw new Error(`Error al crear evento: ${error.message}`);
  return data;
}

export async function updateEvent(
  id: string,
  updates: Partial<{
    title: string;
    title_translations?: { es?: string; en?: string } | null;
    date: string;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    passline_url: string;
    thumbnail_url: string;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Error al actualizar evento: ${error.message}`);
  return data;
}

export async function deleteEvent(id: string) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar evento: ${error.message}`);
}

// ========== CRUD WORK EXPERIENCES ==========
export async function getWorkExperiences(includeInactive = false) {
  let query = supabase
    .from("work_experiences")
    .select("*")
    .order("start_date", { ascending: false });

  // Filtrar por is_active solo si no se incluyen inactivos (frontend)
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error)
    throw new Error(
      `Error al obtener experiencias laborales: ${error.message}`
    );
  return data;
}

export async function createWorkExperience(experience: {
  position: string;
  position_translations?: { es?: string; en?: string } | null;
  company: string;
  company_translations?: { es?: string; en?: string } | null;
  company_url?: string;
  company_logo?: string;
  location: string;
  location_translations?: { es?: string; en?: string } | null;
  start_date: string;
  end_date?: string;
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  responsibilities: string[]; // JSON array
  technologies: string[]; // JSON array
  type: "full-time" | "part-time" | "contract" | "freelance";
  status: "current" | "past";
}) {
  const { data, error } = await supabase
    .from("work_experiences")
    .insert({
      ...experience,
      responsibilities: experience.responsibilities,
      technologies: experience.technologies,
    })
    .select()
    .single();
  if (error)
    throw new Error(`Error al crear experiencia laboral: ${error.message}`);
  return data;
}

export async function updateWorkExperience(
  id: string,
  updates: Partial<{
    position: string;
    position_translations?: { es?: string; en?: string } | null;
    company: string;
    company_translations?: { es?: string; en?: string } | null;
    company_url: string;
    company_logo: string;
    location: string;
    location_translations?: { es?: string; en?: string } | null;
    start_date: string;
    end_date: string;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    responsibilities: string[];
    technologies: string[];
    type: "full-time" | "part-time" | "contract" | "freelance";
    status: "current" | "past";
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("work_experiences")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    throw new Error(
      `Error al actualizar experiencia laboral: ${error.message}`
    );
  return data;
}

export async function deleteWorkExperience(id: string) {
  const { error } = await supabase
    .from("work_experiences")
    .delete()
    .eq("id", id);
  if (error)
    throw new Error(`Error al eliminar experiencia laboral: ${error.message}`);
}

// ========== CRUD TECHNOLOGIES ==========
export async function getTechnologies(includeInactive = false) {
  let query = supabase
    .from("technologies")
    .select("*")
    .order("name", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener tecnologías: ${error.message}`);
  return data;
}

export async function createTechnology(technology: {
  name: string;
  name_translations?: { es?: string; en?: string } | null;
  category:
    | "language"
    | "framework"
    | "database"
    | "tool"
    | "cloud"
    | "instrument"
    | "music"
    | "other";
  level: "beginner" | "intermediate" | "advanced" | "expert";
  icon?: string;
  years_of_experience?: number;
  start_year?: number;
}) {
  const { data, error } = await supabase
    .from("technologies")
    .insert(technology)
    .select()
    .single();
  if (error) throw new Error(`Error al crear tecnología: ${error.message}`);
  return data;
}

export async function updateTechnology(
  id: string,
  updates: Partial<{
    name: string;
    name_translations?: { es?: string; en?: string } | null;
    category:
      | "language"
      | "framework"
      | "database"
      | "tool"
      | "cloud"
      | "instrument"
      | "music"
      | "other";
    level: "beginner" | "intermediate" | "advanced" | "expert";
    icon: string;
    years_of_experience: number;
    start_year?: number;
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("technologies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error)
    throw new Error(`Error al actualizar tecnología: ${error.message}`);
  return data;
}

export async function deleteTechnology(id: string) {
  const { error } = await supabase.from("technologies").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar tecnología: ${error.message}`);
}

// ========== CRUD STUDIES ==========
export async function getStudies(includeInactive = false) {
  let query = supabase
    .from("studies")
    .select("*")
    .order("start_date", { ascending: false });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Error al obtener estudios: ${error.message}`);
  return data;
}

export async function createStudy(study: {
  title: string;
  title_translations?: { es?: string; en?: string } | null;
  institution: string;
  institution_translations?: { es?: string; en?: string } | null;
  type: "degree" | "certification" | "course";
  start_date: string;
  end_date?: string;
  description: string;
  description_translations?: { es?: string; en?: string } | null;
  logo?: string;
  certificate_url?: string;
  status: "completed" | "in-progress";
}) {
  const { data, error } = await supabase
    .from("studies")
    .insert(study)
    .select()
    .single();
  if (error) throw new Error(`Error al crear estudio: ${error.message}`);
  return data;
}

export async function updateStudy(
  id: string,
  updates: Partial<{
    title: string;
    title_translations?: { es?: string; en?: string } | null;
    institution: string;
    institution_translations?: { es?: string; en?: string } | null;
    type: "degree" | "certification" | "course";
    start_date: string;
    end_date: string;
    description: string;
    description_translations?: { es?: string; en?: string } | null;
    logo: string;
    certificate_url: string;
    status: "completed" | "in-progress";
    is_active?: boolean;
  }>
) {
  const { data, error } = await supabase
    .from("studies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Error al actualizar estudio: ${error.message}`);
  return data;
}

export async function deleteStudy(id: string) {
  const { error } = await supabase.from("studies").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar estudio: ${error.message}`);
}

// ========== USER STATUS ==========
export async function getUserStatus() {
  // Obtener el status del usuario (solo hay un registro)
  const { data, error } = await supabase
    .from("user_status")
    .select("*")
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned, es normal si no existe registro
    throw new Error(`Error al obtener status: ${error.message}`);
  }

  // Si no existe, retornar "busy" por defecto
  return data?.status || "busy";
}

export async function updateUserStatus(status: "available" | "away" | "busy") {
  // Upsert: actualizar si existe, crear si no existe
  const { data, error } = await supabase
    .from("user_status")
    .upsert(
      { id: 1, status, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Error al actualizar status: ${error.message}`);
  return data;
}

/**
 * Obtiene la tasa de cambio USD/COP en tiempo real
 */
export async function getExchangeRate(
  baseCurrency: string = "USD",
  targetCurrency: string = "COP"
) {
  const { data, error } = await supabase.functions.invoke("get-exchange-rate", {
    body: {
      base: baseCurrency,
      target: targetCurrency,
    },
  });

  if (error) {
    throw new Error(`Error al obtener tasa de cambio: ${error.message}`);
  }

  return data;
}

// ========== PRODUCT PRICING ==========
/**
 * Obtiene el pricing de un producto (precio actual y ofertas)
 */
export async function getProductPricing(productId: string) {
  const { data, error } = await supabase
    .from("product_pricing")
    .select("*")
    .eq("product_id", productId)
    .single();

  if (error && error.code !== "PGRST116") {
    throw new Error(`Error al obtener pricing: ${error.message}`);
  }

  return data;
}

/**
 * Actualiza el pricing de un producto (incluyendo ofertas)
 */
export async function updateProductPricing(
  productId: string,
  updates: {
    is_on_sale?: boolean;
    sale_percentage?: number;
    sale_starts_at?: string;
    sale_ends_at?: string;
  }
) {
  // Si hay oferta, calcular precios con descuento
  let salePriceCop: number | null = null;
  let salePriceUsd: number | null = null;

  if (updates.is_on_sale && updates.sale_percentage) {
    // Obtener precio actual
    const currentPricing = await getProductPricing(productId);
    if (currentPricing) {
      const discount = updates.sale_percentage / 100;
      salePriceCop = currentPricing.current_price_cop * (1 - discount);
      salePriceUsd = currentPricing.current_price_usd * (1 - discount);
    }
  }

  const { data, error } = await supabase
    .from("product_pricing")
    .update({
      ...updates,
      sale_price_cop: salePriceCop,
      sale_price_usd: salePriceUsd,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar pricing: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene todos los productos con su pricing
 */
export async function getProductsWithPricing(includeInactive = false) {
  let query = supabase
    .from("products")
    .select(
      `
      *,
      product_pricing (*)
    `
    )
    .order("created_at", { ascending: false });

  // Filtrar por is_active solo si no se incluyen inactivos (frontend)
  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al obtener productos: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene multiplicadores por sector
 */
export async function getSectorMultipliers() {
  const { data, error } = await supabase
    .from("sector_multipliers")
    .select("*")
    .order("sector_name", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener multiplicadores: ${error.message}`);
  }

  return data;
}

// ========== CRUD INVOICES ==========
export async function getInvoices() {
  // Usar service_role_key para bypass RLS (solo para Admin)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  
  // Si service_role_key no está configurado, usar cliente normal (puede fallar por RLS)
  const client = supabaseServiceKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceKey)
    : supabase;
  
  const { data, error } = await client
    .from("invoices")
    .select(`
      *,
      products (id, title)
    `)
    .order("invoice_number", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener facturas: ${error.message}`);
  }

  return data;
}

export async function getInvoice(id: string) {
  // Usar service_role_key para bypass RLS (solo para Admin)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  
  // Si service_role_key no está configurado, usar cliente normal (puede fallar por RLS)
  const client = supabaseServiceKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceKey)
    : supabase;
  
  const { data, error } = await client
    .from("invoices")
    .select(`
      *,
      products (id, title, description, full_description)
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Error al obtener factura: ${error.message}`);
  }

  return data;
}

export async function createInvoice(invoice: {
  product_id: string;
  user_name: string;
  user_email: string;
  request_type: string;
  amount: number;
  currency: "USD" | "COP";
  delivery_time: string;
  custom_fields?: Record<string, any>;
  status?: "pending" | "paid" | "completed" | "cancelled";
}) {
  // Usar service_role_key para bypass RLS (solo para Admin)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  
  // Validar que service_role_key esté configurado
  if (!supabaseServiceKey) {
    throw new Error(
      "VITE_SUPABASE_SERVICE_ROLE_KEY no está configurado. " +
      "Agrega esta variable en Doppler para poder crear facturas desde Admin."
    );
  }
  
  // Crear cliente con service_role_key (bypass RLS)
  const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
  
  // Obtener el siguiente número de factura
  const { data: lastInvoice, error: lastInvoiceError } = await adminSupabase
    .from("invoices")
    .select("invoice_number")
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastInvoiceError && lastInvoiceError.code !== "PGRST116") {
    // PGRST116 es "no rows returned", que es válido si no hay facturas
    throw new Error(`Error al obtener último número de factura: ${lastInvoiceError.message}`);
  }

  const nextInvoiceNumber = lastInvoice?.invoice_number
    ? lastInvoice.invoice_number + 1
    : 1;

  const { data, error } = await adminSupabase
    .from("invoices")
    .insert({
      ...invoice,
      invoice_number: nextInvoiceNumber,
      status: invoice.status || "pending",
    })
    .select()
    .single();

  if (error) {
    // Mensaje de error más descriptivo
    if (error.message.includes("users")) {
      throw new Error(
        `Error al crear factura: ${error.message}. ` +
        `Esto puede deberse a un trigger en la base de datos que intenta acceder a la tabla 'users'. ` +
        `Verifica que el trigger tenga permisos adecuados o que la tabla 'users' tenga RLS configurado correctamente.`
      );
    }
    throw new Error(`Error al crear factura: ${error.message}`);
  }

  return data;
}

export async function updateInvoice(
  id: string,
  updates: Partial<{
    user_name: string;
    user_email: string;
    request_type: string;
    amount: number;
    currency: "USD" | "COP";
    delivery_time: string;
    custom_fields: Record<string, any>;
    status: "pending" | "paid" | "completed" | "cancelled";
  }>
) {
  // Usar service_role_key para bypass RLS (solo para Admin)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  const adminSupabase = supabaseServiceKey
    ? createSupabaseClient(supabaseUrl, supabaseServiceKey)
    : supabase;
  
  // Verificar que la factura no esté pagada antes de actualizar
  const { data: currentInvoice } = await adminSupabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (currentInvoice?.status === "paid" || currentInvoice?.status === "completed") {
    throw new Error("No se puede editar una factura que ya está pagada o completada");
  }

  const { data, error } = await adminSupabase
    .from("invoices")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar factura: ${error.message}`);
  }

  return data;
}

export async function deleteInvoice(id: string) {
  // Usar service_role_key para bypass RLS (solo para Admin)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  
  // Validar que service_role_key esté configurado
  if (!supabaseServiceKey) {
    throw new Error(
      "VITE_SUPABASE_SERVICE_ROLE_KEY no está configurado. " +
      "Agrega esta variable en Doppler para poder eliminar facturas desde Admin."
    );
  }
  
  const adminSupabase = createSupabaseClient(supabaseUrl, supabaseServiceKey);
  
  // Verificar que la factura no esté pagada antes de eliminar
  const { data: currentInvoice } = await adminSupabase
    .from("invoices")
    .select("status")
    .eq("id", id)
    .single();

  if (currentInvoice?.status === "paid" || currentInvoice?.status === "completed") {
    throw new Error("No se puede eliminar una factura que ya está pagada o completada");
  }

  const { error } = await adminSupabase.from("invoices").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar factura: ${error.message}`);
  }
}

export async function markInvoiceAsPaid(id: string, transactionId: string) {
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      transaction_id: transactionId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al marcar factura como pagada: ${error.message}`);
  }

  return data;
}

/**
 * Obtiene la playlist de la radio (para reproducción automática cuando no está en vivo)
 * Las URLs deben apuntar a Google Cloud Storage (storage.googleapis.com)
 */
export async function getPlaylist() {
  const { data, error } = await supabase
    .from("playlist")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener playlist: ${error.message}`);
  }

  // Filtrar solo URLs de GCS (ignorar URLs de Supabase Storage para evitar CORS)
  const gcsPlaylist = (data || []).filter(
    (item: any) =>
      item.url &&
      (item.url.includes("storage.googleapis.com") ||
        item.url.includes("googleapis.com"))
  );

  return gcsPlaylist.length > 0 ? gcsPlaylist : data || [];
}

/**
 * Obtiene el contenido de HomeSection desde Supabase
 */
export async function getHomeContent() {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener contenido de Home: ${error.message}`);
  }

  return data || [];
}

/**
 * Obtiene el último post de blog para HomeSection
 */
export async function getLatestBlogPost() {
  try {
    // Primero verificar si hay configuración en home_content
    const { data: homeContent, error: homeContentError } = await supabase
      .from("home_content")
      .select("*")
      .eq("content_type", "latest_post")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!homeContentError && homeContent && homeContent.blog_post_id) {
      // Si hay referencia a un blog_post, obtenerlo
      const { data: blogPost, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", homeContent.blog_post_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && blogPost) {
        return {
          ...blogPost,
          tags: homeContent.latest_post_tags || [],
        };
      }
    }

    // Si no hay configuración o falla, obtener el más reciente
    const { data: blogPosts, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_active", true)
      .order("published_at", { ascending: false })
      .limit(1);

    if (error || !blogPosts || blogPosts.length === 0) {
      return null;
    }

    const post = blogPosts[0];

    // Parsear tags desde el platform (convertir #Medium a "Medium", etc.)
    const platform = post.platform || "";
    const tags = platform ? [`#${platform}`] : [];

    return {
      ...post,
      tags: homeContent?.latest_post_tags || tags,
    };
  } catch (error) {
    console.error("Error en getLatestBlogPost:", error);
    return null;
  }
}

/**
 * Obtiene las experiencias laborales para HomeSection
 */
export async function getHomeWorkExperiences() {
  try {
    const { data: homeContent, error: homeContentError } = await supabase
      .from("home_content")
      .select("*")
      .eq("content_type", "work_experience")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(3);

    if (!homeContentError && homeContent && homeContent.length > 0) {
      // Si hay configuración, usar esos datos
      const experiences = [];
      for (const content of homeContent) {
        if (content.work_experience_id) {
          const { data: exp, error: expError } = await supabase
            .from("work_experiences")
            .select("*")
            .eq("id", content.work_experience_id)
            .eq("is_active", true)
            .maybeSingle();
          if (!expError && exp) experiences.push(exp);
        } else if (content.work_experience_data) {
          experiences.push(content.work_experience_data);
        }
      }
      if (experiences.length > 0) {
        return experiences;
      }
    }

    // Si no hay configuración, obtener las 3 más recientes
    const { data: experiences, error } = await supabase
      .from("work_experiences")
      .select("*")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(3);

    if (error) {
      console.error("Error al obtener experiencias:", error);
      return [];
    }

    return experiences || [];
  } catch (error) {
    console.error("Error en getHomeWorkExperiences:", error);
    return [];
  }
}

/**
 * Obtiene la URL del CV para descarga según el idioma
 * @param language - Idioma actual ("es" | "en")
 */
export async function getCVDownloadUrl(language: "es" | "en" = "es") {
  try {
    const { data: homeContent, error } = await supabase
      .from("home_content")
      .select("*")
      .eq("content_type", "cv_download")
      .eq("is_active", true)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !homeContent) {
      return null;
    }

    // Obtener URL y texto según el idioma
    const urlField = language === "es" ? "cv_download_url_es" : "cv_download_url_en";
    const textField = language === "es" ? "cv_download_text_es" : "cv_download_text_en";
    
    // Fallback a campos antiguos si los nuevos no existen (compatibilidad)
    const url = homeContent[urlField] || homeContent.cv_download_url || null;
    const text = homeContent[textField] || homeContent.cv_download_text || (language === "es" ? "Descargar CV" : "Download CV");

    if (!url) {
      return null;
    }

    return {
      url,
      text,
    };
  } catch (error) {
    console.error("Error en getCVDownloadUrl:", error);
    return null;
  }
}

/**
 * Obtiene los proyectos para HomeSection (ScrollableCardStack)
 */
export async function getHomeProjects() {
  try {
    // Obtener TODOS los registros de home_content con content_type = "projects"
    const { data: homeContentList, error: homeContentError } = await supabase
      .from("home_content")
      .select("*")
      .eq("content_type", "projects")
      .eq("is_active", true)
      .order("order_index", { ascending: true });

    if (homeContentError || !homeContentList || homeContentList.length === 0) {
      return [];
    }

    const allProjects: any[] = [];

    // Procesar cada registro de home_content
    for (const homeContent of homeContentList) {
      // Caso 1: Hay project_ids configurados - obtener proyectos de la tabla projects
      if (homeContent.project_ids && homeContent.project_ids.length > 0) {
        const { data: projects, error } = await supabase
          .from("projects")
          .select("*")
          .in("id", homeContent.project_ids)
          .eq("is_active", true);

        if (!error && projects && projects.length > 0) {
          // Ordenar según el orden en project_ids y aplicar overrides de home_content
          const mappedProjects = homeContent.project_ids
            .map((id: string) => {
              const project = projects.find((p) => p.id === id);
              if (!project) return null;
              // Si hay project_data en home_content, usarlo como override
              const projectData = homeContent.project_data || {};
              return {
                ...project,
                url: projectData.url || project.url || "",
                thumbnail:
                  projectData.thumbnail_url ||
                  project.thumbnail ||
                  project.thumbnail_url ||
                  "",
                month: projectData.month || project.month || "",
                year:
                  projectData.year || project.year || new Date().getFullYear(),
              };
            })
            .filter(Boolean);

          allProjects.push(...mappedProjects);
        }
      }

      // Caso 2: No hay project_ids pero hay project_data - crear proyecto virtual
      // Esto permite agregar proyectos que no están en /projects
      if (
        (!homeContent.project_ids || homeContent.project_ids.length === 0) &&
        homeContent.project_data
      ) {
        const projectData = homeContent.project_data;
        // Si hay datos suficientes (al menos título o thumbnail), crear el proyecto
        if (projectData.title || projectData.thumbnail_url) {
          allProjects.push({
            id: `home-content-${homeContent.id}`, // ID virtual
            title: projectData.title || "Proyecto",
            url: projectData.url || "",
            thumbnail: projectData.thumbnail_url || "",
            month: projectData.month || "",
            year: projectData.year || new Date().getFullYear(),
            created_at: homeContent.created_at || new Date().toISOString(),
          });
        }
      }
    }

    // Retornar todos los proyectos combinados
    return allProjects;
  } catch (error) {
    console.error("Error en getHomeProjects:", error);
    return [];
  }
}

/**
 * CRUD para home_content (Admin Panel)
 */
export async function getHomeContentItems() {
  const { data, error } = await supabase
    .from("home_content")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener contenido: ${error.message}`);
  }

  return data || [];
}

export async function createHomeContentItem(item: {
  content_type: "latest_post" | "work_experience" | "projects" | "cv_download";
  blog_post_id?: string;
  latest_post_title?: string;
  latest_post_excerpt?: string;
  latest_post_url?: string;
  latest_post_date?: string;
  latest_post_tags?: string[];
  work_experience_id?: string;
  work_experience_data?: any;
  project_ids?: string[];
  project_data?: {
    title?: string;
    url?: string;
    thumbnail_url?: string;
    month?: string;
    year?: number;
  };
  cv_download_url?: string; // Campo antiguo (compatibilidad)
  cv_download_text?: string; // Campo antiguo (compatibilidad)
  cv_download_url_es?: string;
  cv_download_url_en?: string;
  cv_download_text_es?: string;
  cv_download_text_en?: string;
  is_active?: boolean;
  order_index?: number;
}) {
  // Preparar el item para insertar, manejando project_data como JSONB
  const insertData: any = { ...item };

  // Si project_data existe, asegurarse de que se guarde como JSONB
  // Supabase automáticamente convierte objetos a JSONB si la columna existe
  // Si la columna no existe, necesitamos crearla primero en Supabase
  // Por ahora, intentamos insertar y si falla, el usuario necesitará crear la columna

  const { data, error } = await supabase
    .from("home_content")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al crear contenido: ${error.message}`);
  }

  return data;
}

export async function updateHomeContentItem(
  id: string,
  updates: Partial<{
    content_type:
      | "latest_post"
      | "work_experience"
      | "projects"
      | "cv_download";
    blog_post_id: string;
    latest_post_title: string;
    latest_post_excerpt: string;
    latest_post_url: string;
    latest_post_date: string;
    latest_post_tags: string[];
    work_experience_id: string;
    work_experience_data: any;
    project_ids: string[];
    project_data: {
      title?: string;
      url?: string;
      thumbnail_url?: string;
      month?: string;
      year?: number;
    };
    cv_download_url: string; // Campo antiguo (compatibilidad)
    cv_download_text: string; // Campo antiguo (compatibilidad)
    cv_download_url_es: string;
    cv_download_url_en: string;
    cv_download_text_es: string;
    cv_download_text_en: string;
    is_active: boolean;
    order_index: number;
  }>
) {
  const { data, error } = await supabase
    .from("home_content")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error al actualizar contenido: ${error.message}`);
  }

  return data;
}

export async function deleteHomeContentItem(id: string) {
  const { error } = await supabase.from("home_content").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al eliminar contenido: ${error.message}`);
  }
}

/**
 * Obtener configuración de la radio (jingle, etc.)
 */
export async function getRadioSettings() {
  try {
    const { data, error } = await supabase
      .from("radio_settings")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Si la tabla no existe, retornar valores por defecto
      if (error.code === "42P01") {
        return {
          jingle_url: import.meta.env.VITE_RADIO_JINGLE_URL || "",
          jingle_interval: parseInt(
            import.meta.env.VITE_RADIO_JINGLE_INTERVAL || "5",
            10
          ),
        };
      }
      throw error;
    }

    // Si hay configuración, usarla; si no, usar valores por defecto
    return {
      jingle_url: data?.jingle_url || import.meta.env.VITE_RADIO_JINGLE_URL || "",
      jingle_interval: data?.jingle_interval || parseInt(
        import.meta.env.VITE_RADIO_JINGLE_INTERVAL || "5",
        10
      ),
    };
  } catch (error) {
    // Si falla, usar valores por defecto desde variables de entorno
    return {
      jingle_url: import.meta.env.VITE_RADIO_JINGLE_URL || "",
      jingle_interval: parseInt(
        import.meta.env.VITE_RADIO_JINGLE_INTERVAL || "5",
        10
      ),
    };
  }
}

/**
 * Actualizar configuración de la radio
 */
export async function updateRadioSettings(settings: {
  jingle_url?: string;
  jingle_interval?: number;
  is_active?: boolean;
}) {
  try {
    // Primero intentar obtener la configuración existente (activa o inactiva)
    const { data: existing, error: fetchError } = await supabase
      .from("radio_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 es "no rows returned", que es válido si no hay registros
      throw new Error(`Error al obtener configuración: ${fetchError.message}`);
    }

    // Preparar datos para insertar/actualizar
    const settingsData: {
      jingle_url?: string;
      jingle_interval?: number;
      is_active?: boolean;
      updated_at?: string;
    } = {
      ...settings,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Actualizar existente
      const { data, error } = await supabase
        .from("radio_settings")
        .update(settingsData)
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error al actualizar configuración: ${error.message} (código: ${error.code})`);
      }
      return data;
    } else {
      // Crear nueva configuración
      const { data, error } = await supabase
        .from("radio_settings")
        .insert({
          jingle_url: settings.jingle_url || "",
          jingle_interval: settings.jingle_interval || 5,
          is_active: settings.is_active !== undefined ? settings.is_active : true,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error al crear configuración: ${error.message} (código: ${error.code})`);
      }
      return data;
    }
  } catch (error) {
    // Re-lanzar con mensaje más descriptivo
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Error desconocido al actualizar configuración de radio: ${String(error)}`);
  }
}
