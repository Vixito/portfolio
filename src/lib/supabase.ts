import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

// En Vite, las variables de entorno del cliente deben tener el prefijo VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

let supabaseClient: any;

if (isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseUrl !== "tu-url-aqui" && supabaseAnonKey !== "tu-key-aqui") {
  supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    "⚠️ Supabase URL or Anon Key is missing or invalid. Check your environment variables or Doppler setup. Using a mock proxy to prevent app crash and allow design preview."
  );
  
  const dummyHandler: any = {
    get(target: any, prop: string): any {
      if (prop === "functions") {
        return {
          invoke: () => Promise.resolve({ data: null, error: null }),
        };
      }
      if (prop === "auth") {
        return {
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        };
      }
      if (prop === "from") {
        return () => {
          const queryBuilder: any = {
            select: () => queryBuilder,
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => queryBuilder,
            delete: () => queryBuilder,
            eq: () => queryBuilder,
            neq: () => queryBuilder,
            gt: () => queryBuilder,
            lt: () => queryBuilder,
            gte: () => queryBuilder,
            lte: () => queryBuilder,
            like: () => queryBuilder,
            ilike: () => queryBuilder,
            is: () => queryBuilder,
            in: () => queryBuilder,
            order: () => queryBuilder,
            limit: () => queryBuilder,
            range: () => queryBuilder,
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
          };
          return queryBuilder;
        };
      }
      if (prop === "rpc") {
        return () => Promise.resolve({ data: null, error: null });
      }
      return () => Promise.resolve({ data: null, error: null });
    }
  };
  supabaseClient = new Proxy({}, dummyHandler);
}

export const supabase = supabaseClient;

