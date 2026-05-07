import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Sends the current Supabase access token both as Authorization header and via
// sendContext, so the server can validate it even if header forwarding fails.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      sendContext: { accessToken: token },
    });
  }
);
