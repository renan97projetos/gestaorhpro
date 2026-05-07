import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa, Empresa, EmpresaRole } from "@/lib/empresa-context";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  mestreCriarUsuario,
  mestreResetSenha,
  mestreToggleBloqueio,
  mestreAtualizarEmpresa,
} from "@/server/mestre.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Crown, Plus, ExternalLink, Building2, Users as UsersIcon, Briefcase,
  UserPlus2, Lock, Unlock, KeyRound, DollarSign, HardDrive, Sparkles, MessageCircle, Save, RefreshCw, Copy, LayoutGrid,
} from "lucide-react";

const MODULOS_DISPONIVEIS: { to: string; label: string }[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/cadastro", label: "Colaboradores" },
  { to: "/chamada", label: "Chamada" },
  { to: "/analise-faltas", label: "Análise de Faltas" },
  { to: "/experiencia", label: "Experiência (90 dias)" },
  { to: "/solicitacao-movimentacao", label: "Movimentações" },
  { to: "/movimentacoes-admissoes", label: "Gestão de Vagas" },
  { to: "/historico-admissoes", label: "Histórico Admissões" },
  { to: "/mapa-alocacao", label: "Mapa de Alocação" },
  { to: "/feedbacks", label: "Feedbacks" },
  { to: "/notas", label: "Bloco de Notas" },
  { to: "/pesquisas", label: "Pesquisas" },
  { to: "/ideias", label: "Ideias" },
  { to: "/geracoes", label: "Gerações" },
  { to: "/aniversariantes", label: "Aniversariantes" },
];

