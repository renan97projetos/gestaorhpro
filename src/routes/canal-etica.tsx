import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShieldCheck, Plus, Send, Lock, Eye, MessageSquare, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/canal-etica")({
  component: () => (
    <RequireAuth>
      <CanalEticaPage />
    </RequireAuth>
  ),
});

type Denuncia = {
  id: string;
  empresa_id: string;
  categoria: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  status: string;
  anonimo: boolean;
  denunciante_user_id: string | null;
  denunciante_nome: string | null;
  denunciante_email: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  conclusao: string | null;
  concluida_em: string | null;
  created_at: string;
  updated_at: string;
};

type Tratativa = {
  id: string;
  denuncia_id: string;
  user_id: string;
  user_nome: string | null;
  mensagem: string;
  status_novo: string | null;
  interno: boolean;
  created_at: string;
};

const CATEGORIAS = [
  { v: "conduta", l: "Conduta inadequada" },
  { v: "assedio", l: "Assédio moral / sexual" },
  { v: "discriminacao", l: "Discriminação" },
  { v: "fraude", l: "Fraude / corrupção" },
  { v: "seguranca", l: "Segurança no trabalho" },
  { v: "outros", l: "Outros" },
];

const STATUS = [
  { v: "recebida", l: "Recebida", color: "bg-blue-100 text-blue-800", icon: Clock },
  { v: "em_analise", l: "Em análise", color: "bg-amber-100 text-amber-800", icon: Eye },
  { v: "investigacao", l: "Em investigação", color: "bg-purple-100 text-purple-800", icon: AlertTriangle },
  { v: "concluida_procedente", l: "Concluída — procedente", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  { v: "concluida_improcedente", l: "Concluída — improcedente", color: "bg-zinc-100 text-zinc-800", icon: CheckCircle2 },
  { v: "arquivada", l: "Arquivada", color: "bg-red-100 text-red-800", icon: CheckCircle2 },
];

const PRIORIDADES = [
  { v: "baixa", l: "Baixa" },
  { v: "normal", l: "Normal" },
  { v: "alta", l: "Alta" },
  { v: "critica", l: "Crítica" },
];

const denunciaSchema = z.object({
  categoria: z.string().min(1),
  titulo: z.string().trim().min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
  descricao: z.string().trim().min(20, "Descreva com ao menos 20 caracteres").max(5000, "Máximo 5000 caracteres"),
  prioridade: z.string().min(1),
});

function CanalEticaPage() {
  const { empresaAtual, isGestorEmpresa, isAdminMestre } = useEmpresa();
  const podeTratar = isGestorEmpresa || isAdminMestre;

  return (
    <AppLayout>
      <main className="min-h-full bg-[image:var(--gradient-soft)] px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <header className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Canal de Ética</h1>
              <p className="text-sm text-muted-foreground">Canal sigiloso para denúncias e relatos. Anonimato garantido.</p>
            </div>
          </header>

          {!empresaAtual ? (
            <Card className="p-6">Selecione uma empresa.</Card>
          ) : podeTratar ? (
            <Tabs defaultValue="tratativa">
              <TabsList>
                <TabsTrigger value="tratativa">Painel de tratativa</TabsTrigger>
                <TabsTrigger value="nova">Nova denúncia</TabsTrigger>
              </TabsList>
              <TabsContent value="tratativa" className="mt-4">
                <PainelTratativa empresaId={empresaAtual.id} />
              </TabsContent>
              <TabsContent value="nova" className="mt-4">
                <FormularioDenuncia empresaId={empresaAtual.id} />
              </TabsContent>
            </Tabs>
          ) : (
            <FormularioDenuncia empresaId={empresaAtual.id} />
          )}
        </div>
      </main>
    </AppLayout>
  );
}

function FormularioDenuncia({ empresaId }: { empresaId: string }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ categoria: "conduta", titulo: "", descricao: "", prioridade: "normal" });
  const [anonimo, setAnonimo] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = denunciaSchema.safeParse(form);
    if (!parsed.success) {
      return toast.error(parsed.error.issues[0]?.message || "Dados inválidos");
    }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      categoria: form.categoria,
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      prioridade: form.prioridade,
      anonimo,
      denunciante_user_id: anonimo ? null : user?.id ?? null,
      denunciante_nome: anonimo ? null : (user?.user_metadata?.nome ?? user?.email ?? null),
      denunciante_email: anonimo ? null : (user?.email ?? null),
    };
    const { data, error } = await supabase.from("etica_denuncias").insert(payload).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setProtocolo(data!.id);
    setForm({ categoria: "conduta", titulo: "", descricao: "", prioridade: "normal" });
    toast.success("Denúncia registrada");
  };

  if (protocolo) {
    return (
      <Card className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="h-16 w-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold">Denúncia registrada</h2>
        <p className="text-sm text-muted-foreground">Guarde este protocolo para acompanhamento:</p>
        <div className="font-mono text-xs bg-muted p-3 rounded-lg break-all">{protocolo}</div>
        <Button onClick={() => setProtocolo(null)} variant="outline">Registrar nova</Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
        <Lock className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 dark:text-emerald-100">
          Suas denúncias são tratadas com sigilo pelo time de compliance. Você pode optar por
          enviar de forma <strong>anônima</strong> — nesse caso ninguém conseguirá identificar o autor.
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.prioridade} onValueChange={(v) => setForm({ ...form, prioridade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Título resumido</Label>
          <Input maxLength={120} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Resuma em poucas palavras" />
        </div>
        <div>
          <Label>Descrição detalhada</Label>
          <Textarea rows={6} maxLength={5000} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva o ocorrido, datas, pessoas envolvidas, evidências..." />
          <p className="text-[11px] text-muted-foreground mt-1">{form.descricao.length}/5000</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={anonimo} onCheckedChange={(v) => setAnonimo(!!v)} />
          <span className="text-sm">Enviar de forma anônima (não acompanha o andamento)</span>
        </label>
        <Button type="submit" disabled={saving} className="w-full">
          <Send className="h-4 w-4 mr-2" /> {saving ? "Enviando..." : "Enviar denúncia"}
        </Button>
      </form>
    </Card>
  );
}

function PainelTratativa({ empresaId }: { empresaId: string }) {
  const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [aberta, setAberta] = useState<Denuncia | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("etica_denuncias")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setDenuncias((data || []) as Denuncia[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaId]);

  const filtradas = useMemo(
    () => denuncias.filter((d) => filtroStatus === "todos" || d.status === filtroStatus),
    [denuncias, filtroStatus]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    denuncias.forEach((d) => { c[d.status] = (c[d.status] || 0) + 1; });
    return c;
  }, [denuncias]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <button onClick={() => setFiltroStatus("todos")} className={`p-3 rounded-lg border text-left text-xs ${filtroStatus === "todos" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
          <div className="font-bold text-lg">{denuncias.length}</div>
          <div>Todas</div>
        </button>
        {STATUS.map((s) => (
          <button key={s.v} onClick={() => setFiltroStatus(s.v)} className={`p-3 rounded-lg border text-left text-xs ${filtroStatus === s.v ? "bg-primary text-primary-foreground" : "bg-card"}`}>
            <div className="font-bold text-lg">{counts[s.v] || 0}</div>
            <div className="truncate">{s.l}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6">Carregando...</Card>
      ) : filtradas.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhuma denúncia neste filtro.</Card>
      ) : (
        <div className="space-y-2">
          {filtradas.map((d) => {
            const st = STATUS.find((s) => s.v === d.status);
            return (
              <Card key={d.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setAberta(d)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{d.titulo}</h3>
                      {d.anonimo && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" /> Anônimo</Badge>}
                      <Badge className={st?.color}>{st?.l}</Badge>
                      <Badge variant="outline">{CATEGORIAS.find((c) => c.v === d.categoria)?.l}</Badge>
                      <Badge variant="outline">Prioridade: {PRIORIDADES.find((p) => p.v === d.prioridade)?.l}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{d.descricao}</p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(d.created_at).toLocaleString("pt-BR")}
                      {!d.anonimo && d.denunciante_nome && ` · por ${d.denunciante_nome}`}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {aberta && (
        <DetalheDenuncia denuncia={aberta} onClose={() => { setAberta(null); load(); }} />
      )}
    </div>
  );
}

function DetalheDenuncia({ denuncia, onClose }: { denuncia: Denuncia; onClose: () => void }) {
  const { user } = useAuth();
  const [tratativas, setTratativas] = useState<Tratativa[]>([]);
  const [mensagem, setMensagem] = useState("");
  const [interno, setInterno] = useState(true);
  const [novoStatus, setNovoStatus] = useState<string>(denuncia.status);
  const [conclusao, setConclusao] = useState(denuncia.conclusao || "");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("etica_tratativas")
      .select("*")
      .eq("denuncia_id", denuncia.id)
      .order("created_at", { ascending: true });
    setTratativas((data || []) as Tratativa[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [denuncia.id]);

  const enviarTratativa = async () => {
    if (!mensagem.trim()) return toast.error("Digite uma mensagem");
    setSaving(true);
    const statusMudou = novoStatus !== denuncia.status;
    const concluiu = novoStatus.startsWith("concluida") || novoStatus === "arquivada";

    const { error: tErr } = await supabase.from("etica_tratativas").insert({
      denuncia_id: denuncia.id,
      user_id: user!.id,
      user_nome: user?.user_metadata?.nome ?? user?.email ?? null,
      mensagem: mensagem.trim(),
      status_novo: statusMudou ? novoStatus : null,
      interno,
    });
    if (tErr) { setSaving(false); return toast.error(tErr.message); }

    if (statusMudou || concluiu) {
      const update: Record<string, unknown> = {
        status: novoStatus,
        responsavel_id: user!.id,
        responsavel_nome: user?.user_metadata?.nome ?? user?.email ?? null,
      };
      if (concluiu) {
        update.conclusao = conclusao.trim() || null;
        update.concluida_em = new Date().toISOString();
      }
      const { error: uErr } = await supabase.from("etica_denuncias").update(update).eq("id", denuncia.id);
      if (uErr) { setSaving(false); return toast.error(uErr.message); }
    }
    setSaving(false);
    setMensagem("");
    toast.success("Tratativa registrada");
    load();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {denuncia.titulo}
            {denuncia.anonimo && <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Anônimo</Badge>}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Protocolo: <span className="font-mono">{denuncia.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div><span className="text-muted-foreground">Categoria:</span> {CATEGORIAS.find((c) => c.v === denuncia.categoria)?.l}</div>
            <div><span className="text-muted-foreground">Prioridade:</span> {PRIORIDADES.find((p) => p.v === denuncia.prioridade)?.l}</div>
            <div><span className="text-muted-foreground">Recebida:</span> {new Date(denuncia.created_at).toLocaleString("pt-BR")}</div>
            <div><span className="text-muted-foreground">Autor:</span> {denuncia.anonimo ? "Anônimo" : (denuncia.denunciante_nome || "—")}</div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm whitespace-pre-wrap">{denuncia.descricao}</div>

          <div>
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Tratativa</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tratativas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma tratativa registrada.</p>}
              {tratativas.map((t) => (
                <div key={t.id} className={`p-3 rounded-lg border text-sm ${t.interno ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200" : "bg-card"}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium">{t.user_nome || "—"}</span>
                    <div className="flex items-center gap-2">
                      {t.status_novo && <Badge variant="outline" className="text-[10px]">→ {STATUS.find((s) => s.v === t.status_novo)?.l}</Badge>}
                      {t.interno && <Badge variant="outline" className="text-[10px]"><Lock className="h-2.5 w-2.5 mr-1" />interno</Badge>}
                      <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap">{t.mensagem}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Atualizar status</Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-end gap-2 pb-2">
                <Checkbox checked={interno} onCheckedChange={(v) => setInterno(!!v)} />
                <span className="text-sm">Nota interna (não visível ao denunciante)</span>
              </label>
            </div>
            {(novoStatus.startsWith("concluida") || novoStatus === "arquivada") && (
              <div>
                <Label>Conclusão</Label>
                <Textarea rows={2} maxLength={2000} value={conclusao} onChange={(e) => setConclusao(e.target.value)} placeholder="Resumo da conclusão" />
              </div>
            )}
            <div>
              <Label>Mensagem da tratativa</Label>
              <Textarea rows={3} maxLength={3000} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Registre a ação tomada, andamento ou retorno ao denunciante" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={enviarTratativa} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Registrar tratativa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
