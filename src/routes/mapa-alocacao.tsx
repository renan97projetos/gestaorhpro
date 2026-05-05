import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users } from "lucide-react";
import type { ColabFull } from "@/lib/dashboard-helpers";

export const Route = createFileRoute("/mapa-alocacao")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type SetorMeta = { setor: string; ideal: number };

function Page() {
  const [data, setData] = useState<ColabFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [ideais, setIdeais] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("setor_ideal") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("colaboradores").select("*").neq("status", "Demitido");
      setData((data as ColabFull[]) || []);
      setLoading(false);
    })();
  }, []);

  const setores = useMemo(() => {
    const map = new Map<string, ColabFull[]>();
    data.forEach((c) => {
      const s = c.setor || "Sem setor";
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(c);
    });
    return Array.from(map, ([setor, pessoas]) => ({ setor, pessoas }))
      .sort((a, b) => b.pessoas.length - a.pessoas.length);
  }, [data]);

  const updateIdeal = (setor: string, v: number) => {
    const novo = { ...ideais, [setor]: v };
    setIdeais(novo);
    localStorage.setItem("setor_ideal", JSON.stringify(novo));
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const totalAtual = data.length;
  const totalIdeal = Object.values(ideais).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="h-6 w-6" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Mapa de Alocação</h1>
          <p className="text-sm text-muted-foreground">Quem está em qual setor — déficit ou excesso por área.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Setores</p><p className="text-2xl font-bold">{setores.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">HC atual</p><p className="text-2xl font-bold">{totalAtual}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">HC ideal</p><p className="text-2xl font-bold">{totalIdeal || "—"}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-2xl font-bold ${totalIdeal && totalAtual > totalIdeal ? "text-emerald-600" : totalIdeal ? "text-amber-600" : ""}`}>{totalIdeal ? totalAtual - totalIdeal : "—"}</p></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {setores.map((s) => {
          const ideal = ideais[s.setor] || 0;
          const atual = s.pessoas.length;
          const diff = ideal ? atual - ideal : 0;
          const status = !ideal ? null : diff < 0 ? { tone: "bg-red-600", txt: `Déficit: ${Math.abs(diff)}` } : diff > 0 ? { tone: "bg-emerald-600", txt: `Excesso: ${diff}` } : { tone: "bg-blue-600", txt: "OK" };

          // Avatares animados
          const max = Math.min(atual, 12);
          return (
            <Card key={s.setor} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg">{s.setor}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{atual} colaborador(es)</p>
                </div>
                {status && <Badge className={`${status.tone} text-white`}>{status.txt}</Badge>}
              </div>

              {/* Mini "mapa" 2D do setor com avatares animados */}
              <div className="relative h-24 rounded-lg border-2 border-dashed bg-muted/30 overflow-hidden">
                {Array.from({ length: max }).map((_, i) => {
                  const p = s.pessoas[i];
                  const top = 10 + (i % 3) * 28;
                  const left = 8 + Math.floor(i / 3) * 28;
                  const initials = (p?.colaborador || "?").split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
                  return (
                    <div
                      key={i}
                      title={p?.colaborador}
                      className="absolute h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow animate-pulse"
                      style={{ top, left, animationDelay: `${i * 120}ms`, animationDuration: "2.4s" }}
                    >
                      {initials}
                    </div>
                  );
                })}
                {atual > 12 && (
                  <div className="absolute bottom-1 right-2 text-xs font-semibold text-muted-foreground">+{atual - 12}</div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ideal:</span>
                <Input
                  type="number"
                  min={0}
                  className="h-8 w-24"
                  value={ideal || ""}
                  onChange={(e) => updateIdeal(s.setor, Number(e.target.value) || 0)}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
