import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
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
import { Megaphone, Plus, Trash2, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/avisos")({
  component: () => <RequireAuth><AvisosPage /></RequireAuth>,
});

interface Aviso {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string | null;
  criticidade: string;
  empresa_id: string | null;
  ativo: boolean;
  created_by_nome: string | null;
  created_at: string;
}

const critIcon = (c: string) =>
  c === "alerta" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
  c === "sucesso" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
  <Info className="h-4 w-4 text-blue-500" />;

function AvisosPage() {
  const { user } = useAuth();
  const { isAdminMestre, empresas } = useEmpresa();
  const [list, setList] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", resumo: "", conteudo: "", criticidade: "info", empresa_id: "all" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("avisos").select("*").order("created_at", { ascending: false });
    setList((data || []) as Aviso[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const salvar = async () => {
    if (!form.titulo || !form.resumo) { toast.error("Título e resumo obrigatórios"); return; }
    const { error } = await supabase.from("avisos").insert({
      titulo: form.titulo,
      resumo: form.resumo,
      conteudo: form.conteudo || null,
      criticidade: form.criticidade,
      empresa_id: form.empresa_id === "all" ? null : form.empresa_id,
      created_by: user!.id,
      created_by_nome: user!.email,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Aviso publicado");
    setOpen(false);
    setForm({ titulo: "", resumo: "", conteudo: "", criticidade: "info", empresa_id: "all" });
    load();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir aviso?")) return;
    const { error } = await supabase.from("avisos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído");
    load();
  };

  const toggleAtivo = async (a: Aviso) => {
    await supabase.from("avisos").update({ ativo: !a.ativo }).eq("id", a.id);
    load();
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Avisos</h1>
          </div>
          {isAdminMestre && (
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo aviso</Button>
          )}
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> :
          list.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhum aviso no momento.</Card>
          ) : (
            <div className="space-y-3">
              {list.map((a) => (
                <Card key={a.id} className={`p-4 ${!a.ativo ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {critIcon(a.criticidade)}
                        <h3 className="font-semibold">{a.titulo}</h3>
                        <Badge variant="outline">{a.empresa_id ? (empresas.find(e => e.id === a.empresa_id)?.nome || "Empresa") : "Todas"}</Badge>
                        {!a.ativo && <Badge variant="secondary">Inativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{a.resumo}</p>
                      {a.conteudo && <p className="text-sm whitespace-pre-wrap">{a.conteudo}</p>}
                      <p className="text-xs text-muted-foreground mt-2">
                        Por {a.created_by_nome || "—"} • {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {isAdminMestre && (
                      <div className="flex flex-col gap-1">
                        <Button size="sm" variant="ghost" onClick={() => toggleAtivo(a)}>{a.ativo ? "Desativar" : "Ativar"}</Button>
                        <Button size="sm" variant="ghost" onClick={() => excluir(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo aviso</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
              <div><Label>Resumo (aparece no popup)</Label><Input value={form.resumo} onChange={(e) => setForm({ ...form, resumo: e.target.value })} /></div>
              <div><Label>Conteúdo completo (opcional)</Label><Textarea rows={5} value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Criticidade</Label>
                  <Select value={form.criticidade} onValueChange={(v) => setForm({ ...form, criticidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Informativo</SelectItem>
                      <SelectItem value="alerta">Alerta</SelectItem>
                      <SelectItem value="sucesso">Sucesso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Destino</Label>
                  <Select value={form.empresa_id} onValueChange={(v) => setForm({ ...form, empresa_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as empresas</SelectItem>
                      {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Publicar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
