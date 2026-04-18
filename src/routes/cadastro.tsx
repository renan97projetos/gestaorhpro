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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <CadastroPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Colab = {
  id: string;
  matricula: string;
  colaborador: string;
  status: "Ativo" | "Demitido" | "Afastado" | "Ferias";
  cargo: string | null;
  setor: string | null;
  subsetor: string | null;
  lideranca: string | null;
  turno: string | null;
  sabado_trabalho: string | null;
  sabado_horario: string | null;
  horario_almoco: string | null;
  horario_cafe: string | null;
  admissao: string | null;
};

const STATUS_OPTS = ["Ativo", "Demitido", "Afastado", "Ferias"] as const;
const TRACKED_FIELDS: (keyof Colab)[] = [
  "matricula",
  "colaborador",
  "status",
  "cargo",
  "setor",
  "subsetor",
  "lideranca",
  "turno",
  "sabado_trabalho",
  "sabado_horario",
  "horario_almoco",
  "horario_cafe",
  "admissao",
];
const FIELD_LABELS: Record<string, string> = {
  matricula: "Matrícula",
  colaborador: "Colaborador",
  status: "Status",
  cargo: "Cargo",
  setor: "Setor",
  subsetor: "Subsetor",
  lideranca: "Liderança",
  turno: "Turno",
  sabado_trabalho: "Sábado Trabalho",
  sabado_horario: "Sábado Horário",
  horario_almoco: "Horário Almoço",
  horario_cafe: "Horário Café",
  admissao: "Admissão",
};

function CadastroPage() {
  const { user, isGestor } = useAuth();
  const [list, setList] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [setorFilter, setSetorFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Colab | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("colaboradores")
      .select("*")
      .order("colaborador");
    if (error) toast.error(error.message);
    setList((data as Colab[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const setores = useMemo(
    () => Array.from(new Set(list.map((c) => c.setor).filter(Boolean) as string[])).sort(),
    [list]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return list.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (setorFilter !== "all" && c.setor !== setorFilter) return false;
      if (!term) return true;
      return (
        c.colaborador.toLowerCase().includes(term) ||
        c.matricula.toLowerCase().includes(term) ||
        (c.cargo ?? "").toLowerCase().includes(term) ||
        (c.lideranca ?? "").toLowerCase().includes(term)
      );
    });
  }, [list, q, statusFilter, setorFilter]);

  const handleSaveEdit = async (updated: Partial<Colab>) => {
    if (!editing) return;
    const changes: { campo: string; anterior: string; novo: string }[] = [];
    TRACKED_FIELDS.forEach((f) => {
      const a = (editing as Record<string, unknown>)[f];
      const n = (updated as Record<string, unknown>)[f];
      if ((a ?? "") !== (n ?? "")) {
        changes.push({
          campo: FIELD_LABELS[f] ?? f,
          anterior: a == null ? "" : String(a),
          novo: n == null ? "" : String(n),
        });
      }
    });

    const { error } = await supabase.from("colaboradores").update(updated).eq("id", editing.id);
    if (error) return toast.error(error.message);

    if (changes.length && user) {
      await supabase.from("movimentacoes").insert(
        changes.map((c) => ({
          colaborador_id: editing.id,
          matricula: editing.matricula,
          colaborador_nome: editing.colaborador,
          campo: c.campo,
          valor_anterior: c.anterior || null,
          valor_novo: c.novo || null,
          tipo: "edicao",
          user_id: user.id,
          user_nome: user.email ?? null,
        }))
      );
    }
    toast.success("Colaborador atualizado");
    setEditing(null);
    load();
  };

  const handleCreate = async (newC: Partial<Colab>) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("colaboradores")
      .insert({ ...newC, created_by: user.id } as never)
      .select()
      .single();
    if (error) return toast.error(error.message);
    await supabase.from("movimentacoes").insert({
      colaborador_id: data.id,
      matricula: data.matricula,
      colaborador_nome: data.colaborador,
      campo: "Cadastro",
      valor_novo: "Colaborador criado",
      tipo: "criacao",
      user_id: user.id,
      user_nome: user.email ?? null,
    });
    toast.success("Colaborador cadastrado");
    setCreating(false);
    load();
  };

  const handleDelete = async (c: Colab) => {
    if (!confirm(`Excluir ${c.colaborador}?`)) return;
    const { error } = await supabase.from("colaboradores").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} de {list.length} registros</p>
        </div>
        {isGestor && (
          <Button onClick={() => setCreating(true)} className="bg-[image:var(--gradient-primary)]">
            <Plus className="h-4 w-4 mr-2" /> Novo colaborador
          </Button>
        )}
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar nome, matrícula, cargo..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={setorFilter} onValueChange={setSetorFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Matrícula</th>
                  <th className="text-left p-3">Colaborador</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Cargo</th>
                  <th className="text-left p-3">Setor</th>
                  <th className="text-left p-3">Liderança</th>
                  <th className="text-left p-3">Turno</th>
                  <th className="text-left p-3">Admissão</th>
                  <th className="text-right p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono text-xs">{c.matricula}</td>
                    <td className="p-3 font-medium">{c.colaborador}</td>
                    <td className="p-3"><StatusBadge s={c.status} /></td>
                    <td className="p-3">{c.cargo}</td>
                    <td className="p-3">{c.setor}</td>
                    <td className="p-3 text-muted-foreground">{c.lideranca}</td>
                    <td className="p-3 text-xs">{c.turno}</td>
                    <td className="p-3 text-xs">{c.admissao}</td>
                    <td className="p-3 text-right">
                      {isGestor && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum resultado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ColabDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing}
        onSave={handleSaveEdit}
        title="Editar colaborador"
      />
      <ColabDialog
        open={creating}
        onClose={() => setCreating(false)}
        initial={null}
        onSave={handleCreate}
        title="Novo colaborador"
      />
    </div>
  );
}

