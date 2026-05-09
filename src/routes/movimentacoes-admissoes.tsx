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
import { Plus, ArrowRightLeft, TrendingUp, Trash2, CheckCircle2, Clock, Timer, Eye, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CandidatosDialog } from "@/components/CandidatosDialog";
import { logAudit } from "@/lib/audit";
import { useEmpresa } from "@/lib/empresa-context";

async function logAdmissaoEvento(
  movimentacao_id: string | null,
  evento: "criada" | "editada" | "finalizada" | "excluida",
  detalhes: Record<string, unknown>,
) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("admissoes_historico").insert({
    movimentacao_id,
    evento,
    detalhes,
    user_id: u.user.id,
    user_nome: (u.user.user_metadata?.nome as string) || u.user.email,
  } as never);
}

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
  colaborador_id: string | null;
  colaborador_nome: string | null;
  cargo: string | null;
  setor: string | null;
  tipo: "substituicao" | "aumento_quadro" | string;
  substituido_id: string | null;
  substituido_nome: string | null;
  vaga_id: string | null;
  data_abertura: string;
  data_final: string | null;
  data_admissao: string | null;
  turno: string | null;
  status: "aberta" | "fechada" | string;
  observacao: string | null;
  link_token: string | null;
  salario: number | null;
  cargo_oferecido: string | null;
  publicada: boolean;
  created_at: string;
};

type ColabLite = { id: string; colaborador: string; cargo: string | null; setor: string | null; status: string };

const TURNOS = ["Manhã", "Tarde", "Noite", "Comercial", "12x36", "Integral"];

