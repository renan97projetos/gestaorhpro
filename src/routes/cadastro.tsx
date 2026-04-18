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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Loader2, Filter, Users, UserX, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ColabFull, tempoDeEmpresa } from "@/lib/dashboard-helpers";

export const Route = createFileRoute("/cadastro")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <CadastroPage />
      </AppLayout>
    </RequireAuth>
  ),
});

const STATUS_OPTS = ["Ativo", "Demitido", "Afastado", "Ferias"] as const;
const TIPO_DEMISSAO_OPTS = [
  "Pedido de demissao",
  "Sem justa causa",
  "Com justa causa",
  "Acordo",
  "Fim de contrato",
] as const;
const SEXO_OPTS = ["Masculino", "Feminino"] as const;

const TRACKED_FIELDS: (keyof ColabFull)[] = [
  "matricula", "colaborador", "status", "cargo", "setor", "subsetor",
  "lideranca", "turno", "sabado_trabalho", "sabado_horario",
  "horario_almoco", "horario_cafe", "admissao", "sexo", "data_demissao", "tipo_demissao",
];
const FIELD_LABELS: Record<string, string> = {
  matricula: "Matrícula", colaborador: "Colaborador", status: "Status",
  cargo: "Cargo", setor: "Setor", subsetor: "Subsetor", lideranca: "Liderança",
  turno: "Turno", sabado_trabalho: "Sábado Trabalho", sabado_horario: "Sábado Horário",
  horario_almoco: "Horário Almoço", horario_cafe: "Horário Café", admissao: "Admissão",
  sexo: "Sexo", data_demissao: "Data Demissão", tipo_demissao: "Tipo Demissão",
};

