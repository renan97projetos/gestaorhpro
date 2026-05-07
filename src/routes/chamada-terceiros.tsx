import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Download, Users, DollarSign, Search } from "lucide-react";
import * as XLSX from "xlsx";

export const Route = createFileRoute("/chamada-terceiros")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Terceiro = {
  id: string;
  empresa_id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  email: string | null;
  funcao: string | null;
  chave_pix: string | null;
  tipo_pix: string | null;
  banco: string | null;
  observacoes: string | null;
  ativo: boolean;
};

type Chamada = {
  id: string;
  empresa_id: string;
  terceiro_id: string;
  data: string;
  descricao: string | null;
  valor: number | null;
  chave_pix: string | null;
  tipo_pix: string | null;
  banco_destino: string | null;
  titular_destino: string | null;
  data_deposito: string | null;
  status: string;
  observacao: string | null;
};

const TIPOS_PIX = ["CPF", "CNPJ", "E-mail", "Telefone", "Aleatória"];
const STATUS = ["pendente", "pago", "cancelado"];

function Page() {
  const { empresaAtual, empresas, canEdit, canManage, isAdminMestre } = useEmpresa();
  const [terceiros, setTerceiros] = useState<Terceiro[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState("");
  const [editTerc, setEditTerc] = useState<Partial<Terceiro> | null>(null);
  const [editCham, setEditCham] = useState<Partial<Chamada> | null>(null);

  const empresaMap = useMemo(() => Object.fromEntries(empresas.map((e) => [e.id, e.nome])), [empresas]);

  const load = async () => {
    if (!empresaAtual) { setTerceiros([]); setChamadas([]); return; }
    setLoading(true);
    const [{ data: t }, { data: c }] = await Promise.all([
      supabase.from("terceiros").select("*").eq("empresa_id", empresaAtual.id).order("nome"),
      supabase.from("terceiros_chamadas").select("*").eq("empresa_id", empresaAtual.id).order("data", { ascending: false }),
    ]);
    setTerceiros((t as Terceiro[]) || []);
    setChamadas((c as Chamada[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaAtual?.id]);

  const tercFiltrados = terceiros.filter((t) =>
    !busca || `${t.nome} ${t.documento ?? ""} ${t.funcao ?? ""}`.toLowerCase().includes(busca.toLowerCase())
  );

  const tercById = (id: string) => terceiros.find((t) => t.id === id);

  const salvarTerceiro = async () => {
    if (!editTerc || !empresaAtual) return;
    if (!editTerc.nome?.trim()) { toast.error("Nome obrigatório"); return; }
    const payload = {
      empresa_id: empresaAtual.id,
      nome: editTerc.nome.trim(),
      documento: editTerc.documento || null,
      telefone: editTerc.telefone || null,
      email: editTerc.email || null,
      funcao: editTerc.funcao || null,
      chave_pix: editTerc.chave_pix || null,
      tipo_pix: editTerc.tipo_pix || null,
      banco: editTerc.banco || null,
      observacoes: editTerc.observacoes || null,
      ativo: editTerc.ativo ?? true,
    };
    const { error } = editTerc.id
      ? await supabase.from("terceiros").update(payload).eq("id", editTerc.id)
      : await supabase.from("terceiros").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditTerc(null);
    load();
  };

  const excluirTerceiro = async (id: string) => {
    if (!confirm("Excluir terceiro e todas as chamadas?")) return;
    const { error } = await supabase.from("terceiros").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const novaChamada = (terceiroId?: string) => {
    const t = terceiroId ? tercById(terceiroId) : null;
    setEditCham({
      terceiro_id: terceiroId || "",
      data: new Date().toISOString().slice(0, 10),
      status: "pendente",
      chave_pix: t?.chave_pix || "",
      tipo_pix: t?.tipo_pix || "",
      banco_destino: t?.banco || "",
      titular_destino: t?.nome || "",
    });
  };

  const salvarChamada = async () => {
    if (!editCham || !empresaAtual) return;
    if (!editCham.terceiro_id) { toast.error("Selecione o terceiro"); return; }
    const payload = {
      empresa_id: empresaAtual.id,
      terceiro_id: editCham.terceiro_id,
      data: editCham.data || new Date().toISOString().slice(0, 10),
      descricao: editCham.descricao || null,
      valor: editCham.valor ?? null,
      chave_pix: editCham.chave_pix || null,
      tipo_pix: editCham.tipo_pix || null,
      banco_destino: editCham.banco_destino || null,
      titular_destino: editCham.titular_destino || null,
      data_deposito: editCham.data_deposito || null,
      status: editCham.status || "pendente",
      observacao: editCham.observacao || null,
    };
    const { error } = editCham.id
      ? await supabase.from("terceiros_chamadas").update(payload).eq("id", editCham.id)
      : await supabase.from("terceiros_chamadas").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo"); setEditCham(null); load();
  };

  const excluirChamada = async (id: string) => {
    if (!confirm("Excluir registro?")) return;
    const { error } = await supabase.from("terceiros_chamadas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const exportarExcel = async () => {
    // Se Mestre, baixa de todas as empresas; senão, da atual
    let rows: Chamada[] = [];
    let tercAll: Terceiro[] = [];
    if (isAdminMestre) {
      const [{ data: c }, { data: t }] = await Promise.all([
        supabase.from("terceiros_chamadas").select("*").order("data", { ascending: false }),
        supabase.from("terceiros").select("*"),
      ]);
      rows = (c as Chamada[]) || [];
      tercAll = (t as Terceiro[]) || [];
    } else {
      rows = chamadas; tercAll = terceiros;
    }
    const tMap = Object.fromEntries(tercAll.map((t) => [t.id, t]));
    const data = rows.map((c) => {
      const t = tMap[c.terceiro_id];
      return {
        Empresa: empresaMap[c.empresa_id] || c.empresa_id,
        Data: c.data,
        Terceiro: t?.nome || "",
        Documento: t?.documento || "",
        Função: t?.funcao || "",
        Descrição: c.descricao || "",
        Valor: c.valor ?? "",
        "Tipo PIX": c.tipo_pix || "",
        "Chave PIX": c.chave_pix || "",
        "Banco destino": c.banco_destino || "",
        "Titular destino": c.titular_destino || "",
        "Data depósito": c.data_deposito || "",
        Status: c.status,
        Observação: c.observacao || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chamadas Terceiros");
    XLSX.writeFile(wb, `chamada-terceiros-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totalValor = chamadas.reduce((a, c) => a + (Number(c.valor) || 0), 0);
  const totalPago = chamadas.filter((c) => c.status === "pago").reduce((a, c) => a + (Number(c.valor) || 0), 0);

  return (
    <main className="min-h-full bg-[image:var(--gradient-soft)] px-4 md:px-6 py-6 md:py-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Chamada para Terceiros</h1>
            <p className="text-sm text-muted-foreground">Cadastro de prestadores externos e registro de pagamentos via PIX</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportarExcel}><Download className="h-4 w-4 mr-2" />Baixar planilha</Button>
            {canEdit && <Button onClick={() => setEditTerc({ ativo: true })}><Plus className="h-4 w-4 mr-2" />Novo terceiro</Button>}
            {canEdit && <Button variant="secondary" onClick={() => novaChamada()}><Plus className="h-4 w-4 mr-2" />Nova chamada</Button>}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Terceiros</div><div className="text-2xl font-bold">{terceiros.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Registros</div><div className="text-2xl font-bold">{chamadas.length}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total geral</div><div className="text-2xl font-bold">R$ {totalValor.toFixed(2)}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total pago</div><div className="text-2xl font-bold text-emerald-600">R$ {totalPago.toFixed(2)}</div></Card>
        </div>

        <Tabs defaultValue="chamadas">
          <TabsList>
            <TabsTrigger value="chamadas"><DollarSign className="h-4 w-4 mr-1" />Chamadas / Pagamentos</TabsTrigger>
            <TabsTrigger value="cadastro"><Users className="h-4 w-4 mr-1" />Cadastro de Terceiros</TabsTrigger>
          </TabsList>

          <TabsContent value="chamadas">
            <Card className="p-4 overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Terceiro</th>
                    <th className="py-2 px-2">Descrição</th>
                    <th className="py-2 px-2">Valor</th>
                    <th className="py-2 px-2">PIX</th>
                    <th className="py-2 px-2">Banco</th>
                    <th className="py-2 px-2">Depósito</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {chamadas.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">{loading ? "Carregando..." : "Nenhum registro"}</td></tr>}
                  {chamadas.map((c) => {
                    const t = tercById(c.terceiro_id);
                    return (
                      <tr key={c.id} className="border-b hover:bg-muted/40">
                        <td className="py-2 px-2 whitespace-nowrap">{c.data}</td>
                        <td className="py-2 px-2">{t?.nome || "—"}</td>
                        <td className="py-2 px-2">{c.descricao}</td>
                        <td className="py-2 px-2">R$ {Number(c.valor || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-xs"><div>{c.tipo_pix}</div><div className="text-muted-foreground">{c.chave_pix}</div></td>
                        <td className="py-2 px-2 text-xs">{c.banco_destino}</td>
                        <td className="py-2 px-2 whitespace-nowrap">{c.data_deposito || "—"}</td>
                        <td className="py-2 px-2"><Badge variant={c.status === "pago" ? "default" : c.status === "cancelado" ? "destructive" : "secondary"}>{c.status}</Badge></td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {canEdit && <Button size="icon" variant="ghost" onClick={() => setEditCham(c)}><Pencil className="h-4 w-4" /></Button>}
                          {canManage && <Button size="icon" variant="ghost" onClick={() => excluirChamada(c.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="cadastro">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, documento ou função..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-md" />
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left border-b">
                    <tr>
                      <th className="py-2 px-2">Nome</th>
                      <th className="py-2 px-2">Documento</th>
                      <th className="py-2 px-2">Função</th>
                      <th className="py-2 px-2">Telefone</th>
                      <th className="py-2 px-2">PIX</th>
                      <th className="py-2 px-2">Banco</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tercFiltrados.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum terceiro</td></tr>}
                    {tercFiltrados.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/40">
                        <td className="py-2 px-2 font-medium">{t.nome}</td>
                        <td className="py-2 px-2">{t.documento}</td>
                        <td className="py-2 px-2">{t.funcao}</td>
                        <td className="py-2 px-2">{t.telefone}</td>
                        <td className="py-2 px-2 text-xs"><div>{t.tipo_pix}</div><div className="text-muted-foreground">{t.chave_pix}</div></td>
                        <td className="py-2 px-2 text-xs">{t.banco}</td>
                        <td className="py-2 px-2 text-right whitespace-nowrap">
                          {canEdit && <Button size="sm" variant="outline" onClick={() => novaChamada(t.id)}><Plus className="h-3 w-3 mr-1" />Chamada</Button>}
                          {canEdit && <Button size="icon" variant="ghost" onClick={() => setEditTerc(t)}><Pencil className="h-4 w-4" /></Button>}
                          {canManage && <Button size="icon" variant="ghost" onClick={() => excluirTerceiro(t.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog terceiro */}
      <Dialog open={!!editTerc} onOpenChange={(o) => !o && setEditTerc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editTerc?.id ? "Editar terceiro" : "Novo terceiro"}</DialogTitle></DialogHeader>
          {editTerc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Nome *</Label><Input value={editTerc.nome || ""} onChange={(e) => setEditTerc({ ...editTerc, nome: e.target.value })} /></div>
              <div><Label>CPF/CNPJ</Label><Input value={editTerc.documento || ""} onChange={(e) => setEditTerc({ ...editTerc, documento: e.target.value })} /></div>
              <div><Label>Função / serviço</Label><Input value={editTerc.funcao || ""} onChange={(e) => setEditTerc({ ...editTerc, funcao: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={editTerc.telefone || ""} onChange={(e) => setEditTerc({ ...editTerc, telefone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input value={editTerc.email || ""} onChange={(e) => setEditTerc({ ...editTerc, email: e.target.value })} /></div>
              <div>
                <Label>Tipo PIX</Label>
                <Select value={editTerc.tipo_pix || ""} onValueChange={(v) => setEditTerc({ ...editTerc, tipo_pix: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_PIX.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Chave PIX</Label><Input value={editTerc.chave_pix || ""} onChange={(e) => setEditTerc({ ...editTerc, chave_pix: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Banco</Label><Input value={editTerc.banco || ""} onChange={(e) => setEditTerc({ ...editTerc, banco: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Textarea value={editTerc.observacoes || ""} onChange={(e) => setEditTerc({ ...editTerc, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTerc(null)}>Cancelar</Button>
            <Button onClick={salvarTerceiro}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog chamada */}
      <Dialog open={!!editCham} onOpenChange={(o) => !o && setEditCham(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editCham?.id ? "Editar chamada" : "Nova chamada / pagamento"}</DialogTitle></DialogHeader>
          {editCham && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <Label>Terceiro *</Label>
                <Select value={editCham.terceiro_id || ""} onValueChange={(v) => {
                  const t = tercById(v);
                  setEditCham({ ...editCham, terceiro_id: v, chave_pix: editCham.chave_pix || t?.chave_pix || "", tipo_pix: editCham.tipo_pix || t?.tipo_pix || "", banco_destino: editCham.banco_destino || t?.banco || "", titular_destino: editCham.titular_destino || t?.nome || "" });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{terceiros.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data</Label><Input type="date" value={editCham.data || ""} onChange={(e) => setEditCham({ ...editCham, data: e.target.value })} /></div>
              <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editCham.valor ?? ""} onChange={(e) => setEditCham({ ...editCham, valor: e.target.value === "" ? null : Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Descrição do serviço</Label><Input value={editCham.descricao || ""} onChange={(e) => setEditCham({ ...editCham, descricao: e.target.value })} /></div>
              <div>
                <Label>Tipo PIX</Label>
                <Select value={editCham.tipo_pix || ""} onValueChange={(v) => setEditCham({ ...editCham, tipo_pix: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS_PIX.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Chave PIX usada</Label><Input value={editCham.chave_pix || ""} onChange={(e) => setEditCham({ ...editCham, chave_pix: e.target.value })} /></div>
              <div><Label>Banco destino</Label><Input value={editCham.banco_destino || ""} onChange={(e) => setEditCham({ ...editCham, banco_destino: e.target.value })} /></div>
              <div><Label>Titular destino</Label><Input value={editCham.titular_destino || ""} onChange={(e) => setEditCham({ ...editCham, titular_destino: e.target.value })} /></div>
              <div><Label>Data do depósito</Label><Input type="date" value={editCham.data_deposito || ""} onChange={(e) => setEditCham({ ...editCham, data_deposito: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editCham.status || "pendente"} onValueChange={(v) => setEditCham({ ...editCham, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2"><Label>Observação</Label><Textarea value={editCham.observacao || ""} onChange={(e) => setEditCham({ ...editCham, observacao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditCham(null)}>Cancelar</Button>
            <Button onClick={salvarChamada}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
