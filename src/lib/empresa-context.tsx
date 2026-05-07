import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type EmpresaRole = "admin" | "gestor" | "visualizador";

export type Empresa = {
  id: string;
  slug: string;
  nome: string;
  logo_url: string | null;
  capa_url: string | null;
  sobre: string | null;
  endereco: string | null;
  telefone: string | null;
  cnpj: string | null;
  email_contato: string | null;
  cor_primaria: string | null;
  ativo: boolean;
  bloqueada?: boolean;
  plano?: string;
  responsavel?: string | null;
  mrr?: number;
  limite_usuarios?: number;
  limite_vagas?: number;
  ultimo_acesso?: string | null;
  modulos_desabilitados?: string[];
  forma_pagamento?: string | null;
  data_inicio_contrato?: string | null;
  dia_vencimento?: number | null;
};

type EmpresaCtx = {
  loading: boolean;
  empresas: Empresa[]; // todas que o usuário pode acessar (mestre vê todas)
  empresaAtual: Empresa | null;
  setEmpresaId: (id: string) => void;
  role: EmpresaRole | null; // papel na empresa atual (null se mestre sem vínculo)
  isAdminMestre: boolean;
  isAdminEmpresa: boolean; // admin DA empresa atual (ou mestre)
  isGestorEmpresa: boolean; // admin/gestor da empresa atual (ou mestre)
  canEdit: boolean;
  canManage: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<EmpresaCtx | null>(null);
const LS_KEY = "empresa_atual_id";

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [isAdminMestre, setIsAdminMestre] = useState(false);
  const [empresaAtualId, setEmpresaAtualId] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null,
  );
  const [role, setRole] = useState<EmpresaRole | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setEmpresas([]);
      setIsAdminMestre(false);
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: mestreData }, { data: membrosData }] = await Promise.all([
      supabase.from("admin_mestres").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("empresa_membros").select("empresa_id, role").eq("user_id", user.id),
    ]);
    const mestre = !!mestreData;
    setIsAdminMestre(mestre);

    let empresasResp;
    if (mestre) {
      empresasResp = await supabase.from("empresas").select("*").order("nome");
    } else {
      const ids = (membrosData || []).map((m) => m.empresa_id);
      if (ids.length === 0) {
        setEmpresas([]);
        setRole(null);
        setLoading(false);
        return;
      }
      empresasResp = await supabase.from("empresas").select("*").in("id", ids).eq("bloqueada", false).order("nome");
    }
    const lista = (empresasResp.data as Empresa[]) || [];
    setEmpresas(lista);

    // empresa atual válida?
    let atualId = empresaAtualId;
    if (!atualId || !lista.find((e) => e.id === atualId)) {
      atualId = lista[0]?.id ?? null;
      if (atualId) localStorage.setItem(LS_KEY, atualId);
    }
    setEmpresaAtualId(atualId);

    // role na empresa atual
    if (atualId) {
      const m = (membrosData || []).find((mm) => mm.empresa_id === atualId);
      setRole((m?.role as EmpresaRole) ?? (mestre ? "admin" : null));
    } else {
      setRole(null);
    }
    setLoading(false);
  }, [user, empresaAtualId]);

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const setEmpresaId = useCallback((id: string) => {
    localStorage.setItem(LS_KEY, id);
    setEmpresaAtualId(id);
    // role muda — refetch leve
    refresh();
  }, [refresh]);

  const empresaAtual = empresas.find((e) => e.id === empresaAtualId) || null;
  const isAdminEmpresa = isAdminMestre || role === "admin";
  const isGestorEmpresa = isAdminEmpresa || role === "gestor";

  return (
    <Ctx.Provider
      value={{
        loading,
        empresas,
        empresaAtual,
        setEmpresaId,
        role,
        isAdminMestre,
        isAdminEmpresa,
        isGestorEmpresa,
        canEdit: isGestorEmpresa,
        canManage: isAdminEmpresa,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useEmpresa = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useEmpresa must be used within EmpresaProvider");
  return c;
};
