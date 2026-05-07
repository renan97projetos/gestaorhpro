import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Plus, Pencil, Trash2, ExternalLink, Crown, Building2, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/base-conhecimento")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

type Item = {
  id: string;
  empresa_id: string | null;
  titulo: string;
  descricao: string | null;
  categoria: string;
  conteudo: string | null;
  video_url: string | null;
  anexo_url: string | null;
  tipo: string;
  ativo: boolean;
  created_by_nome: string | null;
  created_at: string;
};

const CATEGORIAS = ["geral", "onboarding", "rh", "processos", "sistema", "novidade"];

function youtubeEmbed(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function Page() {
  const { user } = useAuth();
  const { empresaAtual, isAdminMestre, canEdit } = useEmpresa();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"todos" | "globais" | "empresa">("todos");
  const [edit, setEdit] = useState<Item | null>(null);
  const [view, setView] = useState<Item | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("base_conhecimento")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false });
    setItems((data as Item[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter((i) => {
    if (tab === "globais") return i.empresa_id === null;
    if (tab === "empresa") return i.empresa_id === empresaAtual?.id;
    return true;
  });

  const novoBase: Partial<Item> = {
    empresa_id: isAdminMestre ? null : empresaAtual?.id,
    titulo: "",
    descricao: "",
    categoria: "geral",
    conteudo: "",
    video_url: "",
    anexo_url: "",
    tipo: "treinamento",
    ativo: true,
  };

  const handleSave = async (data: Partial<Item>) => {
    if (!data.titulo) return toast.error("Título obrigatório");
    if (data.id) {
      const { error } = await supabase.from("base_conhecimento").update({
        titulo: data.titulo, descricao: data.descricao, categoria: data.categoria,
        conteudo: data.conteudo, video_url: data.video_url || null, anexo_url: data.anexo_url || null,
        tipo: data.tipo, empresa_id: data.empresa_id,
      } as never).eq("id", data.id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const { error } = await supabase.from("base_conhecimento").insert({
        titulo: data.titulo, descricao: data.descricao, categoria: data.categoria,
        conteudo: data.conteudo, video_url: data.video_url || null, anexo_url: data.anexo_url || null,
        tipo: data.tipo, empresa_id: isAdminMestre && !data.empresa_id ? null : (data.empresa_id ?? empresaAtual?.id ?? null),
        created_by: user?.id, created_by_nome: user?.email,
      } as never);
      if (error) return toast.error(error.message);
      toast.success("Treinamento criado");
    }
    setOpen(false); setEdit(null); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("base_conhecimento").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const podeEditar = (i: Item) =>
    isAdminMestre || (i.empresa_id && i.empresa_id === empresaAtual?.id && canEdit);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" /> Base de Conhecimento
          </h1>
          <p className="text-sm text-muted-foreground">Treinamentos, novidades e materiais de apoio.</p>
        </div>
        {(isAdminMestre || canEdit) && (
          <Button onClick={() => { setEdit(novoBase as Item); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo treinamento
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="globais"><Crown className="h-3 w-3 mr-1" /> Sistema</TabsTrigger>
          <TabsTrigger value="empresa"><Building2 className="h-3 w-3 mr-1" /> Da empresa</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">Nenhum treinamento ainda.</Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((i) => (
                <Card key={i.id} className="p-4 flex flex-col hover:shadow-[var(--shadow-elegant)] transition-all cursor-pointer" onClick={() => setView(i)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant={i.empresa_id === null ? "default" : "outline"} className="text-[10px]">
                      {i.empresa_id === null ? <><Crown className="h-3 w-3 mr-1" />Sistema</> : <><Building2 className="h-3 w-3 mr-1" />Empresa</>}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{i.categoria}</Badge>
                  </div>
                  {i.video_url && youtubeEmbed(i.video_url) && (
                    <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center">
                      <PlayCircle className="h-10 w-10 text-primary/60" />
                    </div>
                  )}
                  <h3 className="font-semibold text-sm">{i.titulo}</h3>
                  {i.descricao && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{i.descricao}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-[11px] text-muted-foreground">
                    <span>{new Date(i.created_at).toLocaleDateString("pt-BR")}</span>
                    {podeEditar(i) && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEdit(i); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(i.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {open && edit && (
        <EditDialog
          item={edit}
          isAdminMestre={isAdminMestre}
          empresaId={empresaAtual?.id ?? null}
          onClose={() => { setOpen(false); setEdit(null); }}
          onSave={handleSave}
        />
      )}

      {view && (
        <Dialog open onOpenChange={() => setView(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {view.empresa_id === null ? <Crown className="h-4 w-4 text-amber-500" /> : <Building2 className="h-4 w-4" />}
                {view.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant="outline">{view.categoria}</Badge>
                <Badge variant="outline">{view.tipo}</Badge>
              </div>
              {view.descricao && <p className="text-sm text-muted-foreground">{view.descricao}</p>}
              {view.video_url && youtubeEmbed(view.video_url) && (
                <div className="aspect-video">
                  <iframe src={youtubeEmbed(view.video_url)!} className="w-full h-full rounded-md" allowFullScreen />
                </div>
              )}
              {view.video_url && !youtubeEmbed(view.video_url) && (
                <a href={view.video_url} target="_blank" rel="noopener" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <PlayCircle className="h-4 w-4" /> Abrir vídeo
                </a>
              )}
              {view.conteudo && <div className="text-sm whitespace-pre-wrap">{view.conteudo}</div>}
              {view.anexo_url && (
                <a href={view.anexo_url} target="_blank" rel="noopener" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="h-4 w-4" /> Abrir anexo
                </a>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditDialog({ item, isAdminMestre, empresaId, onClose, onSave }: {
  item: Item; isAdminMestre: boolean; empresaId: string | null;
  onClose: () => void; onSave: (data: Partial<Item>) => void;
}) {
  const [form, setForm] = useState<Item>(item);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{form.id ? "Editar" : "Novo"} treinamento</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Descrição curta</Label><Input value={form.descricao || ""} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="treinamento">Treinamento</SelectItem>
                <SelectItem value="novidade">Novidade do sistema</SelectItem>
                <SelectItem value="documento">Documento</SelectItem>
                <SelectItem value="tutorial">Tutorial</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isAdminMestre && (
            <div className="md:col-span-2">
              <Label>Visibilidade</Label>
              <Select
                value={form.empresa_id === null ? "global" : "empresa"}
                onValueChange={(v) => setForm({ ...form, empresa_id: v === "global" ? null : empresaId })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">🌍 Global — todas as empresas verão</SelectItem>
                  <SelectItem value="empresa">🏢 Apenas a empresa atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2"><Label>URL do vídeo (YouTube ou link)</Label><Input value={form.video_url || ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></div>
          <div className="md:col-span-2"><Label>URL de anexo (PDF, slide, etc.)</Label><Input value={form.anexo_url || ""} onChange={(e) => setForm({ ...form, anexo_url: e.target.value })} placeholder="https://..." /></div>
          <div className="md:col-span-2"><Label>Conteúdo / instruções</Label><Textarea rows={6} value={form.conteudo || ""} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