function Page() {
  const { isAdmin, isGestor } = useAuth() as { isAdmin: boolean; isGestor?: boolean };
  const { empresaAtual } = useEmpresa();
  const canEdit = isAdmin || !!isGestor;
  const [rows, setRows] = useState<Mov[]>([]);
  const [colabs, setColabs] = useState<ColabLite[]>([]);
  const [counts, setCounts] = useState<Record<string, { total: number; processo: number }>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [closeDialog, setCloseDialog] = useState<Mov | null>(null);
  const [closeForm, setCloseForm] = useState({ colaborador_id: "", data_admissao: new Date().toISOString().slice(0, 10), turno: "", cargo_oferecido: "", salario: "" });
  const [candidatosVaga, setCandidatosVaga] = useState<Mov | null>(null);
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState({
    tipo: "substituicao" as "substituicao" | "aumento_quadro",
    substituido_id: "",
    vaga_id: "",
    data_abertura: new Date().toISOString().slice(0, 10),
    data_final: "",
    cargo: "",
    setor: "",
    observacao: "",
  });

  const load = async () => {
    if (!empresaAtual) { setRows([]); setColabs([]); setCounts({}); setLoading(false); return; }
    setLoading(true);
    const [m, c] = await Promise.all([
      supabase.from("admissoes_movimentacao").select("*").eq("empresa_id", empresaAtual.id).order("data_abertura", { ascending: false }),
      supabase.from("colaboradores").select("id,colaborador,cargo,setor,status").eq("empresa_id", empresaAtual.id).order("colaborador"),
    ]);
    if (m.error) toast.error(m.error.message);
    const movs = (m.data as Mov[]) || [];
    setRows(movs);
    setColabs((c.data as ColabLite[]) || []);
    // contagem de candidatos por vaga
    const ids = movs.map((r) => r.id);
    if (ids.length) {
      const { data: cands } = await supabase.from("vaga_candidatos").select("vaga_id,etapa").in("vaga_id", ids);
      const map: Record<string, { total: number; processo: number }> = {};
      (cands as { vaga_id: string; etapa: string }[] | null || []).forEach((k) => {
        if (!map[k.vaga_id]) map[k.vaga_id] = { total: 0, processo: 0 };
        map[k.vaga_id].total++;
        if (k.etapa && !["reprovado", "admissao"].includes(k.etapa)) map[k.vaga_id].processo++;
      });
      setCounts(map);
    } else setCounts({});
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaAtual?.id]);

  const stats = useMemo(() => {
    const total = rows.length;
    const sub = rows.filter((r) => r.tipo === "substituicao").length;
    const aum = total - sub;
    const fechadas = rows.filter((r) => r.status === "fechada");
    const abertas = rows.filter((r) => r.status === "aberta").length;
    const tempos = fechadas
      .filter((r) => r.data_abertura && r.data_final)
      .map((r) => (new Date(r.data_final!).getTime() - new Date(r.data_abertura).getTime()) / 86400000)
      .filter((d) => d >= 0);
    const tempoMedio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0;
    const taxaFech = total ? Math.round((fechadas.length / total) * 100) : 0;
    return {
      total,
      sub,
      aum,
      pctSub: total ? Math.round((sub / total) * 100) : 0,
      pctAum: total ? Math.round((aum / total) * 100) : 0,
      abertas,
      fechadas: fechadas.length,
      tempoMedio,
      taxaFech,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.colaborador_nome || "").toLowerCase().includes(q) ||
        (r.substituido_nome || "").toLowerCase().includes(q) ||
        (r.cargo || "").toLowerCase().includes(q) ||
        (r.setor || "").toLowerCase().includes(q) ||
        (r.vaga_id || "").toLowerCase().includes(q),
    );
  }, [rows, filtro]);

  const handleSave = async () => {
    if (!empresaAtual) return toast.error("Selecione uma empresa");
    if (form.tipo === "substituicao" && !form.substituido_id) return toast.error("Informe quem foi substituído");
    const sub = colabs.find((c) => c.id === form.substituido_id);
    const { data: u } = await supabase.auth.getUser();
    const payload = {
      empresa_id: empresaAtual.id,
      tipo: form.tipo,
      substituido_id: form.tipo === "substituicao" ? sub?.id ?? null : null,
      substituido_nome: form.tipo === "substituicao" ? sub?.colaborador ?? null : null,
      cargo: form.cargo || sub?.cargo || null,
      setor: form.setor || sub?.setor || null,
      vaga_id: form.vaga_id || null,
      data_abertura: form.data_abertura,
      data_final: form.data_final || null,
      data_admissao: null,
      colaborador_id: null,
      colaborador_nome: "—",
      status: "aberta",
      observacao: form.observacao || null,
      created_by: u.user?.id ?? null,
      created_by_nome: u.user?.email ?? null,
    };
    const { data: created, error } = await supabase.from("admissoes_movimentacao").insert(payload as never).select().single();
    if (error) return toast.error(error.message);
    const id = (created as { id: string } | null)?.id || null;
    await logAdmissaoEvento(id, "criada", payload);
    logAudit({ acao: "create", entidade: "admissoes_movimentacao", entidade_id: id || undefined, resumo: `Abriu vaga ${form.tipo}` });
    toast.success("Vaga aberta");
    setOpen(false);
    setForm({ tipo: "substituicao", substituido_id: "", vaga_id: "", data_abertura: new Date().toISOString().slice(0, 10), data_final: "", cargo: "", setor: "", observacao: "" });
    load();
  };

  const handleClose = async () => {
    if (!closeDialog) return;
    if (!closeForm.colaborador_id) return toast.error("Selecione o colaborador que entrou");
    if (!closeForm.data_admissao) return toast.error("Informe a data de início");
    if (!closeForm.turno) return toast.error("Informe o turno");
    const colab = colabs.find((c) => c.id === closeForm.colaborador_id);
    if (!colab) return toast.error("Colaborador inválido");
    const update = {
      colaborador_id: colab.id,
      colaborador_nome: colab.colaborador,
      cargo: closeForm.cargo_oferecido || closeDialog.cargo || colab.cargo,
      cargo_oferecido: closeForm.cargo_oferecido || null,
      setor: closeDialog.setor || colab.setor,
      data_admissao: closeForm.data_admissao,
      data_final: closeForm.data_admissao,
      turno: closeForm.turno,
      salario: closeForm.salario ? Number(closeForm.salario) : null,
      status: "fechada",
    };
    const { error } = await supabase.from("admissoes_movimentacao").update(update as never).eq("id", closeDialog.id);
    if (error) return toast.error(error.message);
    await logAdmissaoEvento(closeDialog.id, "finalizada", update);
    logAudit({ acao: "update", entidade: "admissoes_movimentacao", entidade_id: closeDialog.id, resumo: `Finalizou vaga (entrou ${colab.colaborador})` });
    toast.success("Vaga fechada");
    setCloseDialog(null);
    setCloseForm({ colaborador_id: "", data_admissao: new Date().toISOString().slice(0, 10), turno: "", cargo_oferecido: "", salario: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este registro?")) return;
    const row = rows.find((r) => r.id === id);
    const { error } = await supabase.from("admissoes_movimentacao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAdmissaoEvento(id, "excluida", { ...(row || {}) });
    logAudit({ acao: "delete", entidade: "admissoes_movimentacao", entidade_id: id, resumo: "Excluiu vaga" });
    toast.success("Excluído");
    load();
  };

  const togglePublicada = async (r: Mov) => {
    const { error } = await supabase.from("admissoes_movimentacao").update({ publicada: !r.publicada } as never).eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(r.publicada ? "Vaga despublicada" : "Vaga publicada na landing");
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gestão de Vagas</h1>
          <p className="text-sm text-muted-foreground">Abertura, candidatos e fechamento de vagas — substituição ou aumento de quadro.</p>
        </div>
        {canEdit && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Nova vaga</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Abrir vaga</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as "substituicao" | "aumento_quadro", substituido_id: v === "aumento_quadro" ? "" : f.substituido_id }))}>
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
                        {colabs.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.colaborador} {c.cargo ? `— ${c.cargo}` : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.tipo === "aumento_quadro" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cargo</Label>
                      <Input value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Setor</Label>
                      <Input value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data de abertura *</Label>
                    <Input type="date" value={form.data_abertura} onChange={(e) => setForm((f) => ({ ...f, data_abertura: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Data final (prevista)</Label>
                    <Input type="date" value={form.data_final} onChange={(e) => setForm((f) => ({ ...f, data_final: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Número da vaga Gupy</Label>
                  <Input value={form.vaga_id} onChange={(e) => setForm((f) => ({ ...f, vaga_id: e.target.value }))} placeholder="Ex: 12345" />
                </div>
                <div>
                  <Label>Observação</Label>
                  <Textarea value={form.observacao} onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))} placeholder="opcional" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Abrir vaga</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Dashboard R&S */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total de vagas</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Abertas</p>
          <p className="text-2xl font-bold">{stats.abertas}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Fechadas</p>
          <p className="text-2xl font-bold">{stats.fechadas} <span className="text-sm text-muted-foreground">({stats.taxaFech}%)</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" />Tempo médio fech.</p>
          <p className="text-2xl font-bold">{stats.tempoMedio}<span className="text-sm text-muted-foreground"> dias</span></p>
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
          <p className="text-xs text-muted-foreground">Taxa fechamento</p>
          <p className="text-2xl font-bold">{stats.taxaFech}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Última admissão</p>
          <p className="text-2xl font-bold">{rows.find((r) => r.data_admissao) ? new Date(rows.find((r) => r.data_admissao)!.data_admissao!).toLocaleDateString("pt-BR") : "—"}</p>
        </Card>
      </div>

      <Card className="p-4">
        <Input placeholder="Buscar por nome, cargo, setor ou vaga..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="max-w-md mb-4" />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vaga</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Candidatos</TableHead>
                <TableHead className="text-center">Em processo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum registro</TableCell></TableRow>
              ) : filtered.map((r) => {
                const cnt = counts[r.id] || { total: 0, processo: 0 };
                const diasAtras = Math.max(0, Math.floor((Date.now() - new Date(r.created_at || r.data_abertura).getTime()) / 86400000));
                const linkPub = r.link_token ? `${window.location.origin}/vaga/${r.link_token}` : "";
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-semibold">{r.cargo || "Vaga"}</div>
                      <div className="text-xs text-muted-foreground">Criada há {diasAtras} dia(s)</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[(empresaAtual as { cidade?: string } | null)?.cidade, "Presencial"].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.tipo === "substituicao" ? "Substituição" : "Aumento"}
                    </TableCell>
                    <TableCell className="text-center font-medium text-primary">{cnt.total}</TableCell>
                    <TableCell className="text-center font-medium text-primary">{cnt.processo}</TableCell>
                    <TableCell>
                      {r.status === "fechada" ? (
                        <span className="text-emerald-600 text-sm font-medium">Fechada</span>
                      ) : (
                        <span className="text-emerald-600 text-sm font-medium">Ativa</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at || r.data_abertura).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {linkPub && r.status === "aberta" && (
                          <Button variant="ghost" size="sm" className="text-primary" onClick={() => window.open(linkPub, "_blank")}>
                            <Eye className="h-4 w-4 mr-1" /> Ver vaga
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="sm" className="text-primary font-semibold" onClick={() => setCandidatosVaga(r)}>
                            Ver Processo
                          </Button>
                        )}
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {r.status === "aberta" && (
                                <DropdownMenuItem onClick={() => togglePublicada(r)}>
                                  {r.publicada ? "Despublicar" : "Publicar na landing"}
                                </DropdownMenuItem>
                              )}
                              {r.status === "aberta" && (
                                <DropdownMenuItem onClick={() => { setCloseDialog(r); setCloseForm({ colaborador_id: "", data_admissao: new Date().toISOString().slice(0, 10), turno: "", cargo_oferecido: r.cargo || "", salario: "" }); }}>
                                  Mover para Admissão
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => handleDelete(r.id)} className="text-destructive">
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Finalizar vaga */}
      <Dialog open={!!closeDialog} onOpenChange={(o) => !o && setCloseDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Finalizar vaga</DialogTitle></DialogHeader>
          {closeDialog && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {closeDialog.tipo === "substituicao" ? <>No lugar de <strong>{closeDialog.substituido_nome}</strong></> : <>Aumento de quadro — {closeDialog.cargo || "—"}</>}
              </div>
              <div>
                <Label>Colaborador que entrou *</Label>
                <Select value={closeForm.colaborador_id} onValueChange={(v) => setCloseForm((f) => ({ ...f, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {colabs.map((c) => (<SelectItem key={c.id} value={c.id}>{c.colaborador} {c.cargo ? `— ${c.cargo}` : ""}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de início *</Label>
                  <Input type="date" value={closeForm.data_admissao} onChange={(e) => setCloseForm((f) => ({ ...f, data_admissao: e.target.value }))} />
                </div>
                <div>
                  <Label>Turno *</Label>
                  <Select value={closeForm.turno} onValueChange={(v) => setCloseForm((f) => ({ ...f, turno: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cargo oferecido</Label>
                  <Input value={closeForm.cargo_oferecido} onChange={(e) => setCloseForm((f) => ({ ...f, cargo_oferecido: e.target.value }))} placeholder="Ex: Assistente de Estoque Jr" />
                </div>
                <div>
                  <Label>Salário (R$)</Label>
                  <Input type="number" step="0.01" value={closeForm.salario} onChange={(e) => setCloseForm((f) => ({ ...f, salario: e.target.value }))} placeholder="0,00" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(null)}>Cancelar</Button>
            <Button onClick={handleClose}>Confirmar admissão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {candidatosVaga && (
        <CandidatosDialog
          vaga={candidatosVaga}
          canEdit={canEdit}
          onClose={() => setCandidatosVaga(null)}
        />
      )}
    </div>
  );
}