function gerarSenha(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const Route = createFileRoute("/mestre")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Stats = { colaboradores: number; vagas: number; candidatos: number; membros: number };

function Page() {
  const { isAdminMestre, empresas, refresh } = useEmpresa();
  const [openNew, setOpenNew] = useState(false);
  const [form, setForm] = useState({ nome: "", slug: "" });
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [selecionada, setSelecionada] = useState<Empresa | null>(null);

  const loadStats = useCallback(async () => {
    if (!empresas.length) return;
    const ids = empresas.map((e) => e.id);
    const [c, v, cand, m] = await Promise.all([
      supabase.from("colaboradores").select("empresa_id").in("empresa_id", ids),
      supabase.from("admissoes_movimentacao").select("empresa_id,status").in("empresa_id", ids),
      supabase.from("vaga_candidatos").select("empresa_id").in("empresa_id", ids),
      supabase.from("empresa_membros").select("empresa_id").in("empresa_id", ids),
    ]);
    const acc: Record<string, Stats> = {};
    ids.forEach((id) => (acc[id] = { colaboradores: 0, vagas: 0, candidatos: 0, membros: 0 }));
    (c.data || []).forEach((r) => acc[r.empresa_id!] && acc[r.empresa_id!].colaboradores++);
    (v.data || []).forEach((r) => {
      if (acc[r.empresa_id!] && r.status === "aberta") acc[r.empresa_id!].vagas++;
    });
    (cand.data || []).forEach((r) => r.empresa_id && acc[r.empresa_id] && acc[r.empresa_id].candidatos++);
    (m.data || []).forEach((r) => acc[r.empresa_id] && acc[r.empresa_id].membros++);
    setStats(acc);
  }, [empresas]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (!isAdminMestre) {
    return <div className="p-8"><Card className="p-6">Acesso restrito ao Admin Mestre.</Card></div>;
  }

  const handleCreate = async () => {
    if (!form.nome) return toast.error("Nome obrigatório");
    const slug = form.slug || slugify(form.nome);
    const { error } = await supabase.from("empresas").insert({ nome: form.nome, slug } as never);
    if (error) return toast.error(error.message);
    toast.success("Empresa criada! Link: /e/" + slug);
    setOpenNew(false);
    setForm({ nome: "", slug: "" });
    refresh();
  };

  // KPIs globais
  const totalColab = Object.values(stats).reduce((a, s) => a + s.colaboradores, 0);
  const totalVagas = Object.values(stats).reduce((a, s) => a + s.vagas, 0);
  const totalCand = Object.values(stats).reduce((a, s) => a + s.candidatos, 0);
  const totalUsuarios = Object.values(stats).reduce((a, s) => a + s.membros, 0);
  const ativas = empresas.filter((e) => e.ativo && !e.bloqueada).length;
  const bloqueadas = empresas.filter((e) => e.bloqueada).length;
  const mrr = empresas.reduce((a, e) => a + Number(e.mrr || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Central Master — SaaS
          </h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as empresas, planos e usuários.</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova empresa</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar empresa cliente</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value, slug: f.slug || slugify(e.target.value) }))} />
              </div>
              <div><Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))} placeholder="minha-empresa" />
                <p className="text-xs text-muted-foreground mt-1">Página pública: <code>/e/{form.slug || "..."}</code></p>
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Criar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi icon={Building2} title="Empresas ativas" value={ativas} />
        <Kpi icon={Lock} title="Empresas bloqueadas" value={bloqueadas} tone="text-rose-600" />
        <Kpi icon={UsersIcon} title="Usuários totais" value={totalUsuarios} />
        <Kpi icon={Briefcase} title="Vagas ativas" value={totalVagas} />
        <Kpi icon={UserPlus2} title="Candidatos totais" value={totalCand} />
        <Kpi icon={Sparkles} title="Consumo IA" value="—" hint="em breve" />
        <Kpi icon={MessageCircle} title="Disparos WhatsApp" value="—" hint="em breve" />
        <Kpi icon={HardDrive} title="Storage utilizado" value="—" hint="em breve" />
        <Kpi icon={DollarSign} title="MRR" value={`R$ ${mrr.toFixed(2)}`} />
        <Kpi icon={UsersIcon} title="Colaboradores (total)" value={totalColab} />
      </div>

      {/* Lista de empresas com aba detalhe */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Empresas cadastradas</h2>
          <p className="text-xs text-muted-foreground">Clique em uma para abrir detalhes, plano, usuários e cadastrar acessos.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead><TableHead>Slug</TableHead><TableHead>Plano</TableHead>
              <TableHead>Status</TableHead><TableHead>Colab.</TableHead><TableHead>Vagas</TableHead>
              <TableHead>Usuários</TableHead><TableHead>Último acesso</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium flex items-center gap-2">
                  {e.logo_url ? <img src={e.logo_url} className="h-7 w-7 rounded object-cover" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                  {e.nome}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.slug}</TableCell>
                <TableCell><Badge variant="outline">{e.plano || "free"}</Badge></TableCell>
                <TableCell>
                  {e.bloqueada ? <Badge variant="destructive">Bloqueada</Badge> : e.ativo ? <Badge className="bg-emerald-600">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                </TableCell>
                <TableCell>{stats[e.id]?.colaboradores ?? 0}</TableCell>
                <TableCell>{stats[e.id]?.vagas ?? 0}</TableCell>
                <TableCell>{stats[e.id]?.membros ?? 0}</TableCell>
                <TableCell className="text-xs">{e.ultimo_acesso ? new Date(e.ultimo_acesso).toLocaleDateString("pt-BR") : "—"}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => setSelecionada(e)}>Abrir</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {selecionada && (
        <EmpresaDetalheDialog
          empresa={selecionada}
          onClose={() => setSelecionada(null)}
          onChanged={() => { refresh(); loadStats(); }}
        />
      )}
    </div>
  );
}

