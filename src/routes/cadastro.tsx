import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Loader2, Filter, Users, UserX, Download, RotateCcw, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { ColabFull, tempoDeEmpresa, tempoExperiencia } from "@/lib/dashboard-helpers";
import { DemissaoDialog, DemissaoData } from "@/components/DemissaoDialog";
import { Clock } from "lucide-react";
import { useReadOnlyGuard, ReadOnlyBanner } from "@/components/BloqueioAcesso";

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
  "horario_almoco", "horario_cafe", "admissao", "sexo", "data_nascimento", "data_demissao", "tipo_demissao",
  "cidade", "bairro", "tem_filho",
];
const FIELD_LABELS: Record<string, string> = {
  matricula: "Matrícula", colaborador: "Colaborador", status: "Status",
  cargo: "Cargo", setor: "Setor", subsetor: "Subsetor", lideranca: "Liderança",
  turno: "Turno", sabado_trabalho: "Sábado Trabalho", sabado_horario: "Sábado Horário",
  horario_almoco: "Horário Almoço", horario_cafe: "Horário Café", admissao: "Admissão",
  sexo: "Sexo", data_nascimento: "Data Nascimento", data_demissao: "Data Demissão", tipo_demissao: "Tipo Demissão",
  cidade: "Cidade", bairro: "Bairro", tem_filho: "Tem filho",
};

