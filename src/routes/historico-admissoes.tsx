import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

export const Route = createFileRoute("/historico-admissoes")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Item = {
  id: string;
  movimentacao_id: string | null;
  evento: string;
  detalhes: Record<string, unknown> | null;
  user_nome: string | null;
  created_at: string;
};

const tone: Record<string, string> = {
  criada: "bg-blue-600",
  editada: "bg-amber-600",
  finalizada: "bg-emerald-600",
  excluida: "bg-red-600",
};

function Page() {
  const [rows, setRows] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admissoes_historico")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data as Item[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const text = JSON.stringify(r).toLowerCase();
    return text.includes(q.toLowerCase());
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-6 w-6" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Histórico de Admissões</h1>
          <p className="text-sm text-muted-foreground">Tudo que acontece em vagas: criação, edição, finalização e exclusão.</p>
        </div>
      </div>
      <Card className="p-4">
        <Input placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md mb-4" />
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const d = r.detalhes || {};
              const resumoCampos: string[] = [];
              if (d.cargo) resumoCampos.push(`Cargo: ${d.cargo}`);
              if (d.setor) resumoCampos.push(`Setor: ${d.setor}`);
              if (d.tipo) resumoCampos.push(`Tipo: ${d.tipo}`);
              if (d.substituido_nome) resumoCampos.push(`No lugar de: ${d.substituido_nome}`);
              if (d.colaborador_nome && d.colaborador_nome !== "—") resumoCampos.push(`Entrou: ${d.colaborador_nome}`);
              if (d.data_abertura) resumoCampos.push(`Abertura: ${d.data_abertura}`);
              if (d.data_admissao) resumoCampos.push(`Admissão: ${d.data_admissao}`);
              if (d.turno) resumoCampos.push(`Turno: ${d.turno}`);
              if (d.vaga_id) resumoCampos.push(`Vaga Gupy: ${d.vaga_id}`);
              return (
                <li key={r.id} className="flex items-start gap-3 border rounded-lg p-3">
                  <Badge className={`${tone[r.evento] || "bg-slate-600"} hover:opacity-90 text-white capitalize`}>{r.evento}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{resumoCampos.join(" • ") || "—"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Por <strong>{r.user_nome || "—"}</strong> em{" "}
                      {new Date(r.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