function StatusBadge({ s }: { s: Colab["status"] }) {
  const variants: Record<string, string> = {
    Ativo: "bg-success/15 text-success border-success/30",
    Demitido: "bg-destructive/15 text-destructive border-destructive/30",
    Afastado: "bg-warning/15 text-warning-foreground border-warning/30",
    Ferias: "bg-primary/15 text-primary border-primary/30",
  };
  return <Badge variant="outline" className={variants[s]}>{s}</Badge>;
}

function ColabDialog({
  open,
  onClose,
  initial,
  onSave,
  title,
}: {
  open: boolean;
  onClose: () => void;
  initial: Colab | null;
  onSave: (c: Partial<Colab>) => Promise<void>;
  title: string;
}) {
  const [form, setForm] = useState<Partial<Colab>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ?? { status: "Ativo" });
  }, [initial, open]);

  const set = <K extends keyof Colab>(k: K, v: Colab[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matricula || !form.colaborador) return toast.error("Matrícula e nome são obrigatórios");
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Matrícula *"><Input value={form.matricula ?? ""} onChange={(e) => set("matricula", e.target.value)} required /></Field>
            <Field label="Colaborador *"><Input value={form.colaborador ?? ""} onChange={(e) => set("colaborador", e.target.value)} required /></Field>
            <Field label="Status">
              <Select value={form.status ?? "Ativo"} onValueChange={(v) => set("status", v as Colab["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Cargo"><Input value={form.cargo ?? ""} onChange={(e) => set("cargo", e.target.value)} /></Field>
            <Field label="Setor"><Input value={form.setor ?? ""} onChange={(e) => set("setor", e.target.value)} /></Field>
            <Field label="Subsetor"><Input value={form.subsetor ?? ""} onChange={(e) => set("subsetor", e.target.value)} /></Field>
            <Field label="Liderança"><Input value={form.lideranca ?? ""} onChange={(e) => set("lideranca", e.target.value)} /></Field>
            <Field label="Turno"><Input value={form.turno ?? ""} onChange={(e) => set("turno", e.target.value)} placeholder="08:00 - 17:15" /></Field>
            <Field label="Sábado trabalha?">
              <Select value={form.sabado_trabalho ?? ""} onValueChange={(v) => set("sabado_trabalho", v)}>
                <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
              </Select>
            </Field>
            <Field label="Horário sábado"><Input value={form.sabado_horario ?? ""} onChange={(e) => set("sabado_horario", e.target.value)} /></Field>
            <Field label="Horário almoço"><Input value={form.horario_almoco ?? ""} onChange={(e) => set("horario_almoco", e.target.value)} /></Field>
            <Field label="Horário café"><Input value={form.horario_cafe ?? ""} onChange={(e) => set("horario_cafe", e.target.value)} /></Field>
            <Field label="Admissão"><Input type="date" value={form.admissao ?? ""} onChange={(e) => set("admissao", e.target.value)} /></Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-[image:var(--gradient-primary)]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
