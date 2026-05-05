import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/auditoria")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Log = {
  id: string;
  user_nome: string | null;
  user_email: string | null;
  acao: string;
  entidade: string;
  entidade_id: string | null;
  resumo: string | null;
  rota: string | null;
  created_at: string;
};

const tone: Record<string, string> = {
  create: "bg-emerald-600",
  update: "bg-amber-600",
  delete: "bg-red-600",
};

function Page() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      setRows((data as Log[]) || []);
      setLoading(false);
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="p-8 text-muted-foreground">Acesso restrito ao administrador.</div>;
  }

  const filtered = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  // resumo por usuário
  const porUsuario = new Map<string, number>();
  rows.forEach((r) => {
    const k = r.user_nome || r.user_email || "—";
    porUsuario.set(k, (porUsuario.get(k) || 0) + 1);
  });
  const top = Array.from(porUsuario, ([nome, n]) => ({ nome, n })).sort((a, b) => b.n - a.n).slice(0, 8);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Histórico de Uso (Admin)</h1>
          <p className="text-sm text-muted-foreground">Tudo que cada usuário cria, edita ou exclui no sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total de eventos</p><p className="text-2xl font-bold">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Criações</p><p className="text-2xl font-bold">{rows.filter((r) => r.acao === "create").length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Edições</p><p className="text-2xl font-bold">{rows.filter((r) => r.acao === "update").length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Exclusões</p><p className="text-2xl font-bold">{rows.filter((r) => r.acao === "delete").length}</p></Card>
      </div>

      <Card className="p-4">
        <p className="font-semibold mb-3">Top usuários por atividade</p>
        <div className="space-y-2">
          {top.map((t) => (
            <div key={t.nome} className="flex items-center justify-between text-sm">
              <span className="truncate">{t.nome}</span>
              <Badge variant="secondary">{t.n} ações</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <Input placeholder="Buscar por usuário, entidade, resumo..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md mb-4" />
        {loading ? <p className="text-muted-foreground">Carregando...</p> : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 border rounded-lg p-3">
                <Badge className={`${tone[r.acao] || "bg-slate-600"} text-white capitalize`}>{r.acao}</Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm"><strong>{r.entidade}</strong> — {r.resumo || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.user_nome || r.user_email} • {new Date(r.created_at).toLocaleString("pt-BR")} {r.rota ? `• ${r.rota}` : ""}
                  </p>
                </div>
              </li>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro.</p>}
          </ul>
        )}
      </Card>
    </div>
  );
}
