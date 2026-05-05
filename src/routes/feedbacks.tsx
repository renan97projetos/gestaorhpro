import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, MessageSquareHeart, BarChart3, Send, X } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/feedbacks")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Camp = { id: string; titulo: string; descricao: string | null; status: string; created_by_nome: string | null; created_at: string };
type Perg = { id: string; campanha_id: string; texto: string; tipo: string; ordem: number; obrigatoria: boolean };
type Resp = { id: string; campanha_id: string; user_nome: string | null; setor: string | null; comentario: string | null; created_at: string };
type RespItem = { resposta_id: string; pergunta_id: string; valor_nota: number | null; valor_texto: string | null };

const PADRAO = [
  "Como você avalia seu nível de motivação na última semana?",
  "O quanto você sente que sua liderança apoia seu desenvolvimento?",
  "Quais pontos da rotina poderiam melhorar?",
  "Você se sente reconhecido pelo trabalho realizado?",
  "Em uma escala de 0 a 10, o quanto recomendaria a empresa para um amigo trabalhar?",
];

function Page() {
  const { user, isAdmin, isGestor } = useAuth();
  const canEdit = isAdmin || isGestor;
  const [camps, setCamps] = useState<Camp[]>([]);
  const [open, setOpen] = useState(false);
  const [respondCamp, setRespondCamp] = useState<Camp | null>(null);
  const [dashCamp, setDashCamp] = useState<Camp | null>(null);
  const [form, setForm] = useState({ titulo: "", descricao: "", perguntas: [...PADRAO] });

  const load = async () => {
    const { data } = await supabase.from("feedback_campanhas").select("*").order("created_at", { ascending: false });
    setCamps((data as Camp[]) || []);
  };
  useEffect(() => { load(); }, []);

  const novaCampanha = async () => {
    if (!user) return;
    if (!form.titulo.trim()) return toast.error("Informe o título");
    const valid = form.perguntas.map((p) => p.trim()).filter(Boolean);
    if (valid.length === 0) return toast.error("Adicione ao menos uma pergunta");
    const { data: c, error } = await supabase
      .from("feedback_campanhas")
      .insert({
        titulo: form.titulo,
        descricao: form.descricao || null,
        created_by: user.id,
        created_by_nome: (user.user_metadata?.nome as string) || user.email,
      } as never)
      .select()
      .single();
    if (error || !c) return toast.error(error?.message || "Erro");
    const camp = c as Camp;
    const perg = valid.map((texto, i) => ({ campanha_id: camp.id, texto, tipo: i === valid.length - 1 ? "nota_0_10" : "nota_0_10", ordem: i }));
    await supabase.from("feedback_perguntas").insert(perg as never);
    logAudit({ acao: "create", entidade: "feedback_campanhas", entidade_id: camp.id, resumo: `Criou campanha: ${form.titulo}` });
    setForm({ titulo: "", descricao: "", perguntas: [...PADRAO] });
    setOpen(false);
    load();
    toast.success("Campanha criada");
  };

  const remover = async (c: Camp) => {
    if (!confirm("Excluir campanha e suas respostas?")) return;
    const { error } = await supabase.from("feedback_campanhas").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    logAudit({ acao: "delete", entidade: "feedback_campanhas", entidade_id: c.id, resumo: `Excluiu campanha: ${c.titulo}` });
    load();
  };

  const toggleStatus = async (c: Camp) => {
    const novo = c.status === "aberta" ? "fechada" : "aberta";
    await supabase.from("feedback_campanhas").update({ status: novo } as never).eq("id", c.id);
    logAudit({ acao: "update", entidade: "feedback_campanhas", entidade_id: c.id, resumo: `Status: ${novo}` });
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <MessageSquareHeart className="h-6 w-6" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Feedbacks</h1>
            <p className="text-sm text-muted-foreground">Pulsos de equipe — gestores criam, colaboradores respondem.</p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova campanha</Button>
        )}
      </div>

      {camps.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma campanha ainda.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {camps.map((c) => (
            <Card key={c.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{c.titulo}</h3>
                <Badge className={c.status === "aberta" ? "bg-emerald-600" : "bg-slate-600"}>{c.status}</Badge>
              </div>
              {c.descricao && <p className="text-sm text-muted-foreground">{c.descricao}</p>}
              <p className="text-xs text-muted-foreground">por {c.created_by_nome} • {new Date(c.created_at).toLocaleDateString("pt-BR")}</p>
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {c.status === "aberta" && (
                  <Button size="sm" onClick={() => setRespondCamp(c)}><Send className="h-3.5 w-3.5 mr-1" />Responder</Button>
                )}
                {canEdit && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setDashCamp(c)}><BarChart3 className="h-3.5 w-3.5 mr-1" />Resultados</Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(c)}>
                      {c.status === "aberta" ? "Fechar" : "Reabrir"}
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => remover(c)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Criar campanha */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova campanha de feedback</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Perguntas (escala 0–10)</Label>
                <Button size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, perguntas: [...f.perguntas, ""] }))}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Pergunta
                </Button>
              </div>
              <div className="space-y-2">
                {form.perguntas.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={p} onChange={(e) => setForm((f) => ({ ...f, perguntas: f.perguntas.map((x, j) => j === i ? e.target.value : x) }))} />
                    <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, perguntas: f.perguntas.filter((_, j) => j !== i) }))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={novaCampanha}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {respondCamp && <ResponderDialog camp={respondCamp} onClose={() => { setRespondCamp(null); load(); }} />}
      {dashCamp && <DashCampanha camp={dashCamp} onClose={() => setDashCamp(null)} />}
    </div>
  );
}