function CadastroPage() {
  const { user, isGestor } = useAuth();
  const [list, setList] = useState<ColabFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ativos");
  const [editing, setEditing] = useState<ColabFull | null>(null);
  const [creating, setCreating] = useState(false);

  // Filtros aba ATIVOS
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [fSabado, setFSabado] = useState("all");
  const [fCargo, setFCargo] = useState("all");
  const [fSetor, setFSetor] = useState("all");
  const [fSubsetor, setFSubsetor] = useState("all");
  const [fLideranca, setFLideranca] = useState("all");
  const [fTurno, setFTurno] = useState("all");
  const [fAlmoco, setFAlmoco] = useState("all");
  const [fCafe, setFCafe] = useState("all");
  const [fSexo, setFSexo] = useState("all");

  // Filtros aba DEMITIDOS
  const [qD, setQD] = useState("");
  const [fTipoD, setFTipoD] = useState("all");
  const [fSetorD, setFSetorD] = useState("all");
  const [fLiderancaD, setFLiderancaD] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("colaboradores").select("*").order("colaborador");
    if (error) toast.error(error.message);
    setList((data as ColabFull[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const ativos = useMemo(() => list.filter((c) => c.status !== "Demitido"), [list]);
  const demitidos = useMemo(() => list.filter((c) => c.status === "Demitido"), [list]);

  const uniq = (arr: ColabFull[], k: keyof ColabFull) =>
    Array.from(new Set(arr.map((c) => c[k]).filter(Boolean) as string[])).sort();

  const cargos = useMemo(() => uniq(ativos, "cargo"), [ativos]);
  const setores = useMemo(() => uniq(ativos, "setor"), [ativos]);
  const subsetores = useMemo(() => uniq(ativos, "subsetor"), [ativos]);
  const liderancas = useMemo(() => uniq(ativos, "lideranca"), [ativos]);
  const turnos = useMemo(() => uniq(ativos, "turno"), [ativos]);
  const almocos = useMemo(() => uniq(ativos, "horario_almoco"), [ativos]);
  const cafes = useMemo(() => uniq(ativos, "horario_cafe"), [ativos]);
  const setoresD = useMemo(() => uniq(demitidos, "setor"), [demitidos]);
  const liderancasD = useMemo(() => uniq(demitidos, "lideranca"), [demitidos]);

  const filteredAtivos = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ativos.filter((c) => {
      if (fStatus !== "all" && c.status !== fStatus) return false;
      if (fSabado !== "all" && (c.sabado_trabalho ?? "") !== fSabado) return false;
      if (fCargo !== "all" && c.cargo !== fCargo) return false;
      if (fSetor !== "all" && c.setor !== fSetor) return false;
      if (fSubsetor !== "all" && c.subsetor !== fSubsetor) return false;
      if (fLideranca !== "all" && c.lideranca !== fLideranca) return false;
      if (fTurno !== "all" && c.turno !== fTurno) return false;
      if (fAlmoco !== "all" && c.horario_almoco !== fAlmoco) return false;
      if (fCafe !== "all" && c.horario_cafe !== fCafe) return false;
      if (fSexo !== "all" && c.sexo !== fSexo) return false;
      if (!term) return true;
      return [c.colaborador, c.matricula, c.cargo, c.setor, c.lideranca]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [ativos, q, fStatus, fSabado, fCargo, fSetor, fSubsetor, fLideranca, fTurno, fAlmoco, fCafe, fSexo]);

  const filteredDemitidos = useMemo(() => {
    const term = qD.trim().toLowerCase();
    return demitidos.filter((c) => {
      if (fTipoD !== "all" && c.tipo_demissao !== fTipoD) return false;
      if (fSetorD !== "all" && c.setor !== fSetorD) return false;
      if (fLiderancaD !== "all" && c.lideranca !== fLiderancaD) return false;
      if (!term) return true;
      return [c.colaborador, c.matricula, c.cargo, c.setor]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(term));
    });
  }, [demitidos, qD, fTipoD, fSetorD, fLiderancaD]);

  const ativosCount = ativos.filter((c) => c.status === "Ativo").length;
  const afastadosCount = ativos.filter((c) => c.status === "Afastado" || c.status === "Ferias").length;
  const sabadoCount = filteredAtivos.filter((c) => c.sabado_trabalho === "Sim").length;

  const clearAtivos = () => {
    setQ(""); setFStatus("all"); setFSabado("all"); setFCargo("all"); setFSetor("all");
    setFSubsetor("all"); setFLideranca("all"); setFTurno("all"); setFAlmoco("all"); setFCafe("all"); setFSexo("all");
  };
  const clearDemitidos = () => { setQD(""); setFTipoD("all"); setFSetorD("all"); setFLiderancaD("all"); };

  const handleSaveEdit = async (updated: Partial<ColabFull>) => {
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
    if (error) { toast.error(error.message); return; }
    if (changes.length && user) {
      await supabase.from("movimentacoes").insert(
        changes.map((c) => ({
          colaborador_id: editing.id, matricula: editing.matricula, colaborador_nome: editing.colaborador,
          campo: c.campo, valor_anterior: c.anterior || null, valor_novo: c.novo || null,
          tipo: "edicao", user_id: user.id, user_nome: user.email ?? null,
        }))
      );
    }
    toast.success("Colaborador atualizado");
    setEditing(null); load();
  };

  const handleCreate = async (newC: Partial<ColabFull>) => {
    if (!user) return;
    const { data, error } = await supabase.from("colaboradores")
      .insert({ ...newC, created_by: user.id } as never).select().single();
    if (error) { toast.error(error.message); return; }
    await supabase.from("movimentacoes").insert({
      colaborador_id: data.id, matricula: data.matricula, colaborador_nome: data.colaborador,
      campo: "Cadastro", valor_novo: "Colaborador criado", tipo: "criacao",
      user_id: user.id, user_nome: user.email ?? null,
    });
    toast.success("Colaborador cadastrado");
    setCreating(false); load();
  };

  const handleDelete = async (c: ColabFull) => {
    if (!confirm(`Excluir ${c.colaborador}?`)) return;
    const { error } = await supabase.from("colaboradores").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const exportCsv = (rows: ColabFull[], filename: string) => {
    const cols = ["matricula", "colaborador", "sexo", "status", "cargo", "setor", "subsetor", "lideranca", "turno", "sabado_trabalho", "sabado_horario", "horario_almoco", "horario_cafe", "admissao", "data_demissao", "tipo_demissao"];
    const head = cols.join(";");
    const body = rows.map((r) => cols.map((c) => `"${(r as Record<string, unknown>)[c] ?? ""}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Lista de Colaboradores</h1>
            <p className="text-muted-foreground text-sm">Gerencie e visualize todos os colaboradores</p>
          </div>
        </div>
        {isGestor && (
          <Button onClick={() => setCreating(true)} className="bg-[image:var(--gradient-primary)]">
            <Plus className="h-4 w-4 mr-2" /> Novo colaborador
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="ativos" className="gap-2">
            <Users className="h-4 w-4" /> Ativos/Afastados ({ativos.length})
          </TabsTrigger>
          <TabsTrigger value="demitidos" className="gap-2">
            <UserX className="h-4 w-4" /> Demitidos ({demitidos.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA ATIVOS */}
        <TabsContent value="ativos" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Filtros de Pesquisa</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterField label="Busca Geral">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Nome, matrícula, cargo..." value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </FilterField>
              <FilterField label="Status">
                <SimpleSelect value={fStatus} onChange={setFStatus} placeholder="Todos os status"
                  options={[{ v: "all", l: "Todos os status" }, ...STATUS_OPTS.filter(s => s !== "Demitido").map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Trabalha no Sábado">
                <SimpleSelect value={fSabado} onChange={setFSabado} placeholder="Todos"
                  options={[{ v: "all", l: "Todos" }, { v: "Sim", l: "Sim" }, { v: "Não", l: "Não" }]} />
              </FilterField>
              <FilterField label="Sexo">
                <SimpleSelect value={fSexo} onChange={setFSexo} placeholder="Todos"
                  options={[{ v: "all", l: "Todos" }, ...SEXO_OPTS.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Cargo">
                <SimpleSelect value={fCargo} onChange={setFCargo} placeholder="Todos os cargos"
                  options={[{ v: "all", l: "Todos os cargos" }, ...cargos.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Setor">
                <SimpleSelect value={fSetor} onChange={setFSetor} placeholder="Todos os setores"
                  options={[{ v: "all", l: "Todos os setores" }, ...setores.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Subsetor">
                <SimpleSelect value={fSubsetor} onChange={setFSubsetor} placeholder="Todos os subsetores"
                  options={[{ v: "all", l: "Todos os subsetores" }, ...subsetores.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Liderança">
                <SimpleSelect value={fLideranca} onChange={setFLideranca} placeholder="Todas as lideranças"
                  options={[{ v: "all", l: "Todas as lideranças" }, ...liderancas.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Turno">
                <SimpleSelect value={fTurno} onChange={setFTurno} placeholder="Todos os turnos"
                  options={[{ v: "all", l: "Todos os turnos" }, ...turnos.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Horário Almoço">
                <SimpleSelect value={fAlmoco} onChange={setFAlmoco} placeholder="Todos os horários"
                  options={[{ v: "all", l: "Todos os horários" }, ...almocos.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Horário Café">
                <SimpleSelect value={fCafe} onChange={setFCafe} placeholder="Todos os horários"
                  options={[{ v: "all", l: "Todos os horários" }, ...cafes.map(s => ({ v: s, l: s }))]} />
              </FilterField>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={clearAtivos}><RotateCcw className="h-4 w-4 mr-2" /> Limpar Filtros</Button>
              <Button onClick={() => exportCsv(filteredAtivos, "colaboradores.csv")} className="bg-[image:var(--gradient-primary)]">
                <Download className="h-4 w-4 mr-2" /> Exportar para Excel
              </Button>
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-sm">
              <span className="text-muted-foreground">Exibindo {filteredAtivos.length} de {ativos.length} colaboradores</span>
              <div className="flex gap-4 text-xs">
                <span><span className="text-muted-foreground">Ativos: </span><b>{ativosCount}</b></span>
                <span><span className="text-muted-foreground">Afastados: </span><b>{afastadosCount}</b></span>
                <span><span className="text-muted-foreground">Sábado: </span><b>{sabadoCount}</b></span>
              </div>
            </div>
          </Card>

          <ColabTable rows={filteredAtivos} loading={loading} isGestor={isGestor}
            onEdit={setEditing} onDelete={handleDelete} mode="ativos" />
        </TabsContent>

        {/* ABA DEMITIDOS */}
        <TabsContent value="demitidos" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Filtros de Pesquisa - Demitidos</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FilterField label="Busca Geral">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Nome, matrícula, cargo..." value={qD} onChange={(e) => setQD(e.target.value)} />
                </div>
              </FilterField>
              <FilterField label="Tipo de Demissão">
                <SimpleSelect value={fTipoD} onChange={setFTipoD} placeholder="Todos os tipos"
                  options={[{ v: "all", l: "Todos os tipos" }, ...TIPO_DEMISSAO_OPTS.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Setor">
                <SimpleSelect value={fSetorD} onChange={setFSetorD} placeholder="Todos os setores"
                  options={[{ v: "all", l: "Todos os setores" }, ...setoresD.map(s => ({ v: s, l: s }))]} />
              </FilterField>
              <FilterField label="Liderança">
                <SimpleSelect value={fLiderancaD} onChange={setFLiderancaD} placeholder="Todas as lideranças"
                  options={[{ v: "all", l: "Todas as lideranças" }, ...liderancasD.map(s => ({ v: s, l: s }))]} />
              </FilterField>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={clearDemitidos}><RotateCcw className="h-4 w-4 mr-2" /> Limpar Filtros</Button>
              <Button onClick={() => exportCsv(filteredDemitidos, "demitidos.csv")} className="bg-[image:var(--gradient-primary)]">
                <Download className="h-4 w-4 mr-2" /> Exportar Demitidos para Excel
              </Button>
            </div>
          </Card>

          <Card className="p-3">
            <div className="px-2 py-1 text-sm text-muted-foreground">
              Exibindo {filteredDemitidos.length} de {demitidos.length} demitidos
            </div>
          </Card>

          <ColabTable rows={filteredDemitidos} loading={loading} isGestor={isGestor}
            onEdit={setEditing} onDelete={handleDelete} mode="demitidos" />
        </TabsContent>
      </Tabs>

      <ColabDialog open={!!editing} onClose={() => setEditing(null)} initial={editing} onSave={handleSaveEdit} title="Editar colaborador" />
      <ColabDialog open={creating} onClose={() => setCreating(false)} initial={null} onSave={handleCreate} title="Novo colaborador" />
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}

function SimpleSelect({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: { v: string; l: string }[]; placeholder?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StatusBadge({ s }: { s: ColabFull["status"] }) {
  const variants: Record<string, string> = {
    Ativo: "bg-success/15 text-success border-success/30",
    Demitido: "bg-destructive/15 text-destructive border-destructive/30",
    Afastado: "bg-warning/15 text-warning-foreground border-warning/30",
    Ferias: "bg-primary/15 text-primary border-primary/30",
  };
  return <Badge variant="outline" className={variants[s]}>{s}</Badge>;
}

function ColabTable({
  rows, loading, isGestor, onEdit, onDelete, mode,
}: {
  rows: ColabFull[]; loading: boolean; isGestor: boolean;
  onEdit: (c: ColabFull) => void; onDelete: (c: ColabFull) => void;
  mode: "ativos" | "demitidos";
}) {
  return (
    <Card className="overflow-hidden">
      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Matrícula</th>
                <th className="text-left p-3">Nome</th>
                <th className="text-left p-3">Sexo</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Cargo</th>
                <th className="text-left p-3">Setor</th>
                <th className="text-left p-3">Subsetor</th>
                <th className="text-left p-3">Liderança</th>
                {mode === "ativos" ? (
                  <>
                    <th className="text-left p-3">Turno</th>
                    <th className="text-left p-3">Sábado</th>
                    <th className="text-left p-3">Tempo</th>
                  </>
                ) : (
                  <>
                    <th className="text-left p-3">Demissão</th>
                    <th className="text-left p-3">Tipo</th>
                  </>
                )}
                <th className="text-right p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{c.matricula}</td>
                  <td className="p-3 font-medium">{c.colaborador}</td>
                  <td className="p-3 text-xs">
                    {c.sexo === "Feminino" ? (
                      <span className="text-pink-600">Feminino</span>
                    ) : c.sexo === "Masculino" ? (
                      <span className="text-blue-600">Masculino</span>
                    ) : "—"}
                  </td>
                  <td className="p-3"><StatusBadge s={c.status} /></td>
                  <td className="p-3">{c.cargo ?? "—"}</td>
                  <td className="p-3">{c.setor ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.subsetor ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.lideranca ?? "—"}</td>
                  {mode === "ativos" ? (
                    <>
                      <td className="p-3 text-xs">{c.turno ?? "—"}</td>
                      <td className="p-3 text-xs">
                        {c.sabado_trabalho === "Sim"
                          ? <Badge className="bg-primary text-primary-foreground">Sim</Badge>
                          : <Badge variant="outline">Não</Badge>}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{tempoDeEmpresa(c.admissao)}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-3 text-xs">{c.data_demissao ?? "—"}</td>
                      <td className="p-3 text-xs">{c.tipo_demissao ?? "—"}</td>
                    </>
                  )}
                  <td className="p-3 text-right">
                    {isGestor && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={mode === "ativos" ? 12 : 11} className="p-8 text-center text-muted-foreground">Nenhum resultado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ColabDialog({
  open, onClose, initial, onSave, title,
}: {
  open: boolean; onClose: () => void; initial: ColabFull | null;
  onSave: (c: Partial<ColabFull>) => Promise<void>; title: string;
}) {
  const [form, setForm] = useState<Partial<ColabFull>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ?? { status: "Ativo" });
  }, [initial, open]);

  const set = <K extends keyof ColabFull>(k: K, v: ColabFull[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matricula || !form.colaborador) return toast.error("Matrícula e nome são obrigatórios");
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const isDemitido = form.status === "Demitido";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Matrícula *"><Input value={form.matricula ?? ""} onChange={(e) => set("matricula", e.target.value)} required /></Field>
            <Field label="Colaborador *"><Input value={form.colaborador ?? ""} onChange={(e) => set("colaborador", e.target.value)} required /></Field>
            <Field label="Sexo">
              <Select value={form.sexo ?? ""} onValueChange={(v) => set("sexo", v as ColabFull["sexo"])}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SEXO_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select value={form.status ?? "Ativo"} onValueChange={(v) => set("status", v as ColabFull["status"])}>
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
            {isDemitido && (
              <>
                <Field label="Data demissão"><Input type="date" value={form.data_demissao ?? ""} onChange={(e) => set("data_demissao", e.target.value)} /></Field>
                <Field label="Tipo de demissão">
                  <Select value={form.tipo_demissao ?? ""} onValueChange={(v) => set("tipo_demissao", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{TIPO_DEMISSAO_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>
            )}
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
