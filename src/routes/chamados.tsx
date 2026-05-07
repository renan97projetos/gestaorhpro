import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LifeBuoy, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/chamados")({
  component: () => <RequireAuth><ChamadosPage /></RequireAuth>,
});

interface Chamado {
  id: string; empresa_id: string; titulo: string; descricao: string;
  categoria: string; prioridade: string; status: string;
  resposta: string | null; motivo: string | null;
  created_by_nome: string | null; respondido_por_nome: string | null;
  created_at: string; respondido_em: string | null;
}
interface Mensagem {
  id: string; chamado_id: string; user_nome: string | null;
  is_mestre: boolean; conteudo: string; created_at: string;
}

const statusBadge: Record<string, string> = {
  aberto: "bg-blue-500",
  em_analise: "bg-amber-500",
  aprovado: "bg-emerald-500",
  reprovado: "bg-red-500",
};
const statusLabel: Record<string, string> = {
  aberto: "Aberto", em_analise: "Em Análise", aprovado: "Aprovado", reprovado: "Reprovado",
};

function ChamadosPage() {
  const { user } = useAuth();
  const { isAdminMestre, empresaAtual, empresas } = useEmpresa();
  const [list, setList] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [selecionado, setSelecionado] = useState<Chamado | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [novaMsg, setNovaMsg] = useState("");
  const [form, setForm] = useState({ titulo: "", descricao: "", categoria: "melhoria", prioridade: "normal" });

  const empMap = useMemo(() => {
    const m: Record<string, string> = {};
    empresas.forEach(e => m[e.id] = e.nome);
    return m;
  }, [empresas]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("chamados").select("*").order("created_at", { ascending: false });
    if (filtroStatus !== "todos") q = q.eq("status", filtroStatus);
    const { data } = await q;
    setList((data || []) as Chamado[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filtroStatus]);

  const carregarMensagens = async (id: string) => {
    const { data } = await supabase.from("chamados_mensagens").select("*").eq("chamado_id", id).order("created_at");
    setMensagens((data || []) as Mensagem[]);
  };

  const abrir = async (c: Chamado) => {
    setSelecionado(c);
    carregarMensagens(c.id);
  };

  const criar = async () => {
    if (!form.titulo || !form.descricao) { toast.error("Preencha título e descrição"); return; }
    if (!empresaAtual) { toast.error("Selecione uma empresa"); return; }
    const { error } = await supabase.from("chamados").insert({
      empresa_id: empresaAtual.id,
      titulo: form.titulo,
      descricao: form.descricao,
      categoria: form.categoria,
      prioridade: form.prioridade,
      created_by: user!.id,
      created_by_nome: user!.email,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Chamado aberto");
    setOpenNovo(false);
    setForm({ titulo: "", descricao: "", categoria: "melhoria", prioridade: "normal" });
    load();
  };

  const responder = async (status: string) => {
    if (!selecionado) return;
    const { error } = await supabase.from("chamados").update({
      status,
      resposta: selecionado.resposta,
      motivo: selecionado.motivo,
      respondido_por: user!.id,
      respondido_por_nome: user!.email,
      respondido_em: new Date().toISOString(),
    }).eq("id", selecionado.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Atualizado");
    load();
    setSelecionado({ ...selecionado, status });
  };

  const enviarMsg = async () => {
    if (!selecionado || !novaMsg.trim()) return;
    const { error } = await supabase.from("chamados_mensagens").insert({
      chamado_id: selecionado.id,
      user_id: user!.id,
      user_nome: user!.email,
      is_mestre: isAdminMestre,
      conteudo: novaMsg.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setNovaMsg("");
    carregarMensagens(selecionado.id);
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Chamados</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
              </SelectContent>
            </Select>
            {!isAdminMestre && (
              <Button onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4 mr-1" /> Novo chamado</Button>
            )}
          </div>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          list.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhum chamado.</Card>
          ) : (
            <div className="grid gap-3">
              {list.map((c) => (
                <Card key={c.id} className="p-4 cursor-pointer hover:shadow-md transition" onClick={() => abrir(c)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold">{c.titulo}</h3>
                        <Badge className={statusBadge[c.status]}>{statusLabel[c.status]}</Badge>
                        <Badge variant="outline" className="capitalize">{c.categoria}</Badge>
                        <Badge variant="outline" className="capitalize">{c.prioridade}</Badge>
                        {isAdminMestre && <Badge variant="secondary">{empMap[c.empresa_id] || "—"}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{c.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Aberto por {c.created_by_nome} em {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

        {/* Detalhes */}
        <Dialog open={!!selecionado} onOpenChange={(o) => { if (!o) setSelecionado(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selecionado && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    {selecionado.titulo}
                    <Badge className={statusBadge[selecionado.status]}>{statusLabel[selecionado.status]}</Badge>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    {empMap[selecionado.empresa_id]} • {selecionado.created_by_nome} • {format(new Date(selecionado.created_at), "dd/MM/yyyy HH:mm")}
                  </div>
                  <Card className="p-3 bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{selecionado.descricao}</p>
                  </Card>

                  {isAdminMestre ? (
                    <div className="space-y-2 border-t pt-3">
                      <Label className="text-sm font-semibold">Resposta do mestre</Label>
                      <Textarea
                        rows={3}
                        placeholder="Resposta visível para a empresa"
                        value={selecionado.resposta || ""}
                        onChange={(e) => setSelecionado({ ...selecionado, resposta: e.target.value })}
                      />
                      <Label className="text-sm">Motivo (caso reprovado)</Label>
                      <Textarea
                        rows={2}
                        placeholder="Ex: melhoria fora do plano contratado"
                        value={selecionado.motivo || ""}
                        onChange={(e) => setSelecionado({ ...selecionado, motivo: e.target.value })}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => responder("em_analise")}>Em análise</Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => responder("aprovado")}>Aprovar</Button>
                        <Button size="sm" variant="destructive" onClick={() => responder("reprovado")}>Reprovar</Button>
                      </div>
                    </div>
                  ) : (
                    (selecionado.resposta || selecionado.motivo) && (
                      <Card className="p-3 border-l-4 border-l-primary">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta do suporte</p>
                        {selecionado.resposta && <p className="text-sm whitespace-pre-wrap">{selecionado.resposta}</p>}
                        {selecionado.motivo && <p className="text-xs text-muted-foreground mt-2"><strong>Motivo:</strong> {selecionado.motivo}</p>}
                      </Card>
                    )
                  )}

                  {/* Conversa */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-sm font-semibold">Conversa</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {mensagens.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>}
                      {mensagens.map(m => (
                        <div key={m.id} className={`p-2 rounded-md text-sm ${m.is_mestre ? "bg-primary/10 ml-6" : "bg-muted mr-6"}`}>
                          <p className="text-xs font-semibold">{m.is_mestre ? "🛡 Suporte" : m.user_nome}</p>
                          <p className="whitespace-pre-wrap">{m.conteudo}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(m.created_at), "dd/MM HH:mm")}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Escreva uma mensagem..." value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMsg()} />
                      <Button onClick={enviarMsg}><Send className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Novo */}
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogContent>
            <DialogHeader><DialogTitle>Abrir novo chamado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea rows={5} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="erro">Erro / Bug</SelectItem>
                      <SelectItem value="melhoria">Melhoria</SelectItem>
                      <SelectItem value="duvida">Dúvida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenNovo(false)}>Cancelar</Button>
              <Button onClick={criar}>Abrir chamado</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
