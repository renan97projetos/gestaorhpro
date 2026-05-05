import { supabase } from "@/integrations/supabase/client";

type Acao = "create" | "update" | "delete";

export async function logAudit(params: {
  acao: Acao;
  entidade: string;
  entidade_id?: string | null;
  resumo?: string;
  detalhes?: Record<string, unknown> | null;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("audit_log").insert({
      user_id: u.user.id,
      user_nome: (u.user.user_metadata?.nome as string) || u.user.email,
      user_email: u.user.email,
      acao: params.acao,
      entidade: params.entidade,
      entidade_id: params.entidade_id ?? null,
      resumo: params.resumo ?? null,
      detalhes: params.detalhes ?? null,
      rota: typeof window !== "undefined" ? window.location.pathname : null,
    } as never);
  } catch (err) {
    console.warn("[audit] falhou:", err);
  }
}
