import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Attaches the current Supabase access token as Authorization: Bearer <token>
// to every server function call that uses this middleware on the client side.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }
);
