import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Handshake, Plus, Phone, Mail, Building2, CalendarClock, DollarSign, Trash2, Save, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/crm")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

type Lead = {
  id: string;
  empresa_nome: string;
  cnpj: string | null;
  site: string | null;
  segmento: string | null;
  porte: string | null;
  responsavel_nome: string | null;
  responsavel_cargo: string | null;
  telefone: string | null;
  email: string | null;
  origem: string | null;
  status: string;
  proximo_contato: string | null;
  ultimo_contato: string | null;
  valor_estimado: number | null;
  observacoes: string | null;
  owner_nome: string | null;
  created_at: string;
};

type Interacao = {
  id: string;
  lead_id: string;
  data_contato: string;
  canal: string;
  com_quem: string | null;
  resumo: string;
  proximo_passo: string | null;
  user_nome: string | null;
};

const STATUS = [
  { v: "novo", label: "Novo", color: "bg-slate-500" },
  { v: "em_contato", label: "Em contato", color: "bg-blue-500" },
  { v: "qualificado", label: "Qualificado", color: "bg-indigo-500" },
  { v: "proposta", label: "Proposta", color: "bg-amber-500" },
  { v: "ganho", label: "Ganho", color: "bg-emerald-500" },
  { v: "perdido", label: "Perdido", color: "bg-rose-500" },
];

const CANAIS = ["ligacao", "whatsapp", "email", "reuniao", "visita", "outro"];

function statusBadge(s: string) {
  const x = STATUS.find((y) => y.v === s);
  return <Badge className={`${x?.color || "bg-slate-500"} text-white`}>{x?.label || s}</Badge>;
}

function emptyForm() {
  return {
    empresa_nome: "", cnpj: "", site: "", segmento: "", porte: "",
    responsavel_nome: "", responsavel_cargo: "", telefone: "", email: "",
    origem: "", status: "novo", proximo_contato: "", valor_estimado: 0, observacoes: "",
  };
}

