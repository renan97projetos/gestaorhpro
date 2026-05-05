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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pin, Trash2, Pencil, NotebookPen } from "lucide-react";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/notas")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Nota = {
  id: string;
  user_id: string;
  titulo: string;
  conteudo: string | null;
  cor: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

const CORES = ["#FEF3C7", "#DBEAFE", "#FCE7F3", "#D1FAE5", "#E9D5FF", "#FED7AA"];

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Nota[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Nota | null>(null);
  const [form, setForm] = useState({ titulo: "", conteudo: "", cor: CORES[0] });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notas")
      .select("*")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    setRows((data as Nota[]) || []);
  };

  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEdit(null);
    setForm({ titulo: "", conteudo: "", cor: CORES[0] });
    setOpen(true);
  };
  const openEdit = (n: Nota) => {
    setEdit(n);
    setForm({ titulo: n.titulo, conteudo: n.conteudo || "", cor: n.cor || CORES[0] });
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    if (!form.titulo.trim()) return toast.error("Informe um título");
    if (edit) {
      const { error } = await supabase
        .from("notas")
        .update({ titulo: form.titulo, conteudo: form.conteudo, cor: form.cor } as never)
        .eq("id", edit.id);
      if (error) return toast.error(error.message);
      logAudit({ acao: "update", entidade: "notas", entidade_id: edit.id, resumo: `Editou nota: ${form.titulo}` });
      toast.success("Nota atualizada");
    } else {
      const { data, error } = await supabase
        .from("notas")
        .insert({ user_id: user.id, titulo: form.titulo, conteudo: form.conteudo, cor: form.cor } as never)
        .select()
        .single();
      if (error) return toast.error(error.message);
      logAudit({ acao: "create", entidade: "notas", entidade_id: (data as { id: string })?.id, resumo: `Criou nota: ${form.titulo}` });
      toast.success("Nota criada");
    }
    setOpen(false);
    load();
  };

  const togglePin = async (n: Nota) => {
    await supabase.from("notas").update({ pinned: !n.pinned } as never).eq("id", n.id);
    load();
  };

  const remover = async (n: Nota) => {
    if (!confirm("Excluir esta nota?")) return;
    const { error } = await supabase.from("notas").delete().eq("id", n.id);
    if (error) return toast.error(error.message);
    logAudit({ acao: "delete", entidade: "notas", entidade_id: n.id, resumo: `Excluiu nota: ${n.titulo}` });
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <NotebookPen className="h-6 w-6" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Bloco de Notas</h1>
            <p className="text-sm text-muted-foreground">Suas anotações privadas — só você consegue ver.</p>
          </div>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova nota</Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma nota ainda.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((n) => (
            <Card key={n.id} className="p-4 flex flex-col gap-2 border-2" style={{ background: n.cor || undefined }}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 break-words">{n.titulo}</h3>
                <button onClick={() => togglePin(n)} title="Fixar">
                  <Pin className={`h-4 w-4 ${n.pinned ? "text-rose-600 fill-rose-600" : "text-slate-500"}`} />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap text-slate-800 flex-1">{n.conteudo}</p>
              <div className="flex items-center justify-between text-xs text-slate-700 pt-2 border-t border-black/10">
                <span>{new Date(n.updated_at).toLocaleString("pt-BR")}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-700 hover:bg-black/10" onClick={() => openEdit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-black/10" onClick={() => remover(n)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit ? "Editar nota" : "Nova nota"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
            <Textarea rows={6} placeholder="Anotação..." value={form.conteudo} onChange={(e) => setForm((f) => ({ ...f, conteudo: e.target.value }))} />
            <div className="flex gap-2">
              {CORES.map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, cor: c }))}
                  className={`h-7 w-7 rounded-full border-2 ${form.cor === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }} aria-label="cor" />
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