function ResponderDialog({ camp, onClose }: { camp: Camp; onClose: () => void }) {
  const { user } = useAuth();
  const [perg, setPerg] = useState<Perg[]>([]);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [setor, setSetor] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("feedback_perguntas").select("*").eq("campanha_id", camp.id).order("ordem");
      setPerg((data as Perg[]) || []);
    })();
  }, [camp.id]);

  const enviar = async () => {
    if (!user) return;
    const { data: r, error } = await supabase
      .from("feedback_respostas")
      .insert({
        campanha_id: camp.id,
        user_id: user.id,
        user_nome: (user.user_metadata?.nome as string) || user.email,
        setor: setor || null,
        comentario: comentario || null,
      } as never)
      .select()
      .single();
    if (error || !r) return toast.error(error?.message || "Erro");
    const itens = perg.map((p) => ({ resposta_id: (r as Resp).id, pergunta_id: p.id, valor_nota: vals[p.id] ?? null }));
    if (itens.length) await supabase.from("feedback_resposta_itens").insert(itens as never);
    toast.success("Resposta enviada — obrigado!");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{camp.titulo}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {camp.descricao && <p className="text-sm text-muted-foreground">{camp.descricao}</p>}
          <Input placeholder="Seu setor (opcional)" value={setor} onChange={(e) => setSetor(e.target.value)} />
          {perg.map((p) => (
            <div key={p.id} className="space-y-2">
              <Label>{p.texto}</Label>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 11 }).map((_, n) => (
                  <button
                    key={n}
                    onClick={() => setVals((v) => ({ ...v, [p.id]: n }))}
                    className={`h-9 w-9 rounded-md border text-sm font-medium ${vals[p.id] === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                  >{n}</button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <Label>Comentário (opcional)</Label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar}>Enviar resposta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashCampanha({ camp, onClose }: { camp: Camp; onClose: () => void }) {
  const [perg, setPerg] = useState<Perg[]>([]);
  const [resps, setResps] = useState<Resp[]>([]);
  const [itens, setItens] = useState<RespItem[]>([]);

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("feedback_perguntas").select("*").eq("campanha_id", camp.id).order("ordem"),
        supabase.from("feedback_respostas").select("*").eq("campanha_id", camp.id),
      ]);
      setPerg((p.data as Perg[]) || []);
      setResps((r.data as Resp[]) || []);
      const ids = (r.data as Resp[] | null)?.map((x) => x.id) || [];
      if (ids.length) {
        const { data: it } = await supabase.from("feedback_resposta_itens").select("*").in("resposta_id", ids);
        setItens((it as RespItem[]) || []);
      }
    })();
  }, [camp.id]);

  const medias = perg.map((p) => {
    const vals = itens.filter((i) => i.pergunta_id === p.id && i.valor_nota != null).map((i) => i.valor_nota as number);
    const media = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
    return { name: p.texto.slice(0, 28) + (p.texto.length > 28 ? "..." : ""), media };
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Resultados — {camp.titulo}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{resps.length} resposta(s)</p>
          {medias.length > 0 && (
            <Card className="p-4">
              <p className="font-semibold mb-2">Médias por pergunta (0–10)</p>
              <ResponsiveContainer width="100%" height={Math.max(220, medias.length * 50)}>
                <BarChart data={medias} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 10]} />
                  <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="media" fill="oklch(0.62 0.18 235)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
          <Card className="p-4">
            <p className="font-semibold mb-2">Comentários</p>
            <div className="space-y-2 max-h-72 overflow-auto">
              {resps.filter((r) => r.comentario).length === 0 && <p className="text-sm text-muted-foreground">Nenhum comentário.</p>}
              {resps.filter((r) => r.comentario).map((r) => (
                <div key={r.id} className="border rounded p-2 text-sm">
                  <p>{r.comentario}</p>
                  <p className="text-xs text-muted-foreground mt-1">{r.user_nome} • {r.setor || "—"} • {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
