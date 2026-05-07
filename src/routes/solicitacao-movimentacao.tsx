import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Check, X, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/solicitacao-movimentacao")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Mov = {
  id: string;
  matricula: string;
  colaborador_nome: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  tipo: string;
  user_nome: string | null;
  created_at: string;
};

type Sol = {
  id: string;
  colaborador_id: string;
  matricula: string;
  colaborador_nome: string;
  tipo: string;
  descricao: string;
  valor_atual: string | null;
  valor_solicitado: string | null;
  status: "pendente" | "aprovada" | "rejeitada" | "cancelada";
  motivo: string | null;
  observacao_aprovador: string | null;
  solicitante_nome: string | null;
  aprovador_nome: string | null;
  created_at: string;
  decided_at: string | null;
};

const TIPOS = [
  { v: "transferencia_setor", l: "Transferência de setor" },
  { v: "mudanca_turno", l: "Mudança de turno" },
  { v: "mudanca_cargo", l: "Mudança de cargo" },
  { v: "mudanca_lideranca", l: "Mudança de liderança" },
  { v: "desligamento", l: "Desligamento" },
  { v: "outro", l: "Outro" },
];

function Page() {
  const { user, isGestor } = useAuth();
  const [tab, setTab] = useState<"solicitacoes" | "historico">("solicitacoes");
  const [movs, setMovs] = useState<Mov[]>([]);
  const [sols, setSols] = useState<Sol[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [m, s] = await Promise.all([
      supabase.from("movimentacoes").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("solicitacoes").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setMovs((m.data as Mov[]) ?? []);
    setSols((s.data as Sol[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredMovs = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return movs;
    return movs.filter((m) =>
      m.colaborador_nome.toLowerCase().includes(t) ||
      m.matricula.toLowerCase().includes(t) ||
      m.campo.toLowerCase().includes(t)
    );
  }, [movs, q]);

  const filteredSols = useMemo(() => {
    const t = q.toLowerCase();
    if (!t) return sols;
    return sols.filter((s) => s.colaborador_nome.toLowerCase().includes(t) || s.matricula.toLowerCase().includes(t));
  }, [sols, q]);

  const decide = async (sol: Sol, novoStatus: "aprovada" | "rejeitada", obs: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("solicitacoes")
      .update({
        status: novoStatus,
        observacao_aprovador: obs || null,
        aprovador_id: user.id,
        aprovador_nome: user.email,
        decided_at: new Date().toISOString(),
      })
      .eq("id", sol.id);
    if (error) { toast.error(error.message); return; }
    toast.success(novoStatus === "aprovada" ? "Solicitação aprovada" : "Solicitação rejeitada");
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Movimentações</h1>
          <p className="text-muted-foreground text-sm">Solicitações e histórico de alterações</p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-[image:var(--gradient-primary)]">
          <Plus className="h-4 w-4 mr-2" /> Nova solicitação
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "solicitacoes" | "historico")}>
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações ({sols.length})</TabsTrigger>
          <TabsTrigger value="historico">Histórico ({movs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes" className="mt-4 space-y-3">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : filteredSols.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhuma solicitação ainda</Card>
          ) : (
            filteredSols.map((s) => <SolCard key={s.id} sol={s} canDecide={isGestor && s.status === "pendente"} onDecide={decide} />)
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="overflow-hidden">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-3">Data</th>
                      <th className="text-left p-3">Colaborador</th>
                      <th className="text-left p-3">Campo</th>
                      <th className="text-left p-3">De</th>
                      <th className="text-left p-3">Para</th>
                      <th className="text-left p-3">Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovs.map((m) => (
                      <tr key={m.id} className="border-t hover:bg-muted/30">
                        <td className="p-3 text-xs whitespace-nowrap">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                        <td className="p-3">
                          <div className="font-medium">{m.colaborador_nome}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.matricula}</div>
                        </td>
                        <td className="p-3"><Badge variant="outline">{m.campo}</Badge></td>
                        <td className="p-3 text-muted-foreground">{m.valor_anterior ?? "—"}</td>
                        <td className="p-3 font-medium">{m.valor_novo ?? "—"}</td>
                        <td className="p-3 text-xs text-muted-foreground">{m.user_nome}</td>
                      </tr>
                    ))}
                    {filteredMovs.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma movimentação</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <NewSolDialog open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  );
}

function SolCard({
  sol,
  canDecide,
  onDecide,
}: {
  sol: Sol;
  canDecide: boolean;
  onDecide: (s: Sol, status: "aprovada" | "rejeitada", obs: string) => Promise<void>;
}) {
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const tipoLabel = TIPOS.find((t) => t.v === sol.tipo)?.l ?? sol.tipo;
  const statusColors: Record<string, string> = {
    pendente: "bg-warning/15 text-warning-foreground border-warning/30",
    aprovada: "bg-success/15 text-success border-success/30",
    rejeitada: "bg-destructive/15 text-destructive border-destructive/30",
    cancelada: "bg-muted text-muted-foreground",
  };

  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={statusColors[sol.status]}>{sol.status}</Badge>
            <Badge variant="outline">{tipoLabel}</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {new Date(sol.created_at).toLocaleString("pt-BR")}
            </span>
          </div>
          <div>
            <div className="font-semibold">{sol.colaborador_nome}</div>
            <div className="text-xs text-muted-foreground font-mono">Matrícula {sol.matricula}</div>
          </div>
          <p className="text-sm">{sol.descricao}</p>
          {(sol.valor_atual || sol.valor_solicitado) && (
            <div className="flex gap-4 text-sm">
              <div><span className="text-muted-foreground">Atual:</span> {sol.valor_atual || "—"}</div>
              <div><span className="text-muted-foreground">Solicitado:</span> <strong>{sol.valor_solicitado || "—"}</strong></div>
            </div>
          )}
          {sol.motivo && <p className="text-xs text-muted-foreground italic">Motivo: {sol.motivo}</p>}
          <p className="text-xs text-muted-foreground">Solicitado por: {sol.solicitante_nome}</p>
          {sol.observacao_aprovador && (
            <div className="text-xs bg-muted p-2 rounded">
              <strong>{sol.aprovador_nome}:</strong> {sol.observacao_aprovador}
            </div>
          )}
        </div>
        {canDecide && (
          <div className="flex flex-col gap-2 md:w-64">
            <Textarea placeholder="Observação (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" disabled={busy}
                onClick={async () => { setBusy(true); await onDecide(sol, "rejeitada", obs); setBusy(false); }}>
                <X className="h-4 w-4 mr-1" /> Rejeitar
              </Button>
              <Button size="sm" className="flex-1 bg-success hover:bg-success/90 text-success-foreground" disabled={busy}
                onClick={async () => { setBusy(true); await onDecide(sol, "aprovada", obs); setBusy(false); }}>
                <Check className="h-4 w-4 mr-1" /> Aprovar
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function NewSolDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [colabs, setColabs] = useState<{ id: string; matricula: string; colaborador: string; empresa_id: string }[]>([]);
  const [colabId, setColabId] = useState("");
  const [tipo, setTipo] = useState("transferencia_setor");
  const [descricao, setDescricao] = useState("");
  const [valorAtual, setValorAtual] = useState("");
  const [valorSolicitado, setValorSolicitado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("colaboradores").select("id,matricula,colaborador").order("colaborador")
        .then(({ data }) => setColabs(data ?? []));
    }
  }, [open]);

  const reset = () => {
    setColabId(""); setTipo("transferencia_setor"); setDescricao("");
    setValorAtual(""); setValorSolicitado(""); setMotivo("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !colabId || !descricao) return toast.error("Preencha os campos obrigatórios");
    const colab = colabs.find((c) => c.id === colabId);
    if (!colab) return;
    setSaving(true);
    const { error } = await supabase.from("solicitacoes").insert({
      colaborador_id: colab.id,
      matricula: colab.matricula,
      colaborador_nome: colab.colaborador,
      tipo: tipo as "transferencia_setor",
      descricao,
      valor_atual: valorAtual || null,
      valor_solicitado: valorSolicitado || null,
      motivo: motivo || null,
      solicitante_id: user.id,
      solicitante_nome: user.email,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Solicitação criada");
    reset(); onClose(); onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova solicitação</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Colaborador *</Label>
            <Select value={colabId} onValueChange={setColabId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent className="max-h-72">
                {colabs.map((c) => <SelectItem key={c.id} value={c.id}>{c.matricula} — {c.colaborador}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Valor atual</Label>
              <Input value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor solicitado</Label>
              <Input value={valorSolicitado} onChange={(e) => setValorSolicitado(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo</Label>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[image:var(--gradient-primary)]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar solicitação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
