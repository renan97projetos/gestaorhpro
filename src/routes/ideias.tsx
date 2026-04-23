import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lightbulb, Plus, Trash2, Mail, Briefcase, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/ideias")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <IdeiasPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Ideia = {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  cargo: string;
  titulo: string;
  descricao: string;
  created_at: string;
};

const ideiaSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  cargo: z.string().trim().min(2, "Cargo muito curto").max(100),
  titulo: z.string().trim().min(3, "Título muito curto").max(150),
  descricao: z.string().trim().min(10, "Descreva sua ideia com mais detalhes").max(2000),
});

function IdeiasPage() {
  const { user, isGestor } = useAuth();
  const [ideias, setIdeias] = useState<Ideia[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<Ideia | null>(null);

  const [form, setForm] = useState({
    nome: "",
    email: user?.email ?? "",
    cargo: "",
    titulo: "",
    descricao: "",
  });

  useEffect(() => {
    fetchIdeias();
  }, []);

  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email ?? "" }));
    }
  }, [user]);

  async function fetchIdeias() {
    setLoading(true);
    const { data, error } = await supabase
      .from("ideias")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar ideias", { description: error.message });
    } else {
      setIdeias((data ?? []) as Ideia[]);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = ideiaSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (!user) {
      toast.error("Sessão expirada");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ideias").insert({
      user_id: user.id,
      ...parsed.data,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível registrar sua ideia", { description: error.message });
      return;
    }
    toast.success("Ideia registrada com sucesso!");
    setOpenForm(false);
    setForm({
      nome: "",
      email: user?.email ?? "",
      cargo: "",
      titulo: "",
      descricao: "",
    });
    fetchIdeias();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase.from("ideias").delete().eq("id", toDelete.id);
    if (error) {
      toast.error("Erro ao apagar", { description: error.message });
    } else {
      toast.success("Ideia removida");
      setIdeias((prev) => prev.filter((i) => i.id !== toDelete.id));
    }
    setToDelete(null);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-md">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Diretório de Ideias</h1>
            <p className="text-sm text-muted-foreground">
              Compartilhe sugestões para melhorar nossa empresa
            </p>
          </div>
        </div>
        <Button onClick={() => setOpenForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova ideia
        </Button>
      </div>

      {!isGestor && (
        <Card className="p-4 bg-muted/40 border-dashed">
          <p className="text-sm text-muted-foreground">
            💡 Você está visualizando apenas <strong>suas próprias ideias</strong>.
            Apenas administradores e gestores podem ver todas as ideias da equipe.
          </p>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : ideias.length === 0 ? (
        <Card className="p-12 text-center">
          <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {isGestor
              ? "Nenhuma ideia registrada ainda."
              : "Você ainda não registrou nenhuma ideia. Clique em 'Nova ideia' para começar!"}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideias.map((ideia) => (
            <Card key={ideia.id} className="p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg leading-tight">{ideia.titulo}</h3>
                {isGestor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 shrink-0 -mt-1 -mr-1"
                    onClick={() => setToDelete(ideia)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {ideia.descricao}
              </p>
              <div className="border-t pt-3 mt-auto space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{ideia.nome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3 w-3" /> {ideia.cargo}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" /> {ideia.email}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {new Date(ideia.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Form */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova ideia</DialogTitle>
            <DialogDescription>
              Compartilhe sua sugestão. Preencha seus dados e descreva sua ideia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cargo">Cargo *</Label>
                <Input
                  id="cargo"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  required
                  maxLength={100}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="titulo">Título da ideia *</Label>
              <Input
                id="titulo"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
                maxLength={150}
                placeholder="Ex.: Melhorar comunicação interna"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                required
                maxLength={2000}
                rows={5}
                placeholder="Descreva sua ideia com detalhes..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar ideia
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar ideia?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A ideia "{toDelete?.titulo}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
