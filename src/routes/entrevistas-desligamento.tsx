import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { DoorOpen, Plus, Trash2, Link2, FileText, ClipboardEdit, Send, ArrowUp, ArrowDown, Star, MessageSquare } from "lucide-react";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/entrevistas-desligamento")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Modelo = { id: string; titulo: string; descricao: string | null; ativo: boolean; created_at: string };
type Pergunta = { id: string; modelo_id: string; ordem: number; tipo: string; texto: string; opcoes: string[] | null; obrigatoria: boolean };
type Colab = { id: string; colaborador: string; cargo: string | null; setor: string | null; data_demissao: string | null; tipo_demissao: string | null };
type Entrevista = {
  id: string; empresa_id: string; colaborador_id: string; modelo_id: string | null; modo: string;
  token: string; status: string; observacao: string | null; respondida_em: string | null; created_at: string;
};
type Resposta = { id: string; entrevista_id: string; pergunta_id: string; valor_texto: string | null; valor_nota: number | null };

const TIPOS = [
  { v: "texto", l: "Resposta aberta" },
  { v: "nota_0_10", l: "Nota 0-10" },
  { v: "sim_nao", l: "Sim / Não" },
  { v: "multipla", l: "Múltipla escolha" },
];

function Page() {
  const { isAdmin, isGestor } = useAuth() as { isAdmin: boolean; isGestor?: boolean };
  const { empresaAtual } = useEmpresa();
  const canEdit = isAdmin || !!isGestor;

  const [tab, setTab] = useState<"entrevistas" | "modelos">("entrevistas");
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [demitidos, setDemitidos] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorModelo, setEditorModelo] = useState<Modelo | null>(null);
  const [novoModelo, setNovoModelo] = useState({ titulo: "", descricao: "" });
  const [novoModeloOpen, setNovoModeloOpen] = useState(false);
  const [novaEntrevista, setNovaEntrevista] = useState({ colaborador_id: "", modelo_id: "", modo: "rh" });
  const [novaEntrevistaOpen, setNovaEntrevistaOpen] = useState(false);
  const [responder, setResponder] = useState<Entrevista | null>(null);

  const load = async () => {
    if (!empresaAtual) return;
    setLoading(true);
    const [m, e, c] = await Promise.all([
      supabase.from("desligamento_modelos").select("*").eq("empresa_id", empresaAtual.id).order("created_at", { ascending: false }),
      supabase.from("desligamento_entrevistas").select("*").eq("empresa_id", empresaAtual.id).order("created_at", { ascending: false }),
      supabase.from("colaboradores").select("id,colaborador,cargo,setor,data_demissao,tipo_demissao").eq("empresa_id", empresaAtual.id).eq("status", "Demitido").order("data_demissao", { ascending: false }),
    ]);
    const mods = (m.data as Modelo[]) || [];
    setModelos(mods);
    setEntrevistas((e.data as Entrevista[]) || []);
    setDemitidos((c.data as Colab[]) || []);
    if (mods.length) {
      const { data: p } = await supabase.from("desligamento_perguntas").select("*").in("modelo_id", mods.map((x) => x.id)).order("ordem");
      setPerguntas((p as Pergunta[]) || []);
    } else setPerguntas([]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaAtual?.id]);

  const colabMap = useMemo(() => Object.fromEntries(demitidos.map((c) => [c.id, c])), [demitidos]);
  const modeloMap = useMemo(() => Object.fromEntries(modelos.map((m) => [m.id, m])), [modelos]);
  const perguntasDoModelo = (modeloId: string) => perguntas.filter((p) => p.modelo_id === modeloId).sort((a, b) => a.ordem - b.ordem);

  // ============ Modelos ============
  const criarModelo = async () => {
    if (!empresaAtual) return;
    if (!novoModelo.titulo.trim()) return toast.error("Informe o título");
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("desligamento_modelos").insert({
      empresa_id: empresaAtual.id, titulo: novoModelo.titulo.trim(), descricao: novoModelo.descricao || null, created_by: u.user?.id,
    } as never).select().single();
    if (error) return toast.error(error.message);
    toast.success("Modelo criado");
    logAudit({ acao: "create", entidade: "desligamento_modelos", entidade_id: (data as { id: string }).id, resumo: `Modelo: ${novoModelo.titulo}` });
    setNovoModelo({ titulo: "", descricao: "" });
    setNovoModeloOpen(false);
    await load();
    setEditorModelo(data as Modelo);
  };

  const removerModelo = async (m: Modelo) => {
    if (!confirm(`Excluir modelo "${m.titulo}"? Todas as perguntas serão perdidas.`)) return;
    const { error } = await supabase.from("desligamento_modelos").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    load();
  };

  const addPergunta = async () => {
    if (!editorModelo) return;
    const ordem = (perguntasDoModelo(editorModelo.id).at(-1)?.ordem ?? -1) + 1;
    const { error } = await supabase.from("desligamento_perguntas").insert({
      modelo_id: editorModelo.id, ordem, tipo: "texto", texto: "Nova pergunta", obrigatoria: true,
    } as never);
    if (error) return toast.error(error.message);
    load();
  };

  const updatePergunta = async (p: Pergunta, patch: Partial<Pergunta>) => {
    const { error } = await supabase.from("desligamento_perguntas").update(patch as never).eq("id", p.id);
    if (error) return toast.error(error.message);
    setPerguntas((all) => all.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
  };

  const moverPergunta = async (p: Pergunta, dir: -1 | 1) => {
    const list = perguntasDoModelo(p.modelo_id);
    const idx = list.findIndex((x) => x.id === p.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("desligamento_perguntas").update({ ordem: swap.ordem } as never).eq("id", p.id),
      supabase.from("desligamento_perguntas").update({ ordem: p.ordem } as never).eq("id", swap.id),
    ]);
    load();
  };

  const removerPergunta = async (p: Pergunta) => {
    if (!confirm("Remover pergunta?")) return;
    await supabase.from("desligamento_perguntas").delete().eq("id", p.id);
    load();
  };

  // ============ Entrevistas ============
  const criarEntrevista = async () => {
    if (!empresaAtual) return;
    if (!novaEntrevista.colaborador_id) return toast.error("Selecione o colaborador desligado");
    if (!novaEntrevista.modelo_id) return toast.error("Selecione o modelo");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("desligamento_entrevistas").insert({
      empresa_id: empresaAtual.id,
      colaborador_id: novaEntrevista.colaborador_id,
      modelo_id: novaEntrevista.modelo_id,
      modo: novaEntrevista.modo,
      created_by: u.user?.id,
    } as never);
    if (error) return toast.error(error.message);
    toast.success(novaEntrevista.modo === "colaborador" ? "Entrevista criada — copie o link e envie" : "Entrevista criada");
    setNovaEntrevista({ colaborador_id: "", modelo_id: "", modo: "rh" });
    setNovaEntrevistaOpen(false);
    load();
  };

  const removerEntrevista = async (e: Entrevista) => {
    if (!confirm("Excluir esta entrevista e suas respostas?")) return;
    await supabase.from("desligamento_entrevistas").delete().eq("id", e.id);
    load();
  };

  const copiarLink = (e: Entrevista) => {
    const url = `${window.location.origin}/desligamento/${e.token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2"><DoorOpen className="h-7 w-7 text-primary" /> Entrevista de Desligamento</h1>
          <p className="text-sm text-muted-foreground">Aplique entrevistas com colaboradores desligados — preenchidas pelo RH ou pelo próprio colaborador via link.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "entrevistas" | "modelos")}>
        <TabsList>
          <TabsTrigger value="entrevistas"><ClipboardEdit className="h-4 w-4 mr-1.5" />Entrevistas</TabsTrigger>
          <TabsTrigger value="modelos"><FileText className="h-4 w-4 mr-1.5" />Modelos</TabsTrigger>
        </TabsList>

        {/* =========== Entrevistas =========== */}
        <TabsContent value="entrevistas" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">{entrevistas.length} entrevista(s)</div>
            {canEdit && (
              <Button onClick={() => setNovaEntrevistaOpen(true)} disabled={!modelos.length || !demitidos.length}>
                <Plus className="h-4 w-4 mr-1.5" /> Nova entrevista
              </Button>
            )}
          </div>
          {!modelos.length && (
            <Card className="p-4 text-sm text-muted-foreground">Crie ao menos um <button className="text-primary underline" onClick={() => setTab("modelos")}>modelo de questionário</button> antes de iniciar entrevistas.</Card>
          )}
          {!demitidos.length && (
            <Card className="p-4 text-sm text-muted-foreground">Nenhum colaborador com status <strong>Demitido</strong> nesta empresa.</Card>
          )}
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo / Setor</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Modo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : entrevistas.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma entrevista ainda.</TableCell></TableRow>
                ) : entrevistas.map((e) => {
                  const c = colabMap[e.colaborador_id];
                  const m = e.modelo_id ? modeloMap[e.modelo_id] : null;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{c?.colaborador || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{[c?.cargo, c?.setor].filter(Boolean).join(" / ") || "—"}</TableCell>
                      <TableCell className="text-sm">{m?.titulo || "—"}</TableCell>
                      <TableCell>
                        {e.modo === "colaborador" ? <Badge variant="secondary">Colaborador (link)</Badge> : <Badge variant="outline">RH</Badge>}
                      </TableCell>
                      <TableCell>
                        {e.status === "respondida" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700">Respondida</Badge>
                        ) : e.status === "arquivada" ? (
                          <Badge variant="outline">Arquivada</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {e.modo === "colaborador" && e.status === "pendente" && (
                            <Button size="sm" variant="ghost" onClick={() => copiarLink(e)} title="Copiar link"><Link2 className="h-4 w-4" /></Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-primary" onClick={() => setResponder(e)}>
                            {e.status === "respondida" ? "Ver respostas" : "Responder"}
                          </Button>
                          {canEdit && (
                            <Button size="icon" variant="ghost" onClick={() => removerEntrevista(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* =========== Modelos =========== */}
        <TabsContent value="modelos" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-muted-foreground">{modelos.length} modelo(s)</div>
            {canEdit && (<Button onClick={() => setNovoModeloOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Novo modelo</Button>)}
          </div>
          {modelos.length === 0 && !loading && (
            <Card className="p-6 text-center text-muted-foreground">Nenhum modelo. Crie o primeiro questionário para começar.</Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modelos.map((m) => (
              <Card key={m.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{m.titulo}</p>
                    {m.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{m.descricao}</p>}
                  </div>
                  {canEdit && (
                    <Button size="icon" variant="ghost" onClick={() => removerModelo(m)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{perguntasDoModelo(m.id).length} pergunta(s)</p>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setEditorModelo(m)}>
                  <ClipboardEdit className="h-4 w-4 mr-1.5" /> Editar perguntas
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* ============ Dialog: novo modelo ============ */}
      <Dialog open={novoModeloOpen} onOpenChange={setNovoModeloOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo modelo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Título *</Label><Input value={novoModelo.titulo} onChange={(e) => setNovoModelo({ ...novoModelo, titulo: e.target.value })} placeholder="Ex: Entrevista padrão de desligamento" /></div>
            <div><Label>Descrição</Label><Textarea rows={3} value={novoModelo.descricao} onChange={(e) => setNovoModelo({ ...novoModelo, descricao: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoModeloOpen(false)}>Cancelar</Button>
            <Button onClick={criarModelo}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: editar perguntas ============ */}
      <Dialog open={!!editorModelo} onOpenChange={(o) => !o && setEditorModelo(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Perguntas — {editorModelo?.titulo}</DialogTitle></DialogHeader>
          {editorModelo && (
            <div className="space-y-2">
              {perguntasDoModelo(editorModelo.id).map((p, i, arr) => (
                <div key={p.id} className="border rounded-md p-3 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    <Input value={p.texto} onChange={(e) => updatePergunta(p, { texto: e.target.value })} className="flex-1" />
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => moverPergunta(p, -1)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={i === arr.length - 1} onClick={() => moverPergunta(p, 1)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removerPergunta(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pl-8">
                    <Select value={p.tipo} onValueChange={(v) => updatePergunta(p, { tipo: v })}>
                      <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                    </Select>
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" checked={p.obrigatoria} onChange={(e) => updatePergunta(p, { obrigatoria: e.target.checked })} /> Obrigatória
                    </label>
                    {p.tipo === "multipla" && (
                      <Input
                        className="h-8 text-xs flex-1 min-w-[200px]"
                        placeholder="Opções separadas por vírgula"
                        value={(p.opcoes || []).join(", ")}
                        onChange={(e) => updatePergunta(p, { opcoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as never })}
                      />
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addPergunta}><Plus className="h-4 w-4 mr-1.5" /> Adicionar pergunta</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: nova entrevista ============ */}
      <Dialog open={novaEntrevistaOpen} onOpenChange={setNovaEntrevistaOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova entrevista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Colaborador desligado *</Label>
              <Select value={novaEntrevista.colaborador_id} onValueChange={(v) => setNovaEntrevista({ ...novaEntrevista, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {demitidos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.colaborador} {c.cargo ? `— ${c.cargo}` : ""} {c.data_demissao ? `(${new Date(c.data_demissao).toLocaleDateString("pt-BR")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modelo *</Label>
              <Select value={novaEntrevista.modelo_id} onValueChange={(v) => setNovaEntrevista({ ...novaEntrevista, modelo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{modelos.map((m) => <SelectItem key={m.id} value={m.id}>{m.titulo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modo</Label>
              <Select value={novaEntrevista.modo} onValueChange={(v) => setNovaEntrevista({ ...novaEntrevista, modo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rh">RH preenche</SelectItem>
                  <SelectItem value="colaborador">Colaborador via link público</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaEntrevistaOpen(false)}>Cancelar</Button>
            <Button onClick={criarEntrevista}><Send className="h-4 w-4 mr-1.5" />Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Dialog: responder/ver respostas ============ */}
      {responder && (
        <ResponderDialog
          entrevista={responder}
          perguntas={responder.modelo_id ? perguntasDoModelo(responder.modelo_id) : []}
          colaborador={colabMap[responder.colaborador_id]}
          modelo={responder.modelo_id ? modeloMap[responder.modelo_id] : null}
          canEdit={canEdit}
          onClose={() => { setResponder(null); load(); }}
        />
      )}
    </div>
  );
}

// ============ Dialog de respostas (RH) ============
function ResponderDialog({
  entrevista, perguntas, colaborador, modelo, canEdit, onClose,
}: {
  entrevista: Entrevista; perguntas: Pergunta[]; colaborador?: Colab; modelo: Modelo | null; canEdit: boolean; onClose: () => void;
}) {
  const [respostas, setRespostas] = useState<Record<string, { texto?: string; nota?: number }>>({});
  const [obs, setObs] = useState(entrevista.observacao || "");
  const [salvando, setSalvando] = useState(false);
  const [carregadas, setCarregadas] = useState<Resposta[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("desligamento_respostas").select("*").eq("entrevista_id", entrevista.id);
      const arr = (data as Resposta[]) || [];
      setCarregadas(arr);
      const map: Record<string, { texto?: string; nota?: number }> = {};
      arr.forEach((r) => { map[r.pergunta_id] = { texto: r.valor_texto || undefined, nota: r.valor_nota ?? undefined }; });
      setRespostas(map);
    })();
  }, [entrevista.id]);

  const readonly = !canEdit || entrevista.status === "respondida";

  const salvar = async () => {
    if (readonly) return;
    setSalvando(true);
    // valida obrigatórias
    for (const p of perguntas) {
      const r = respostas[p.id];
      const vazio = !r || (r.texto === undefined && r.nota === undefined) || (r.texto !== undefined && !r.texto.trim() && r.nota === undefined);
      if (p.obrigatoria && vazio) { toast.error(`Responda: ${p.texto}`); setSalvando(false); return; }
    }
    // remove anteriores e insere novas
    if (carregadas.length) await supabase.from("desligamento_respostas").delete().eq("entrevista_id", entrevista.id);
    const payload = perguntas.map((p) => ({
      entrevista_id: entrevista.id,
      pergunta_id: p.id,
      valor_texto: respostas[p.id]?.texto ?? null,
      valor_nota: respostas[p.id]?.nota ?? null,
    }));
    const { error } = await supabase.from("desligamento_respostas").insert(payload as never);
    if (error) { toast.error(error.message); setSalvando(false); return; }
    await supabase.from("desligamento_entrevistas").update({
      status: "respondida", respondida_em: new Date().toISOString(), observacao: obs || null,
    } as never).eq("id", entrevista.id);
    toast.success("Respostas salvas");
    setSalvando(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modelo?.titulo || "Entrevista de Desligamento"}</DialogTitle>
          <p className="text-sm text-muted-foreground">{colaborador?.colaborador} {colaborador?.cargo ? `— ${colaborador.cargo}` : ""}</p>
        </DialogHeader>
        <div className="space-y-4">
          {perguntas.length === 0 && <p className="text-sm text-muted-foreground">O modelo desta entrevista não possui perguntas.</p>}
          {perguntas.map((p, i) => (
            <PerguntaInput
              key={p.id}
              index={i + 1}
              pergunta={p}
              valor={respostas[p.id] || {}}
              readonly={readonly}
              onChange={(v) => setRespostas({ ...respostas, [p.id]: v })}
            />
          ))}
          <div>
            <Label className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Observação interna do RH</Label>
            <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} disabled={readonly} placeholder="Notas privadas (não enviadas ao colaborador)" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!readonly && <Button onClick={salvar} disabled={salvando}><Send className="h-4 w-4 mr-1.5" />{salvando ? "Salvando..." : "Salvar respostas"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PerguntaInput({
  index, pergunta, valor, readonly, onChange,
}: {
  index: number; pergunta: Pergunta; valor: { texto?: string; nota?: number }; readonly?: boolean;
  onChange: (v: { texto?: string; nota?: number }) => void;
}) {
  return (
    <div className="border rounded-md p-3 space-y-2">
      <p className="text-sm font-medium">{index}. {pergunta.texto} {pergunta.obrigatoria && <span className="text-destructive">*</span>}</p>
      {pergunta.tipo === "texto" && (
        <Textarea rows={3} value={valor.texto || ""} onChange={(e) => onChange({ texto: e.target.value })} disabled={readonly} />
      )}
      {pergunta.tipo === "nota_0_10" && (
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }).map((_, n) => (
            <button
              key={n}
              type="button"
              disabled={readonly}
              onClick={() => onChange({ nota: n })}
              className={`h-8 w-8 rounded border text-sm font-medium transition ${
                valor.nota === n ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              } ${readonly ? "opacity-70 cursor-not-allowed" : ""}`}
            >{n}</button>
          ))}
        </div>
      )}
      {pergunta.tipo === "sim_nao" && (
        <div className="flex gap-2">
          {[{ v: "sim", l: "Sim" }, { v: "nao", l: "Não" }].map((o) => (
            <button
              key={o.v}
              type="button"
              disabled={readonly}
              onClick={() => onChange({ texto: o.v })}
              className={`px-4 py-1.5 rounded border text-sm transition ${
                valor.texto === o.v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
              } ${readonly ? "opacity-70 cursor-not-allowed" : ""}`}
            >{o.l}</button>
          ))}
        </div>
      )}
      {pergunta.tipo === "multipla" && (
        <div className="flex flex-col gap-1">
          {(pergunta.opcoes || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <input type="radio" name={pergunta.id} checked={valor.texto === o} onChange={() => onChange({ texto: o })} disabled={readonly} />
              {o}
            </label>
          ))}
          {(!pergunta.opcoes || !pergunta.opcoes.length) && <p className="text-xs text-muted-foreground italic">Sem opções configuradas.</p>}
        </div>
      )}
    </div>
  );
}

void Star;
