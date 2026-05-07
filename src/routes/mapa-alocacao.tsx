import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa-context";
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
  const { empresaAtual } = useEmpresa();
  const [data, setData] = useState<ColabFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [ideais, setIdeais] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("setor_ideal") || "{}"); } catch { return {}; }
  });

  useEffect(() => {
    setLoading(true);
    (async () => {
      if (!empresaAtual) { setData([]); setLoading(false); return; }
      const { data } = await supabase.from("colaboradores")
        .select("id, colaborador, setor, sexo, cargo, status")
        .eq("empresa_id", empresaAtual.id)
        .neq("status", "Demitido");
      setData((data as ColabFull[]) || []);
      setLoading(false);
    })();
  }, [empresaAtual?.id]);

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

              {/* Mini "mapa" 2D do setor com bonecos andando (azul=M, rosa=F) */}
              <div className="relative h-28 rounded-lg border-2 border-dashed bg-gradient-to-b from-sky-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
                {Array.from({ length: max }).map((_, i) => {
                  const p = s.pessoas[i];
                  const isF = (p?.sexo || "").toLowerCase().startsWith("f");
                  const cor = isF ? "#ec4899" : "#3b82f6";
                  const delay = (i * 0.4) % 3;
                  const dur = 4 + (i % 4);
                  const top = 8 + (i % 3) * 30;
                  const initials = (p?.colaborador || "?").split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
                  return (
                    <div
                      key={i}
                      title={`${p?.colaborador || "?"}${p?.cargo ? " — " + p.cargo : ""}`}
                      className="absolute group"
                      style={{
                        top,
                        left: 0,
                        animation: `walk-${i % 2 === 0 ? "right" : "left"} ${dur}s ease-in-out ${delay}s infinite alternate`,
                      }}
                    >
                      {/* Bonequinho SVG */}
                      <svg width="22" height="28" viewBox="0 0 22 28" className="drop-shadow cursor-pointer hover:scale-125 transition">
                        <circle cx="11" cy="5" r="4" fill={cor} />
                        <rect x="6" y="10" width="10" height="11" rx="2" fill={cor} />
                        <rect x="7" y="20" width="3" height="6" rx="1" fill={cor} />
                        <rect x="12" y="20" width="3" height="6" rx="1" fill={cor} />
                        <text x="11" y="7.5" textAnchor="middle" fontSize="4" fill="white" fontWeight="bold">{initials.charAt(0)}</text>
                      </svg>
                    </div>
                  );
                })}
                {atual > 12 && (
                  <div className="absolute bottom-1 right-2 text-xs font-semibold text-muted-foreground bg-background/80 px-1.5 rounded">+{atual - 12}</div>
                )}
                <div className="absolute top-1 left-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />M</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500" />F</span>
                </div>
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
