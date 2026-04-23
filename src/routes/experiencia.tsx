import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CalendarClock, UserCheck2, Loader2, Inbox } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/experiencia")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <ExperienciaPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Colab = {
  id: string;
  matricula: string;
  colaborador: string;
  cargo: string | null;
  setor: string | null;
  lideranca: string | null;
  admissao: string | null;
  status: string;
};

function diasDecorridos(admissao: string): number {
  const ini = new Date(admissao);
  ini.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ms = hoje.getTime() - ini.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ExperienciaPage() {
  const [data, setData] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  // tick a cada 1h só para garantir atualização ao virar o dia
  const [, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: rows, error } = await supabase
        .from("colaboradores")
        .select("id, matricula, colaborador, cargo, setor, lideranca, admissao, status")
        .eq("status", "Ativo")
        .not("admissao", "is", null);
      if (!mounted) return;
      if (error) {
        console.error(error);
        setData([]);
      } else {
        setData((rows ?? []) as Colab[]);
      }
      setLoading(false);
    })();
    const id = setInterval(() => setTick((t) => t + 1), 60 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const lista = useMemo(() => {
    return data
      .map((c) => {
        const dias = c.admissao ? diasDecorridos(c.admissao) : -1;
        return { ...c, dias, restantes: 90 - dias };
      })
      .filter((c) => c.dias >= 0 && c.dias <= 90)
      .sort((a, b) => b.dias - a.dias);
  }, [data]);

  const proximos70 = useMemo(
    () => lista.filter((c) => c.dias >= 65 && c.dias <= 75),
    [lista]
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Período de Experiência</h1>
        <p className="text-sm text-muted-foreground">
          Colaboradores nos primeiros 90 dias de empresa. Os nomes saem da lista automaticamente após o 90º dia.
        </p>
      </header>

      {proximos70.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            Avaliação de experiência próxima — {proximos70.length}{" "}
            {proximos70.length === 1 ? "colaborador" : "colaboradores"} perto dos 70 dias
          </AlertTitle>
          <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
            {proximos70.map((p) => `${p.colaborador} (${p.dias}d)`).join(" • ")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Em experiência</p>
          <p className="text-2xl font-bold mt-1">{lista.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Próximos aos 70 dias</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{proximos70.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Até 30 dias</p>
          <p className="text-2xl font-bold mt-1">{lista.filter((c) => c.dias <= 30).length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">31 a 90 dias</p>
          <p className="text-2xl font-bold mt-1">{lista.filter((c) => c.dias > 30).length}</p>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : lista.length === 0 ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nenhum colaborador em período de experiência</p>
          <p className="text-sm text-muted-foreground">
            Quando alguém for admitido, aparecerá aqui automaticamente.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lista.map((c) => {
            const pct = Math.max(0, Math.min(100, Math.round((c.dias / 90) * 100)));
            const alerta = c.dias >= 65 && c.dias <= 75;
            const finalizando = c.dias >= 85;
            return (
              <Card
                key={c.id}
                className={`p-5 space-y-3 min-w-0 overflow-hidden ${
                  alerta ? "border-amber-500/50" : finalizando ? "border-emerald-500/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight break-words">{c.colaborador}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Mat. {c.matricula}</p>
                  </div>
                  {alerta ? (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400 shrink-0">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Avaliar
                    </Badge>
                  ) : finalizando ? (
                    <Badge variant="outline" className="border-emerald-500/60 text-emerald-700 dark:text-emerald-400 shrink-0">
                      <UserCheck2 className="h-3 w-3 mr-1" /> Final
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {c.dias}d
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {c.cargo && <p className="truncate">{c.cargo}</p>}
                  {c.setor && <p className="truncate">{c.setor}</p>}
                  {c.lideranca && <p className="truncate">Líder: {c.lideranca}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {c.admissao && formatDate(c.admissao)}
                    </span>
                    <span className="font-medium">
                      {c.dias}/90 dias
                    </span>
                  </div>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground">
                    {c.restantes > 0
                      ? `Faltam ${c.restantes} ${c.restantes === 1 ? "dia" : "dias"} para completar 90`
                      : "Completou 90 dias"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
