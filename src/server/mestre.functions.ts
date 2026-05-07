import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function admin() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertMestre(supabase: ReturnType<typeof admin>, userId: string) {
  const { data, error } = await supabase.from("admin_mestres").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso restrito ao Admin Mestre");
}

type CriarInput = {
  empresa_id: string;
  email: string;
  password: string;
  nome: string;
  role: "admin" | "gestor" | "visualizador";
};

export const mestreCriarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CriarInput) => {
    if (!input?.email || !input?.password || !input?.empresa_id) throw new Error("Dados incompletos");
    if (input.password.length < 6) throw new Error("Senha mínima de 6 caracteres");
    if (!["admin", "gestor", "visualizador"].includes(input.role)) throw new Error("Papel inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);

    // Cria usuário (auto-confirmado)
    let userId: string | null = null;
    const created = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (created.error) {
      // se já existir, tenta achar
      const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(created.error.message);
      userId = existing.id;
    } else {
      userId = created.data.user!.id;
    }

    // garante profile
    await sb.from("profiles").upsert({ id: userId!, nome: data.nome, email: data.email } as never);

    // vincula à empresa
    const { error: linkErr } = await sb
      .from("empresa_membros")
      .upsert({ empresa_id: data.empresa_id, user_id: userId!, role: data.role } as never, {
        onConflict: "empresa_id,user_id",
      });
    if (linkErr) throw new Error(linkErr.message);

    return { ok: true, user_id: userId };
  });

export const mestreResetSenha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; password: string }) => {
    if (!input.user_id || !input.password || input.password.length < 6) throw new Error("Dados inválidos");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { error } = await sb.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mestreToggleBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { empresa_id: string; bloqueada: boolean }) => input)
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { error } = await sb.from("empresas").update({ bloqueada: data.bloqueada } as never).eq("id", data.empresa_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mestreAtualizarEmpresa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    empresa_id: string;
    plano?: string;
    responsavel?: string | null;
    mrr?: number;
    limite_usuarios?: number;
    limite_vagas?: number;
    ativo?: boolean;
    modulos_desabilitados?: string[];
  }) => input)
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { empresa_id, ...patch } = data;
    const { error } = await sb.from("empresas").update(patch as never).eq("id", empresa_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
