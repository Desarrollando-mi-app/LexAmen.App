// ─── Supabase Admin client ────────────────────────────────────
//
// Cliente con service-role key. Usado SOLO en server (rutas API y
// server actions), NUNCA en componentes client. Bypass de RLS para
// operaciones de Storage que requieren privilegios elevados.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars faltantes para Storage admin client");
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
