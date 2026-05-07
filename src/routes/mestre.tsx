import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, Plus, ExternalLink, Building2 } from "lucide-react";

export const Route = createFileRoute("/mestre")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Stats = { empresa_id: string; colaboradores: number; vagas: number; membros: number };

function Page() {
  const { isAdminMestre, empresas, refresh, setEmpresaId } = useEmpresa();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "", email_admin: "" });
  const [stats, setStats] = useState<Record<string, Stats>>({});

  useEffect(() => {
    if (!empresas.length) return;
    (async () => {
      const ids = empresas.map((e) => e.id);
      const [c, v, m] = await Promise.all([
        supabase.from("colaboradores").select("empresa_id").in("empresa_id", ids),
        supabase.from("admissoes_movimentacao").select("empresa_id").in("empresa_id", ids),
        supabase.from("empresa_membros").select("empresa_id").in("empresa_id", ids),
      ]);
      const acc: Record<string, Stats> = {};
      ids.forEach((id) => (acc[id] = { empresa_id: id, colaboradores: 0, vagas: 0, membros: 0 }));
      (c.data || []).forEach((r) => acc[r.empresa_id!] && (acc[r.empresa_id!].colaboradores++));
      (v.data || []).forEach((r) => acc[r.empresa_id!] && (acc[r.empresa_id!].vagas++));
      (m.data || []).forEach((r) => acc[r.empresa_id] && (acc[r.empresa_id].membros++));
      setStats(acc);
    })();
  }, [empresas]);

  if (!isAdminMestre) {
    return <div className="p-8"><Card className="p-6">Acesso restrito ao Admin Mestre.</Card></div>;
  }

  const handleCreate = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    const slug = form.slug || slugify(form.nome);
    const { error } = await supabase.from("empresas").insert({ nome: form.nome, slug } as never);
    if (error) return toast.error(error.message);
    toast.success("Empresa criada! Link: /e/" + slug);
    setOpen(false);
    setForm({ nome: "", slug: "", email_admin: "" });
    refresh();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> Painel Mestre — SaaS</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as empresas clientes.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova empresa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar empresa cliente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value, slug: f.slug || slugify(e.target.value) }))} /></div>
              <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} placeholder="minha-empresa" />
                <p className="text-xs text-muted-foreground mt-1">Link de acesso: <code>/e/{form.slug || "..."}</code></p>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Empresas</p><p className="text-3xl font-bold">{empresas.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Colaboradores (total)</p><p className="text-3xl font-bold">{Object.values(stats).reduce((a, s) => a + s.colaboradores, 0)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Vagas (total)</p><p className="text-3xl font-bold">{Object.values(stats).reduce((a, s) => a + s.vagas, 0)}</p></Card>
      </div>

      <Card className="p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Colab.</TableHead><TableHead>Vagas</TableHead><TableHead>Membros</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {empresas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{e.nome}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.slug}</TableCell>
                <TableCell>{e.ativo ? <Badge className="bg-emerald-600">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}</TableCell>
                <TableCell>{stats[e.id]?.colaboradores ?? 0}</TableCell>
                <TableCell>{stats[e.id]?.vagas ?? 0}</TableCell>
                <TableCell>{stats[e.id]?.membros ?? 0}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEmpresaId(e.id); toast.success(`Operando como ${e.nome}`); }}>Acessar</Button>
                    <a href={`/e/${e.slug}`} target="_blank" rel="noopener"><Button size="sm" variant="ghost"><ExternalLink className="h-3 w-3" /></Button></a>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">A landing page pública e a página de login por slug fazem parte do BLOCO 5 — em breve.</p>
    </div>
  );
}