function Kpi({ icon: Icon, title, value, tone, hint }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string | number; tone?: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" /> {title}</div>
      <p className={`text-2xl font-bold mt-1 ${tone || ""}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

type Membro = { id: string; user_id: string; role: EmpresaRole; profiles?: { nome: string | null; email: string | null } | null };

function EmpresaDetalheDialog({ empresa, onClose, onChanged }: { empresa: Empresa; onClose: () => void; onChanged: () => void }) {
  const [info, setInfo] = useState({
    plano: empresa.plano || "free",
    responsavel: empresa.responsavel || "",
    mrr: empresa.mrr || 0,
    limite_usuarios: empresa.limite_usuarios || 5,
    limite_vagas: empresa.limite_vagas || 10,
    ativo: empresa.ativo,
  });
  const [modulos, setModulos] = useState<string[]>(empresa.modulos_desabilitados || []);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [novo, setNovo] = useState({ nome: "", email: "", password: "", role: "visualizador" as EmpresaRole });
  const [busy, setBusy] = useState(false);

  const criarFn = useServerFn(mestreCriarUsuario);
  const resetFn = useServerFn(mestreResetSenha);
  const toggleFn = useServerFn(mestreToggleBloqueio);
  const updFn = useServerFn(mestreAtualizarEmpresa);

  const loadMembros = useCallback(async () => {
    const { data } = await supabase
      .from("empresa_membros")
      .select("id,user_id,role")
      .eq("empresa_id", empresa.id);
    const ids = (data || []).map((m) => m.user_id);
    const profs = ids.length
      ? (await supabase.from("profiles").select("id,nome,email").in("id", ids)).data || []
      : [];
    setMembros((data || []).map((m) => ({
      ...m, role: m.role as EmpresaRole,
      profiles: profs.find((p) => p.id === m.user_id) || null,
    })));
  }, [empresa.id]);

  useEffect(() => { loadMembros(); }, [loadMembros]);

  const salvarInfo = async () => {
    setBusy(true);
    try {
      await updFn({ data: { empresa_id: empresa.id, ...info, modulos_desabilitados: modulos } });
      toast.success("Informações salvas");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const toggleModulo = (to: string, enabled: boolean) => {
    setModulos((prev) => enabled ? prev.filter((p) => p !== to) : Array.from(new Set([...prev, to])));
  };

  const toggleBloqueio = async () => {
    setBusy(true);
    try {
      await toggleFn({ data: { empresa_id: empresa.id, bloqueada: !empresa.bloqueada } });
      toast.success(empresa.bloqueada ? "Empresa desbloqueada" : "Empresa bloqueada");
      onChanged();
      onClose();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const cadastrar = async () => {
    if (!novo.email || !novo.password || !novo.nome) return toast.error("Preencha todos os campos");
    setBusy(true);
    try {
      await criarFn({ data: { empresa_id: empresa.id, ...novo } });
      toast.success("Usuário cadastrado e vinculado à empresa");
      setNovo({ nome: "", email: "", password: "", role: "visualizador" });
      loadMembros();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const resetar = async (m: Membro) => {
    const pwd = prompt(`Nova senha para ${m.profiles?.email || m.user_id}:`);
    if (!pwd || pwd.length < 6) return;
    try {
      await resetFn({ data: { user_id: m.user_id, password: pwd } });
      toast.success("Senha redefinida");
    } catch (e) { toast.error((e as Error).message); }
  };

  const removerMembro = async (m: Membro) => {
    if (!confirm("Remover este usuário da empresa?")) return;
    await supabase.from("empresa_membros").delete().eq("id", m.id);
    loadMembros();
  };

  const updateRole = async (m: Membro, role: EmpresaRole) => {
    await supabase.from("empresa_membros").update({ role } as never).eq("id", m.id);
    loadMembros();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> {empresa.nome}
            {empresa.bloqueada && <Badge variant="destructive">Bloqueada</Badge>}
            <a href={`/e/${empresa.slug}`} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> /e/{empresa.slug}
            </a>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="modulos">Módulos</TabsTrigger>
            <TabsTrigger value="usuarios">Usuários ({membros.length})</TabsTrigger>
            <TabsTrigger value="cadastrar">Cadastrar usuário</TabsTrigger>
          </TabsList>

          <TabsContent value="modulos" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Habilite ou desabilite as abas que aparecem no menu desta empresa. O Admin Mestre sempre vê tudo.</p>
            <div className="grid md:grid-cols-2 gap-2">
              {MODULOS_DISPONIVEIS.map((m) => {
                const enabled = !modulos.includes(m.to);
                return (
                  <div key={m.to} className="flex items-center justify-between border rounded-md px-3 py-2">
                    <div className="text-sm">{m.label} <span className="text-xs text-muted-foreground">({m.to})</span></div>
                    <Switch checked={enabled} onCheckedChange={(v) => toggleModulo(m.to, v)} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={salvarInfo} disabled={busy}><Save className="h-4 w-4 mr-2" />Salvar módulos</Button>
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Nome" value={empresa.nome} />
              <Field label="Slug" value={empresa.slug} />
              <Field label="Data de criação" value={new Date((empresa as unknown as { created_at?: string }).created_at || "").toLocaleDateString("pt-BR")} />
              <Field label="Último acesso" value={empresa.ultimo_acesso ? new Date(empresa.ultimo_acesso).toLocaleString("pt-BR") : "—"} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Plano</Label>
                <Select value={info.plano} onValueChange={(v) => setInfo({ ...info, plano: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Responsável</Label><Input value={info.responsavel} onChange={(e) => setInfo({ ...info, responsavel: e.target.value })} /></div>
              <div><Label>MRR (R$)</Label><Input type="number" step="0.01" value={info.mrr} onChange={(e) => setInfo({ ...info, mrr: Number(e.target.value) })} /></div>
              <div><Label>Limite de usuários</Label><Input type="number" value={info.limite_usuarios} onChange={(e) => setInfo({ ...info, limite_usuarios: Number(e.target.value) })} /></div>
              <div><Label>Limite de vagas</Label><Input type="number" value={info.limite_vagas} onChange={(e) => setInfo({ ...info, limite_vagas: Number(e.target.value) })} /></div>
              <div><Label>Status</Label>
                <Select value={info.ativo ? "1" : "0"} onValueChange={(v) => setInfo({ ...info, ativo: v === "1" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Ativa</SelectItem>
                    <SelectItem value="0">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant={empresa.bloqueada ? "outline" : "destructive"} onClick={toggleBloqueio} disabled={busy}>
                {empresa.bloqueada ? <><Unlock className="h-4 w-4 mr-2" />Desbloquear</> : <><Lock className="h-4 w-4 mr-2" />Bloquear empresa</>}
              </Button>
              <Button onClick={salvarInfo} disabled={busy}><Save className="h-4 w-4 mr-2" />Salvar</Button>
            </div>
          </TabsContent>

          <TabsContent value="usuarios" className="mt-4">
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>E-mail</TableHead><TableHead>Papel</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {membros.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhum usuário</TableCell></TableRow>
                ) : membros.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.profiles?.nome || "—"}</TableCell>
                    <TableCell className="text-xs">{m.profiles?.email}</TableCell>
                    <TableCell>
                      <Select value={m.role} onValueChange={(v) => updateRole(m, v as EmpresaRole)}>
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="visualizador">Visualizador</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => resetar(m)} title="Redefinir senha"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => removerMembro(m)} title="Remover">×</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="cadastrar" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">Crie um acesso para a empresa <strong>{empresa.nome}</strong>. O e-mail é confirmado automaticamente.</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
              <div><Label>E-mail *</Label><Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
              <div><Label>Senha *</Label><Input type="text" value={novo.password} onChange={(e) => setNovo({ ...novo, password: e.target.value })} placeholder="mínimo 6 caracteres" /></div>
              <div><Label>Papel</Label>
                <Select value={novo.role} onValueChange={(v) => setNovo({ ...novo, role: v as EmpresaRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (gerencia tudo)</SelectItem>
                    <SelectItem value="gestor">Gestor (edita)</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={cadastrar} disabled={busy} className="w-full"><UserPlus2 className="h-4 w-4 mr-2" />Cadastrar acesso</Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
