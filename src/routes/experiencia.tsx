import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CalendarClock, UserCheck2, Loader2, Inbox, StickyNote, Trash2, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

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

type Nota = {
  id: string;
  colaborador_id: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
};

function diasDecorridos(admissao: string): number {
  const ini = new Date(admissao);
  ini.setHours(0, 0, 0, 0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - ini.getTime()) / 86400000);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function ExperienciaPage() {
  const { user, isAdmin, isGestor } = useAuth();
  const podeAnotar = isAdmin || isGestor;
  const [data, setData] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const [selecionado, setSelecionado] = useState<Colab | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: rows } = await supabase
        .from("colaboradores")
        .select("id, matricula, colaborador, cargo, setor, lideranca, admissao, status")
        .eq("status", "Ativo")
        .not("admissao", "is", null);
      if (!mounted) return;
      setData((rows ?? []) as Colab[]);
      setLoading(false);
    })();
    const id = setInterval(() => setTick((t) => t + 1), 60 * 60 * 1000);
    return () => { mounted = false; clearInterval(id); };
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

  const proximos70 = useMemo(() => lista.filter((c) => c.dias >= 65 && c.dias <= 75), [lista]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold">Período de Experiência</h1>
        <p className="text-sm text-muted-foreground">
          Colaboradores nos primeiros 90 dias. {podeAnotar && "Clique no card para adicionar anotações privadas."}
        </p>
      </header>

      {proximos70.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            Avaliação próxima — {proximos70.length} {proximos70.length === 1 ? "colaborador" : "colaboradores"} perto dos 70 dias
          </AlertTitle>
          <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
            {proximos70.map((p) => `${p.colaborador} (${p.dias}d)`).join(" • ")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Em experiência</p><p className="text-2xl font-bold mt-1">{lista.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Próximos aos 70 dias</p><p className="text-2xl font-bold mt-1 text-amber-600">{proximos70.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Até 30 dias</p><p className="text-2xl font-bold mt-1">{lista.filter((c) => c.dias <= 30).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">31 a 90 dias</p><p className="text-2xl font-bold mt-1">{lista.filter((c) => c.dias > 30).length}</p></Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <Card className="p-10 flex flex-col items-center justify-center text-center gap-3">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nenhum colaborador em período de experiência</p>
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
                onClick={() => podeAnotar && setSelecionado(c)}
                className={`p-5 space-y-3 min-w-0 overflow-hidden transition ${podeAnotar ? "cursor-pointer hover:shadow-md hover:border-primary/40" : ""} ${alerta ? "border-amber-500/50" : finalizando ? "border-emerald-500/50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight break-words">{c.colaborador}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Mat. {c.matricula}</p>
                  </div>
                  {alerta ? (
                    <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400 shrink-0"><AlertTriangle className="h-3 w-3 mr-1" /> Avaliar</Badge>
                  ) : finalizando ? (
                    <Badge variant="outline" className="border-emerald-500/60 text-emerald-700 dark:text-emerald-400 shrink-0"><UserCheck2 className="h-3 w-3 mr-1" /> Final</Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">{c.dias}d</Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {c.cargo && <p className="truncate">{c.cargo}</p>}
                  {c.setor && <p className="truncate">{c.setor}</p>}
                  {c.lideranca && <p className="truncate">Líder: {c.lideranca}</p>}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />{c.admissao && formatDate(c.admissao)}</span>
                    <span className="font-medium">{c.dias}/90 dias</span>
                  </div>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground">
                    {c.restantes > 0 ? `Faltam ${c.restantes} ${c.restantes === 1 ? "dia" : "dias"} para completar 90` : "Completou 90 dias"}
                  </p>
                </div>

                {podeAnotar && (
                  <div className="text-[11px] text-primary flex items-center gap-1 pt-1 border-t">
                    <StickyNote className="h-3 w-3" /> Clique para minhas anotações privadas
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {selecionado && podeAnotar && (
        <NotasDialog
          colab={selecionado}
          userId={user?.id || ""}
          userNome={(user?.user_metadata?.nome as string) || user?.email || ""}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  );
}

function NotasDialog({ colab, userId, userNome, onClose }: { colab: Colab; userId: string; userNome: string; onClose: () => void }) {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [novo, setNovo] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("experiencia_notas")
      .select("*")
      .eq("colaborador_id", colab.id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setNotas((data as Nota[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [colab.id]);

  const salvar = async () => {
    if (!novo.trim()) return;
    const { error } = await supabase.from("experiencia_notas").insert({
      colaborador_id: colab.id,
      user_id: userId,
      user_nome: userNome,
      conteudo: novo.trim(),
    } as never);
    if (error) return toast.error(error.message);
    setNovo("");
    toast.success("Anotação salva");
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Excluir esta anotação?")) return;
    await supabase.from("experiencia_notas").delete().eq("id", id);
    load();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" /> Anotações de {colab.colaborador}
          </DialogTitle>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
            <Lock className="h-3 w-3" /> Privado: somente você consegue ver as anotações que cria.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            rows={4}
            placeholder="Escreva uma anotação sobre este colaborador no período de experiência..."
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
          />
          <Button onClick={salvar} disabled={!novo.trim()} className="w-full">Salvar anotação</Button>

          <div className="space-y-2 pt-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Suas anotações ({notas.length})</h4>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : notas.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma anotação ainda.</p>
            ) : (
              notas.map((n) => (
                <Card key={n.id} className="p-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">{n.conteudo}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => remover(n.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                </Card>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
