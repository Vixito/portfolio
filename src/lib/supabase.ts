import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

// En Vite, las variables de entorno del cliente deben tener el prefijo VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "tu-url-aqui";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "tu-key-aqui";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