function Page() {
  const { isAdminMestre } = useEmpresa();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Lead | null>(null);
  const [interacoes, setInteracoes] = useState<Interacao[]>([]);
  const [novaInter, setNovaInter] = useState({ canal: "ligacao", com_quem: "", resumo: "", proximo_passo: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("crm_leads").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdminMestre) load(); }, [isAdminMestre, load]);

  const loadInter = useCallback(async (leadId: string) => {
    const { data } = await supabase.from("crm_interacoes").select("*").eq("lead_id", leadId).order("data_contato", { ascending: false });
    setInteracoes((data as Interacao[]) || []);
  }, []);

  useEffect(() => { if (selected) loadInter(selected.id); }, [selected, loadInter]);

  if (!isAdminMestre) {
    return <div className="p-6"><Card className="p-6">Acesso restrito ao Admin Mestre.</Card></div>;
  }

  const criar = async () => {
    if (!form.empresa_nome.trim()) return toast.error("Nome da empresa é obrigatório");
    const payload: any = { ...form, valor_estimado: Number(form.valor_estimado) || 0, created_by: user?.id, owner_id: user?.id, owner_nome: user?.user_metadata?.nome || user?.email };
    if (!payload.proximo_contato) delete payload.proximo_contato;
    const { error } = await supabase.from("crm_leads").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Lead criado");
    setOpenNew(false); setForm(emptyForm()); load();
  };

  const atualizar = async (patch: Partial<Lead>) => {
    if (!selected) return;
    const { error } = await supabase.from("crm_leads").update(patch as any).eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setSelected({ ...selected, ...patch } as Lead);
    load();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este lead?")) return;
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    setSelected(null); load();
  };

  const registrarInter = async () => {
    if (!selected || !novaInter.resumo.trim()) return toast.error("Resumo é obrigatório");
    const { error } = await supabase.from("crm_interacoes").insert({
      lead_id: selected.id,
      canal: novaInter.canal,
      com_quem: novaInter.com_quem || null,
      resumo: novaInter.resumo,
      proximo_passo: novaInter.proximo_passo || null,
      user_id: user!.id,
      user_nome: user?.user_metadata?.nome || user?.email,
    } as any);
    if (error) return toast.error(error.message);
    await supabase.from("crm_leads").update({ ultimo_contato: new Date().toISOString().slice(0,10) } as any).eq("id", selected.id);
    setNovaInter({ canal: "ligacao", com_quem: "", resumo: "", proximo_passo: "" });
    loadInter(selected.id); load();
    toast.success("Interação registrada");
  };

  const filtrados = leads.filter((l) => {
    if (filterStatus !== "todos" && l.status !== filterStatus) return false;
    if (search && !`${l.empresa_nome} ${l.responsavel_nome || ""} ${l.cnpj || ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totais = STATUS.map((s) => ({ ...s, count: leads.filter((l) => l.status === s.v).length, valor: leads.filter((l) => l.status === s.v).reduce((a, b) => a + Number(b.valor_estimado || 0), 0) }));
  const pipelineTotal = leads.filter((l) => !["ganho", "perdido"].includes(l.status)).reduce((a, b) => a + Number(b.valor_estimado || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Handshake className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">CRM Vendas</h1>
            <p className="text-sm text-muted-foreground">Empresas prospectadas e pipeline comercial</p>
          </div>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo Lead</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo lead</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Empresa *</Label><Input value={form.empresa_nome} onChange={(e) => setForm({ ...form, empresa_nome: e.target.value })} /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
              <div><Label>Site</Label><Input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} /></div>
              <div><Label>Segmento</Label><Input value={form.segmento} onChange={(e) => setForm({ ...form, segmento: e.target.value })} /></div>
              <div><Label>Porte</Label>
                <Select value={form.porte} onValueChange={(v) => setForm({ ...form, porte: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="pequena">Pequena</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Responsável (contato)</Label><Input value={form.responsavel_nome} onChange={(e) => setForm({ ...form, responsavel_nome: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input value={form.responsavel_cargo} onChange={(e) => setForm({ ...form, responsavel_cargo: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Origem</Label><Input placeholder="Indicação, LinkedIn, evento..." value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Próximo contato</Label><Input type="date" value={form.proximo_contato} onChange={(e) => setForm({ ...form, proximo_contato: e.target.value })} /></div>
              <div><Label>Valor estimado (R$)</Label><Input type="number" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={criar}><Save className="h-4 w-4 mr-2" />Criar lead</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {totais.map((t) => (
          <Card key={t.v} className="p-3 cursor-pointer hover:shadow-md" onClick={() => setFilterStatus(t.v)}>
            <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${t.color}`} /><span className="text-xs font-medium">{t.label}</span></div>
            <div className="text-2xl font-bold mt-1">{t.count}</div>
            <div className="text-xs text-muted-foreground">R$ {t.valor.toLocaleString("pt-BR")}</div>
          </Card>
        ))}
        <Card className="p-3 bg-primary/10">
          <div className="text-xs font-medium text-primary">Pipeline ativo</div>
          <div className="text-2xl font-bold mt-1">R$ {pipelineTotal.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-muted-foreground">Sem ganho/perdido</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Input placeholder="Buscar por empresa, contato, CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              {STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>Atualizar</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Próximo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Carregando...</TableCell></TableRow>
            ) : filtrados.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Nenhum lead</TableCell></TableRow>
            ) : filtrados.map((l) => (
              <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                <TableCell className="font-medium"><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{l.empresa_nome}</div><div className="text-xs text-muted-foreground">{l.segmento}</div></TableCell>
                <TableCell>{l.responsavel_nome}<div className="text-xs text-muted-foreground">{l.responsavel_cargo}</div></TableCell>
                <TableCell>{l.telefone}</TableCell>
                <TableCell>{statusBadge(l.status)}</TableCell>
                <TableCell>{l.proximo_contato ? new Date(l.proximo_contato).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell className="text-right">R$ {Number(l.valor_estimado || 0).toLocaleString("pt-BR")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{selected.empresa_nome}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="dados">
                <TabsList>
                  <TabsTrigger value="dados">Dados</TabsTrigger>
                  <TabsTrigger value="historico">Histórico ({interacoes.length})</TabsTrigger>
                  <TabsTrigger value="nova">Registrar contato</TabsTrigger>
                </TabsList>
                <TabsContent value="dados" className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Empresa</Label><Input value={selected.empresa_nome} onChange={(e) => setSelected({ ...selected, empresa_nome: e.target.value })} /></div>
                    <div><Label>CNPJ</Label><Input value={selected.cnpj || ""} onChange={(e) => setSelected({ ...selected, cnpj: e.target.value })} /></div>
                    <div><Label>Site</Label><Input value={selected.site || ""} onChange={(e) => setSelected({ ...selected, site: e.target.value })} /></div>
                    <div><Label>Segmento</Label><Input value={selected.segmento || ""} onChange={(e) => setSelected({ ...selected, segmento: e.target.value })} /></div>
                    <div><Label>Responsável</Label><Input value={selected.responsavel_nome || ""} onChange={(e) => setSelected({ ...selected, responsavel_nome: e.target.value })} /></div>
                    <div><Label>Cargo</Label><Input value={selected.responsavel_cargo || ""} onChange={(e) => setSelected({ ...selected, responsavel_cargo: e.target.value })} /></div>
                    <div><Label>Telefone</Label><Input value={selected.telefone || ""} onChange={(e) => setSelected({ ...selected, telefone: e.target.value })} /></div>
                    <div><Label>E-mail</Label><Input value={selected.email || ""} onChange={(e) => setSelected({ ...selected, email: e.target.value })} /></div>
                    <div><Label>Origem</Label><Input value={selected.origem || ""} onChange={(e) => setSelected({ ...selected, origem: e.target.value })} /></div>
                    <div><Label>Status</Label>
                      <Select value={selected.status} onValueChange={(v) => setSelected({ ...selected, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Próximo contato</Label><Input type="date" value={selected.proximo_contato || ""} onChange={(e) => setSelected({ ...selected, proximo_contato: e.target.value })} /></div>
                    <div><Label>Valor estimado (R$)</Label><Input type="number" value={selected.valor_estimado || 0} onChange={(e) => setSelected({ ...selected, valor_estimado: Number(e.target.value) })} /></div>
                    <div className="md:col-span-2"><Label>Observações</Label><Textarea value={selected.observacoes || ""} onChange={(e) => setSelected({ ...selected, observacoes: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <Button variant="destructive" size="sm" onClick={() => remover(selected.id)}><Trash2 className="h-4 w-4 mr-2" />Remover</Button>
                    <Button onClick={() => atualizar({
                      empresa_nome: selected.empresa_nome, cnpj: selected.cnpj, site: selected.site,
                      segmento: selected.segmento, responsavel_nome: selected.responsavel_nome,
                      responsavel_cargo: selected.responsavel_cargo, telefone: selected.telefone,
                      email: selected.email, origem: selected.origem, status: selected.status,
                      proximo_contato: selected.proximo_contato || null, valor_estimado: selected.valor_estimado,
                      observacoes: selected.observacoes,
                    })}><Save className="h-4 w-4 mr-2" />Salvar</Button>
                  </div>
                </TabsContent>
                <TabsContent value="historico" className="space-y-2 mt-4">
                  {interacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma interação registrada.</p> : interacoes.map((i) => (
                    <Card key={i.id} className="p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><MessageCircle className="h-3 w-3" /><Badge variant="outline">{i.canal}</Badge>{i.com_quem && <span>com {i.com_quem}</span>}</div>
                        <span>{new Date(i.data_contato).toLocaleString("pt-BR")} • {i.user_nome}</span>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{i.resumo}</p>
                      {i.proximo_passo && <p className="mt-1 text-xs"><strong>Próximo passo:</strong> {i.proximo_passo}</p>}
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="nova" className="space-y-3 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label>Canal</Label>
                      <Select value={novaInter.canal} onValueChange={(v) => setNovaInter({ ...novaInter, canal: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CANAIS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Com quem</Label><Input value={novaInter.com_quem} onChange={(e) => setNovaInter({ ...novaInter, com_quem: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Resumo *</Label><Textarea value={novaInter.resumo} onChange={(e) => setNovaInter({ ...novaInter, resumo: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Próximo passo</Label><Input value={novaInter.proximo_passo} onChange={(e) => setNovaInter({ ...novaInter, proximo_passo: e.target.value })} /></div>
                  </div>
                  <Button onClick={registrarInter}><Save className="h-4 w-4 mr-2" />Registrar</Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
