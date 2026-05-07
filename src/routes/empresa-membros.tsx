import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa, EmpresaRole } from "@/lib/empresa-context";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, UserCog } from "lucide-react";

export const Route = createFileRoute("/empresa-membros")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

type Membro = { id: string; user_id: string; role: EmpresaRole; profiles?: { nome: string | null; email: string | null } | null };

function Page() {
  const { empresaAtual, isAdminEmpresa } = useEmpresa();
  const [rows, setRows] = useState<Membro[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "visualizador" as EmpresaRole });

  const load = useCallback(async () => {
    if (!empresaAtual) return;
    const { data, error } = await supabase
      .from("empresa_membros")
      .select("id,user_id,role")
      .eq("empresa_id", empresaAtual.id);
    if (error) return toast.error(error.message);
    const userIds = (data || []).map((m) => m.user_id);
    const profs = userIds.length
      ? (await supabase.from("profiles").select("id,nome,email").in("id", userIds)).data || []
      : [];
    setRows((data || []).map((m) => ({
      ...m,
      role: m.role as EmpresaRole,
      profiles: profs.find((p) => p.id === m.user_id) || null,
    })));
  }, [empresaAtual]);

  useEffect(() => { load(); }, [load]);

  if (!empresaAtual) return <div className="p-8"><Card className="p-6">Selecione uma empresa.</Card></div>;
  if (!isAdminEmpresa) return <div className="p-8"><Card className="p-6">Apenas administradores podem gerenciar usuários.</Card></div>;

  const add = async () => {
    if (!form.email) return toast.error("Informe o e-mail");
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", form.email).maybeSingle();
    if (!prof) return toast.error("Usuário não encontrado. Ele precisa se cadastrar primeiro em /");
    const { error } = await supabase.from("empresa_membros").insert({ empresa_id: empresaAtual.id, user_id: prof.id, role: form.role } as never);
    if (error) return toast.error(error.message);
    toast.success("Usuário adicionado");
    setOpen(false);
    setForm({ email: "", role: "visualizador" });
    load();
  };

  const updateRole = async (id: string, role: EmpresaRole) => {
    const { error } = await supabase.from("empresa_membros").update({ role } as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Papel atualizado");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este usuário da empresa?")) return;
    await supabase.from("empresa_membros").delete().eq("id", id);
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><UserCog className="h-6 w-6" /> Usuários — {empresaAtual.nome}</h1>
          <p className="text-sm text-muted-foreground">Gerencie quem acessa esta empresa e com qual papel.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>E-mail (já cadastrado)</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Papel</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as EmpresaRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={add}>Adicionar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum membro</TableCell></TableRow>
              : rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.profiles?.nome || "—"}</TableCell>
                  <TableCell>{m.profiles?.email || "—"}</TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v) => updateRole(m.id, v as EmpresaRole)}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin"><Badge>Admin</Badge></SelectItem>
                        <SelectItem value="gestor"><Badge variant="secondary">Gestor</Badge></SelectItem>
                        <SelectItem value="visualizador"><Badge variant="outline">Visualizador</Badge></SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
