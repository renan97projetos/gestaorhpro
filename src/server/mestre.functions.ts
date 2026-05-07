import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { supabaseAuth } from "@/server/auth.middleware";

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
  password?: string | null;
  nome: string;
  role: "admin" | "gestor" | "visualizador";
  modo?: "convite" | "senha";
  redirect_to?: string | null;
};

export const mestreCriarUsuario = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((input: CriarInput) => {
    if (!input?.email || !input?.empresa_id || !input?.nome) throw new Error("Dados incompletos");
    const modo = input.modo ?? (input.password ? "senha" : "convite");
    if (modo === "senha" && (!input.password || input.password.length < 6)) {
      throw new Error("Senha mínima de 6 caracteres");
    }
    if (!["admin", "gestor", "visualizador"].includes(input.role)) throw new Error("Papel inválido");
    return { ...input, modo };
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);

    let userId: string | null = null;
    const redirectTo = data.redirect_to || undefined;

    if (data.modo === "convite") {
      // Envia convite por e-mail (usuário define própria senha ao validar)
      const inv = await sb.auth.admin.inviteUserByEmail(data.email, {
        data: { nome: data.nome },
        redirectTo,
      });
      if (inv.error) {
        const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (!existing) throw new Error(inv.error.message);
        userId = existing.id;
      } else {
        userId = inv.data.user!.id;
      }
    } else {
      // Cria com senha (auto-confirmado)
      const created = await sb.auth.admin.createUser({
        email: data.email,
        password: data.password!,
        email_confirm: true,
        user_metadata: { nome: data.nome },
      });
      if (created.error) {
        const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
        if (!existing) throw new Error(created.error.message);
        userId = existing.id;
      } else {
        userId = created.data.user!.id;
      }
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
  .middleware([supabaseAuth])
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
  .middleware([supabaseAuth])
  .inputValidator((input: { empresa_id: string; bloqueada: boolean }) => input)
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { error } = await sb.from("empresas").update({ bloqueada: data.bloqueada } as never).eq("id", data.empresa_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mestreAtualizarEmpresa = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((input: {
    empresa_id: string;
    nome?: string;
    plano?: string;
    responsavel?: string | null;
    mrr?: number;
    limite_usuarios?: number;
    limite_vagas?: number;
    ativo?: boolean;
    modulos_desabilitados?: string[];
    cnpj?: string | null;
    telefone?: string | null;
    email_contato?: string | null;
    endereco?: string | null;
    forma_pagamento?: string | null;
    data_inicio_contrato?: string | null;
    dia_vencimento?: number | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { empresa_id, ...patch } = data;
    const { error } = await sb.from("empresas").update(patch as never).eq("id", empresa_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mestreCriarAdminMestre = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((input: { email: string; password: string; nome: string }) => {
    if (!input?.email || !input?.nome) throw new Error("Nome e e-mail são obrigatórios");
    if (!input.password || input.password.length < 6) throw new Error("Senha mínima de 6 caracteres");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);

    let userId: string | null = null;
    const created = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (created.error) {
      const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list.data.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
      if (!existing) throw new Error(created.error.message);
      userId = existing.id;
      // Atualiza senha do usuário existente
      await sb.auth.admin.updateUserById(userId, { password: data.password });
    } else {
      userId = created.data.user!.id;
    }

    await sb.from("profiles").upsert({ id: userId!, nome: data.nome, email: data.email } as never);

    const { error: insErr } = await sb
      .from("admin_mestres")
      .upsert({ user_id: userId! } as never, { onConflict: "user_id" });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, user_id: userId };
  });

export const mestreRemoverAdminMestre = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((input: { user_id: string }) => {
    if (!input?.user_id) throw new Error("user_id obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    if (data.user_id === context.userId) throw new Error("Você não pode remover a si mesmo");
    const { error } = await sb.from("admin_mestres").delete().eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mestreCriarEmpresa = createServerFn({ method: "POST" })
  .middleware([supabaseAuth])
  .inputValidator((input: {
    nome: string;
    slug: string;
    cnpj?: string | null;
    responsavel?: string | null;
    telefone?: string | null;
    email_contato?: string | null;
    endereco?: string | null;
    plano?: string;
    mrr?: number;
    forma_pagamento?: string | null;
    data_inicio_contrato?: string | null;
    dia_vencimento?: number | null;
    limite_usuarios?: number;
    limite_vagas?: number;
  }) => {
    if (!input?.nome || !input?.slug) throw new Error("Nome e slug obrigatórios");
    return input;
  })
  .handler(async ({ data, context }) => {
    const sb = admin();
    await assertMestre(sb, context.userId);
    const { error, data: created } = await sb.from("empresas").insert(data as never).select("id,slug").single();
    if (error) throw new Error(error.message);
    return created;
  });
