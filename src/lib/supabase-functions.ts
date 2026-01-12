import { supabase } from "./supabase";

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
  const { data, error } = await supabase.rpc("create_request", {
    p_name: params.name,
    p_email: params.email,
    p_request_type: params.request_type,
    p_message: params.message,
  });

  if (error) {
    throw new Error(`Error al crear petición: ${error.message}`);
  }

  // Llamar al webhook de n8n para enviar email (no bloquea si falla)
  const webhookUrl =
    import.meta.env.VITE_N8N_WEBHOOK_URL ||
    "https://n8n-production-cde5.up.railway.app/webhook/status-form";
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
    console.error("Error al enviar webhook:", webhookError);
    // No lanzar error, solo loguear
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
  // Leer desde la tabla blog_posts en Supabase
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Error al obtener posts: ${error.message}`);
  }

  return { posts: data || [] };
}

/**
 * Obtiene todos los posts de blog (para Admin)
 */
export async function getBlogPosts() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("published_at", { ascending: false });

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
  const { data, error } = await supabase
    .from("products")
    .insert(product)
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
    base_price_usd: number;
    base_price_cop: number;
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
export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false }); // Más nuevo primero
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
export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Error al obtener clientes: ${error.message}`);
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
  if (error) throw new Error(`Error al crear cliente: ${error.message}`);
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
  }>
) {
  const { data, error } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Error al actualizar cliente: ${error.message}`);
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(`Error al eliminar cliente: ${error.message}`);
}

// ========== CRUD TESTIMONIALS ==========
// Los testimonios están en la tabla clients, pero los tratamos como entidad separada
export async function getTestimonials() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .not("testimonial_content", "is", null)
    .order("created_at", { ascending: true });
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
  // Eliminar el testimonio (poner campos en null) pero mantener el cliente
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
export async function getSocials() {
  const { data, error } = await supabase
    .from("socials")
    .select("*")
    .order("created_at", { ascending: true });
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
export async function getEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("date", { ascending: true });
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
export async function getWorkExperiences() {
  const { data, error } = await supabase
    .from("work_experiences")
    .select("*")
    .order("start_date", { ascending: false });
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
export async function getTechnologies() {
  const { data, error } = await supabase
    .from("technologies")
    .select("*")
    .order("name", { ascending: true });
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
export async function getStudies() {
  const { data, error } = await supabase
    .from("studies")
    .select("*")
    .order("start_date", { ascending: false });
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
export async function getProductsWithPricing() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      product_pricing (*)
    `
    )
    .order("created_at", { ascending: false });

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

/**
 * Obtiene la playlist de la radio (para reproducción automática cuando no está en vivo)
 */
export async function getPlaylist() {
  const { data, error } = await supabase
    .from("playlist")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Error al obtener playlist: ${error.message}`);
  }

  return data || [];
}