function CadastroPage() {
  const { user, isGestor } = useAuth();
  const { empresaAtual } = useEmpresa();
  const [list, setList] = useState<ColabFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("ativos");
  const [editing, setEditing] = useState<ColabFull | null>(null);
  const [creating, setCreating] = useState(false);
  const [demitindo, setDemitindo] = useState<ColabFull | null>(null);

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
    if (!empresaAtual) { setList([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("colaboradores").select("*").eq("empresa_id", empresaAtual.id).order("colaborador");
    if (error) toast.error(error.message);
    setList((data as ColabFull[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaAtual?.id]);

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
    const { error } = await supabase.from("colaboradores").update(updated as never).eq("id", editing.id);
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
    if (!confirm(`Excluir permanentemente ${c.colaborador}?`)) return;
    const { error } = await supabase.from("colaboradores").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const handleDemitir = async (c: ColabFull, info: DemissaoData) => {
    if (!user) return;
    const { error } = await supabase
      .from("colaboradores")
      .update({
        status: "Demitido",
        data_demissao: info.data_demissao,
        tipo_demissao: info.tipo_demissao,
      } as never)
      .eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("movimentacoes").insert({
      colaborador_id: c.id, matricula: c.matricula, colaborador_nome: c.colaborador,
      campo: "Demissão", valor_anterior: c.status,
      valor_novo: `${info.tipo_demissao} em ${info.data_demissao}`,
      tipo: "demissao", user_id: user.id, user_nome: user.email ?? null,
    });
    toast.success("Colaborador demitido");
    load();
  };

  const exportCsv = (rows: ColabFull[], filename: string) => {
    const cols = ["matricula", "colaborador", "sexo", "status", "cargo", "setor", "subsetor", "lideranca", "turno", "sabado_trabalho", "sabado_horario", "horario_almoco", "horario_cafe", "admissao", "data_nascimento", "cidade", "bairro", "tem_filho", "data_demissao", "tipo_demissao"];
    const head = cols.join(";");
    const body = rows.map((r) => cols.map((c) => `"${(r as Record<string, unknown>)[c] ?? ""}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const { guard, dialog: bloqueioDialog } = useReadOnlyGuard(
    isGestor,
    "Criar, editar ou excluir colaboradores",
  );

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      {bloqueioDialog}
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
        <Button
          onClick={() => {
            if (guard("Cadastrar um novo colaborador")) setCreating(true);
          }}
          className="bg-[image:var(--gradient-primary)]"
        >
          <Plus className="h-4 w-4 mr-2" /> Novo colaborador
        </Button>
      </div>

      {!isGestor && <ReadOnlyBanner />}

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

          <ColabTable rows={filteredAtivos} loading={loading} isGestor={isGestor} guard={guard}
            onEdit={setEditing} onDelete={handleDelete} onDemitir={setDemitindo} mode="ativos" />
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

          <ColabTable rows={filteredDemitidos} loading={loading} isGestor={isGestor} guard={guard}
            onEdit={setEditing} onDelete={handleDelete} mode="demitidos" />
        </TabsContent>
      </Tabs>

      <ColabDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        initial={editing}
        onSave={handleSaveEdit}
        title="Editar colaborador"
        allColabs={list}
        onDemitirClick={(c) => { setEditing(null); setDemitindo(c); }}
      />
      <ColabDialog open={creating} onClose={() => setCreating(false)} initial={null} onSave={handleCreate} title="Novo colaborador" allColabs={list} />
      <DemissaoDialog
        open={!!demitindo}
        onClose={() => setDemitindo(null)}
        colaboradorNome={demitindo?.colaborador ?? ""}
        onConfirm={async (info) => { if (demitindo) await handleDemitir(demitindo, info); }}
      />
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
    Ativo: "bg-status-active text-status-active-fg border-transparent",
    Demitido: "bg-status-inactive text-status-inactive-fg border-transparent",
    Afastado: "bg-status-warning text-status-warning-fg border-transparent",
    Ferias: "bg-status-info text-status-info-fg border-transparent",
  };
  return <Badge variant="outline" className={`${variants[s]} rounded-full px-2.5 py-0.5 font-medium`}>{s}</Badge>;
}

function ColabTable({
  rows, loading, isGestor, guard, onEdit, onDelete, onDemitir, mode,
}: {
  rows: ColabFull[]; loading: boolean; isGestor: boolean;
  guard: (acao?: string) => boolean;
  onEdit: (c: ColabFull) => void;
  onDelete: (c: ColabFull) => void;
  onDemitir?: (c: ColabFull) => void;
  mode: "ativos" | "demitidos";
}) {
  return (
    <Card className="overflow-hidden">
      {loading ? (
        <div className="p-8 text-center"><Loader2 className="h-5 w-5 animate-spin inline" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed lg:table-auto min-w-[720px]">
            <thead className="bg-muted/50 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2 w-[70px]">Mat.</th>
                <th className="text-left p-2">Colaborador</th>
                <th className="text-left p-2 hidden md:table-cell w-[90px]">Sexo</th>
                <th className="text-left p-2 w-[90px]">Status</th>
                <th className="text-left p-2 hidden lg:table-cell">Cargo</th>
                <th className="text-left p-2 hidden md:table-cell">Setor</th>
                <th className="text-left p-2 hidden xl:table-cell">Liderança</th>
                {mode === "ativos" ? (
                  <>
                    <th className="text-left p-2 hidden xl:table-cell w-[110px]">Turno</th>
                    <th className="text-left p-2 hidden lg:table-cell w-[70px]">Sáb.</th>
                    <th className="text-left p-2 hidden lg:table-cell w-[100px]">Admissão</th>
                    <th className="text-left p-2 hidden xl:table-cell w-[140px]">Tempo</th>
                  </>
                ) : (
                  <>
                    <th className="text-left p-2 hidden md:table-cell w-[100px]">Demissão</th>
                    <th className="text-left p-2 hidden lg:table-cell">Tipo</th>
                  </>
                )}
                <th className="text-right p-2 w-[90px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/30 align-top">
                  <td className="p-2 font-mono text-xs">{c.matricula}</td>
                  <td className="p-2">
                    <div className="font-medium leading-tight">{c.colaborador}</div>
                    <div className="md:hidden text-[11px] text-muted-foreground mt-0.5 truncate">
                      {[c.cargo, c.setor].filter(Boolean).join(" • ") || "—"}
                    </div>
                  </td>
                  <td className="p-2 text-xs hidden md:table-cell">
                    {c.sexo === "Feminino" ? (
                      <span className="text-pink-600">Feminino</span>
                    ) : c.sexo === "Masculino" ? (
                      <span className="text-blue-600">Masculino</span>
                    ) : "—"}
                  </td>
                  <td className="p-2"><StatusBadge s={c.status} /></td>
                  <td className="p-2 hidden lg:table-cell text-sm truncate max-w-[180px]">{c.cargo ?? "—"}</td>
                  <td className="p-2 hidden md:table-cell text-sm truncate max-w-[160px]">{c.setor ?? "—"}</td>
                  <td className="p-2 hidden xl:table-cell text-muted-foreground truncate max-w-[160px]">{c.lideranca ?? "—"}</td>
                  {mode === "ativos" ? (
                    <>
                      <td className="p-2 text-xs hidden xl:table-cell">{c.turno ?? "—"}</td>
                      <td className="p-2 text-xs hidden lg:table-cell">
                        {c.sabado_trabalho === "Sim"
                          ? <Badge className="bg-primary text-primary-foreground">Sim</Badge>
                          : <Badge variant="outline">Não</Badge>}
                      </td>
                      <td className="p-2 text-xs hidden lg:table-cell whitespace-nowrap">
                        {c.admissao ? new Date(c.admissao).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-2 text-xs hidden xl:table-cell">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {tempoDeEmpresa(c.admissao)}
                          </div>
                          {(() => {
                            const t = tempoExperiencia(c.admissao);
                            const cls = t.tone === "experiente"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-blue-100 text-blue-700 border-blue-200";
                            return (
                              <Badge variant="outline" className={`${cls} w-fit`}>{t.label}</Badge>
                            );
                          })()}
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-xs hidden md:table-cell whitespace-nowrap">
                        {c.data_demissao ? new Date(c.data_demissao).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="p-2 text-xs hidden lg:table-cell truncate max-w-[160px]">{c.tipo_demissao ?? "—"}</td>
                    </>
                  )}
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon" variant="ghost"
                        onClick={() => { if (guard("Editar colaborador")) onEdit(c); }}
                        title={isGestor ? "Editar" : "Somente visualização"}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {mode === "ativos" && onDemitir && (
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => { if (guard("Demitir colaborador")) onDemitir(c); }}
                          title={isGestor ? "Demitir" : "Somente visualização"}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                      {mode === "demitidos" && (
                        <Button
                          size="icon" variant="ghost"
                          onClick={() => { if (guard("Excluir registro permanentemente")) onDelete(c); }}
                          title={isGestor ? "Excluir permanente" : "Somente visualização"}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={mode === "ativos" ? 12 : 10} className="p-8 text-center text-muted-foreground">Nenhum resultado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ColabDialog({
  open, onClose, initial, onSave, title, allColabs, onDemitirClick,
}: {
  open: boolean; onClose: () => void; initial: ColabFull | null;
  onSave: (c: Partial<ColabFull>) => Promise<void>; title: string;
  allColabs: ColabFull[];
  onDemitirClick?: (c: ColabFull) => void;
}) {
  const [form, setForm] = useState<Partial<ColabFull>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ?? { status: "Ativo", sabado_trabalho: "Não" });
  }, [initial, open]);

  const set = <K extends keyof ColabFull>(k: K, v: ColabFull[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Sugestões dinâmicas a partir dos dados existentes
  const sugestoes = useMemo(() => {
    const uniq = (k: keyof ColabFull) =>
      Array.from(new Set(allColabs.map((c) => c[k]).filter(Boolean) as string[])).sort();
    return {
      cargos: uniq("cargo"),
      setores: uniq("setor"),
      subsetores: uniq("subsetor"),
      liderancas: uniq("lideranca"),
      turnos: uniq("turno"),
      almocos: uniq("horario_almoco"),
      cafes: uniq("horario_cafe"),
      sabadoHorarios: uniq("sabado_horario"),
    };
  }, [allColabs]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.matricula || !form.colaborador) return toast.error("Matrícula e nome são obrigatórios");
    if (!form.sexo) return toast.error("Selecione o sexo");
    if (!form.status) return toast.error("Selecione o status");
    // Campos obrigatórios apenas no cadastro de NOVO colaborador
    if (!initial) {
      if (!form.data_nascimento) return toast.error("Informe a data de nascimento");
      if (!form.cidade?.trim()) return toast.error("Informe a cidade");
      if (!form.bairro?.trim()) return toast.error("Informe o bairro");
      if (!form.lideranca?.trim()) return toast.error("Informe o gestor (liderança)");
      if (!form.turno?.trim()) return toast.error("Informe o horário (turno)");
    }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const isDemitido = form.status === "Demitido";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Preencha as informações básicas do colaborador. Os campos sugerem opções existentes para manter consistência.
          </p>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Matrícula *">
              <Input value={form.matricula ?? ""} onChange={(e) => set("matricula", e.target.value)} placeholder="Ex: 12345" required />
            </Field>
            <Field label="Nome do Colaborador *">
              <Input value={form.colaborador ?? ""} onChange={(e) => set("colaborador", e.target.value)} placeholder="Ex: João Silva" required />
            </Field>
            <Field label="Sexo *">
              <Select value={form.sexo ?? ""} onValueChange={(v) => set("sexo", v as ColabFull["sexo"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o sexo" /></SelectTrigger>
                <SelectContent>{SEXO_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Status *">
              <Select value={form.status ?? "Ativo"} onValueChange={(v) => set("status", v as ColabFull["status"])}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>{STATUS_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Setor *">
              <ComboInput value={form.setor ?? ""} onChange={(v) => set("setor", v)} options={sugestoes.setores} placeholder="Selecione o setor" />
            </Field>
            <Field label="Subsetor (opcional)">
              <ComboInput value={form.subsetor ?? ""} onChange={(v) => set("subsetor", v)} options={sugestoes.subsetores} placeholder="Selecione o subsetor" />
            </Field>
            <Field label="Liderança *">
              <ComboInput value={form.lideranca ?? ""} onChange={(v) => set("lideranca", v)} options={sugestoes.liderancas} placeholder="Selecione a liderança" />
            </Field>
            <Field label="Cargo *">
              <ComboInput value={form.cargo ?? ""} onChange={(v) => set("cargo", v)} options={sugestoes.cargos} placeholder="Selecione o cargo" />
            </Field>
            <Field label="Turno *">
              <ComboInput value={form.turno ?? ""} onChange={(v) => set("turno", v)} options={sugestoes.turnos} placeholder="Ex: 08:00 - 17:15" />
            </Field>
            <Field label="Sábado trabalho *">
              <Select value={form.sabado_trabalho ?? ""} onValueChange={(v) => set("sabado_trabalho", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
              </Select>
            </Field>
            {form.sabado_trabalho === "Sim" && (
              <Field label="Horário sábado">
                <ComboInput value={form.sabado_horario ?? ""} onChange={(v) => set("sabado_horario", v)} options={sugestoes.sabadoHorarios} placeholder="Ex: 07:00 - 12:00" />
              </Field>
            )}
            <Field label="Horário almoço *">
              <ComboInput value={form.horario_almoco ?? ""} onChange={(v) => set("horario_almoco", v)} options={sugestoes.almocos} placeholder="Selecione o horário" />
            </Field>
            <Field label="Horário café *">
              <ComboInput value={form.horario_cafe ?? ""} onChange={(v) => set("horario_cafe", v)} options={sugestoes.cafes} placeholder="Selecione o horário" />
            </Field>
            <Field label="Admissão *">
              <Input type="date" value={form.admissao ?? ""} onChange={(e) => set("admissao", e.target.value)} />
            </Field>
            <Field label="Data de nascimento">
              <Input type="date" value={form.data_nascimento ?? ""} onChange={(e) => set("data_nascimento", e.target.value || null as any)} />
            </Field>
            <Field label="Cidade (geolocalização)">
              <Input value={form.cidade ?? ""} onChange={(e) => set("cidade", e.target.value || null as any)} placeholder="Ex: Cariacica" />
            </Field>
            <Field label="Bairro (geolocalização)">
              <Input value={form.bairro ?? ""} onChange={(e) => set("bairro", e.target.value || null as any)} placeholder="Ex: Campo Grande" />
            </Field>
            <Field label="Tem filho?">
              <Select value={form.tem_filho ?? "__none"} onValueChange={(v) => set("tem_filho", v === "__none" ? null as any : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Não informado —</SelectItem>
                  <SelectItem value="Sim">Sim</SelectItem>
                  <SelectItem value="Não">Não</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {isDemitido && (
              <>
                <Field label="Data demissão">
                  <Input type="date" value={form.data_demissao ?? ""} onChange={(e) => set("data_demissao", e.target.value)} />
                </Field>
                <Field label="Tipo de demissão">
                  <Select value={form.tipo_demissao ?? ""} onValueChange={(v) => set("tipo_demissao", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{TIPO_DEMISSAO_OPTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 flex-wrap sm:justify-between">
            <div>
              {initial && initial.status !== "Demitido" && onDemitirClick && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDemitirClick(initial)}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4" /> Demitir colaborador
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[image:var(--gradient-primary)]">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : initial ? "Salvar alterações" : "Salvar Colaborador"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComboInput({
  value, onChange, options, placeholder,
}: {
  value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  // Se há sugestões, usa Select; senão, Input livre.
  if (options.length > 0) {
    const has = value && !options.includes(value);
    return (
      <Select value={value || "__none"} onValueChange={(v) => onChange(v === "__none" ? "" : v)}>
        <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value="__none">— Nenhum —</SelectItem>
          {has && <SelectItem value={value}>{value}</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
