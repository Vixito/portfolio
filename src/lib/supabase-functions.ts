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
}) {
  const { data, error } = await supabase.rpc("create_request", params);

  if (error) {
    throw new Error(`Error al crear petición: ${error.message}`);
  }

  return data;
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
 * Obtiene posts de blog desde Medium, Dev.to u otras plataformas
 */
export async function fetchBlogPosts(params: {
  platform?: "medium" | "devto" | "all";
  username?: string;
}) {
  const { data, error } = await supabase.functions.invoke("fetch-blog-posts", {
    body: params,
  });

  if (error) {
    throw new Error(`Error al obtener posts: ${error.message}`);
  }

  return data;
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
    throw new Error(`Error al extraer datos del evento: ${error.message}`);
  }

  return data;
}

// ========== CRUD PRODUCTS ==========
export async function createProduct(product: {
  title: string;
  description?: string;
  full_description?: string;
  base_price_usd: number;
  thumbnail_url?: string;
  images?: string[];
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
    description: string;
    full_description: string;
    base_price_usd: number;
    thumbnail_url: string;
    images: string[];
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
  logo: string;
  description: string;
  url: string;
  testimonial_content?: string;
  testimonial_author?: string;
  testimonial_role?: string;
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
    logo: string;
    description: string;
    url: string;
    testimonial_content: string;
    testimonial_author: string;
    testimonial_role: string;
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
  description: string;
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
    description: string;
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
  date: string;
  description?: string;
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
    date: string;
    description: string;
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
  company: string;
  company_url?: string;
  company_logo?: string;
  location: string;
  start_date: string;
  end_date?: string;
  description: string;
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
    company: string;
    company_url: string;
    company_logo: string;
    location: string;
    start_date: string;
    end_date: string;
    description: string;
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
  institution: string;
  type: "degree" | "certification" | "course";
  start_date: string;
  end_date?: string;
  description: string;
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
    institution: string;
    type: "degree" | "certification" | "course";
    start_date: string;
    end_date: string;
    description: string;
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
