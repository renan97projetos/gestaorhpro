import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-client-middleware";

// Server-side auth middleware that accepts the Supabase access token either
// from the Authorization header OR from client-sent context (fallback for
// when fetch headers aren't forwarded by the runtime).
export const supabaseAuth = createMiddleware({ type: "function" })
  .middleware([attachSupabaseAuth])
  .server(async ({ next, context }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

    let token: string | null = (context as { accessToken?: string | null })?.accessToken ?? null;
    if (!token) {
      try {
        const req = getRequest();
        const auth = req?.headers.get("authorization");
        if (auth?.startsWith("Bearer ")) token = auth.slice(7);
      } catch { /* noop */ }
    }
    if (!token) throw new Error("Sessão não encontrada. Faça login novamente.");

    const sb = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data.user) throw new Error("Token inválido. Faça login novamente.");

    return next({ context: { supabase: sb, userId: data.user.id } });
  });
