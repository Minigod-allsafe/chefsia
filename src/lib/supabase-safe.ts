import { supabase } from "@/integrations/supabase/client";

export function getSupabaseUnavailableMessage() {
  return "Connexion temporairement indisponible. Réessayez dans quelques instants.";
}

function hasClientEnv() {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

function hasServerEnv() {
  return Boolean(
    typeof process !== "undefined" &&
      process.env?.SUPABASE_URL &&
      process.env?.SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isSupabaseConfigured() {
  return typeof window === "undefined" ? hasServerEnv() : hasClientEnv();
}

export function getSupabaseClient(): typeof supabase | null {
  if (!isSupabaseConfigured()) return null;

  try {
    void supabase.auth;
    return supabase;
  } catch (error) {
    console.warn("[auth] client initialization skipped:", error);
    return null;
  }
}