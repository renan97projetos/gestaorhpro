import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, ArrowRightLeft, TrendingUp, Trash2 } from "lucide-react";

export const Route = createFileRoute("/movimentacoes-admissoes")({
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
  colaborador_id: string;
  colaborador_nome: string;
  cargo: string | null;
  setor: string | null;
  tipo: "substituicao" | "aumento_quadro" | string;
  substituido_id: string | null;
  substituido_nome: string | null;
  vaga_id: string | null;
  data_admissao: string;
  observacao: string | null;
  created_at: string;
};

type ColabLite = { id: string; colaborador: string; cargo: string | null; setor: string | null; status: string };

function Page() {
  const { isAdmin, isGestor } = useAuth() as { isAdmin: boolean; isGestor?: boolean };
  const canEdit = isAdmin || !!isGestor;
  const [rows, setRows] = useState<Mov[]>([]);
  const [colabs, setColabs] = useState<ColabLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    colaborador_id: "",
    tipo: "substituicao" as "substituicao" | "aumento_quadro",
    substituido_id: "",
    vaga_id: "",
    data_admissao: new Date().toISOString().slice(0, 10),
    observacao: "",
  });

  const load = async () => {
    setLoading(true);
    const [m, c] = await Promise.all([
      supabase.from("admissoes_movimentacao").select("*").order("data_admissao", { ascending: false }),
      supabase.from("colaboradores").select("id,colaborador,cargo,setor,status").order("colaborador"),
    ]);
    if (m.error) toast.error(m.error.message);
    setRows((m.data as Mov[]) || []);
    setColabs((c.data as ColabLite[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const sub = rows.filter((r) => r.tipo === "substituicao").length;
    const aum = total - sub;
    return {
      total,
      sub,
      aum,
      pctSub: total ? Math.round((sub / total) * 100) : 0,
      pctAum: total ? Math.round((aum / total) * 100) : 0,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.colaborador_nome.toLowerCase().includes(q) ||
        (r.substituido_nome || "").toLowerCase().includes(q) ||
        (r.cargo || "").toLowerCase().includes(q) ||
        (r.setor || "").toLowerCase().includes(q),
    );
  }, [rows, filtro]);

  const handleSave = async () => {
    if (!form.colaborador_id) return toast.error("Selecione o colaborador que entrou");
    if (form.tipo === "substituicao" && !form.substituido_id) return toast.error("Informe quem foi substituído");
    const colab = colabs.find((c) => c.id === form.colaborador_id);
    const sub = colabs.find((c) => c.id === form.substituido_id);
    if (!colab) return toast.error("Colaborador inválido");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("admissoes_movimentacao").insert({
      colaborador_id: colab.id,
      colaborador_nome: colab.colaborador,
      cargo: colab.cargo,
      setor: colab.setor,
      tipo: form.tipo,
      substituido_id: form.tipo === "substituicao" ? sub?.id ?? null : null,
      substituido_nome: form.tipo === "substituicao" ? sub?.colaborador ?? null : null,
      vaga_id: form.vaga_id || null,
      data_admissao: form.data_admissao,
      observacao: form.observacao || null,
      created_by: u.user?.id ?? null,
      created_by_nome: u.user?.email ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Movimentação registrada");
    setOpen(false);
    setForm({ colaborador_id: "", tipo: "substituicao", substituido_id: "", vaga_id: "", data_admissao: new Date().toISOString().slice(0, 10), observacao: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await supabase.from("admissoes_movimentacao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Movimentações de Admissão</h1>
          <p className="text-sm text-muted-foreground">Quem entrou no lugar de quem — substituição ou aumento de quadro.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova movimentação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar movimentação</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Colaborador que entrou *</Label>
                  <Select value={form.colaborador_id} onValueChange={(v) => setForm((f) => ({ ...f, colaborador_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {colabs.map((c) => (<SelectItem key={c.id} value={c.id}>{c.colaborador} {c.cargo ? `— ${c.cargo}` : ""}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as "substituicao" | "aumento_quadro" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="substituicao">Substituição</SelectItem>
                      <SelectItem value="aumento_quadro">Aumento de quadro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.tipo === "substituicao" && (
                  <div>
                    <Label>No lugar de *</Label>
                    <Select value={form.substituido_id} onValueChange={(v) => setForm((f) => ({ ...f, substituido_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {colabs.filter((c) => c.id !== form.colaborador_id).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.colaborador} {c.cargo ? `— ${c.cargo}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={form.data_admissao} onChange={(e) => setForm((f) => ({ ...f, data_admissao: e.target.value }))} />
                  </div>
                  <div>
                    <Label>ID da vaga</Label>
                    <Input value={form.vaga_id} onChange={(e) => setForm((f) => ({ ...f, vaga_id: e.target.value }))} placeholder="opcional" />
                  </div>
                </div>
                <div>
                  <Label>Observação</Label>
                  <Textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="opcional" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" />Substituições</p>
          <p className="text-2xl font-bold">{stats.sub} <span className="text-sm text-muted-foreground">({stats.pctSub}%)</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Aumento de quadro</p>
          <p className="text-2xl font-bold">{stats.aum} <span className="text-sm text-muted-foreground">({stats.pctAum}%)</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Última admissão</p>
          <p className="text-2xl font-bold">{rows[0] ? new Date(rows[0].data_admissao).toLocaleDateString("pt-BR") : "—"}</p>
        </Card>
      </div>

      <Card className="p-4">
        <Input placeholder="Buscar por nome, cargo ou setor..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-md mb-4" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrou</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>No lugar de</TableHead>
                <TableHead>Cargo / Setor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Vaga</TableHead>
                {canEdit && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              ) : filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.colaborador_nome}</TableCell>
                  <TableCell>
                    {r.tipo === "substituicao" ? (
                      <Badge variant="secondary"><ArrowRightLeft className="h-3 w-3 mr-1" />Substituição</Badge>
                    ) : (
                      <Badge className="bg-emerald-600 hover:bg-emerald-700"><TrendingUp className="h-3 w-3 mr-1" />Aumento</Badge>
                    )}
                  </TableCell>
                  <TableCell>{r.substituido_nome || <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{[r.cargo, r.setor].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell>{new Date(r.data_admissao).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-sm">{r.vaga_id || "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
