import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  UserCheck, RefreshCw, Calendar as CalendarIcon, AlertTriangle, Database, Clock,
  Save, Eraser, Home, X, Heart, Coffee, ShieldAlert, ShieldOff, LayoutGrid,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip as RTooltip } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chamada")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <ChamadaPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Status = "Presente" | "Folga" | "Falta" | "Atestado" | "Ferias" | "Afastado" | "Licenca";

type Colab = {
  id: string;
  matricula: string;
  colaborador: string;
  setor: string | null;
  subsetor: string | null;
  lideranca: string | null;
  turno: string | null;
  sexo: "Masculino" | "Feminino" | null;
  sabado_trabalho: string | null;
};

type Chamada = {
  id: string;
  colaborador_id: string;
  data: string;
  status: Status;
  registrado_por_nome: string | null;
  updated_at: string;
};

const STATUSES: { value: Status; label: string; icon: any; tone: string; bg: string }[] = [
  { value: "Presente", label: "Presente", icon: UserCheck, tone: "text-emerald-600", bg: "bg-emerald-100" },
  { value: "Folga", label: "Folga", icon: Home, tone: "text-orange-600", bg: "bg-orange-100" },
  { value: "Falta", label: "Falta", icon: X, tone: "text-red-600", bg: "bg-red-100" },
  { value: "Atestado", label: "Atestado", icon: Heart, tone: "text-pink-600", bg: "bg-pink-100" },
  { value: "Ferias", label: "Férias", icon: Coffee, tone: "text-purple-600", bg: "bg-purple-100" },
  { value: "Afastado", label: "Afastado", icon: ShieldAlert, tone: "text-yellow-600", bg: "bg-yellow-100" },
  { value: "Licenca", label: "Licença", icon: ShieldOff, tone: "text-teal-600", bg: "bg-teal-100" },
];

function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatBr(d: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatBrLong(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

function formatBrShortDay(d: string) {
  if (!d) return "";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function ChamadaPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("diaria");
  const [data, setData] = useState(todayStr());
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]); // chamadas do dia selecionado
  const [allChamadas, setAllChamadas] = useState<Chamada[]>([]); // últimos 30 dias para pendências/banco
  const [domingos, setDomingos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroLider, setFiltroLider] = useState<string>("__all");
  const [filtroTurno, setFiltroTurno] = useState<string>("__all");
  const [filtroSexo, setFiltroSexo] = useState<string>("__all");
  const [filtroSetor, setFiltroSetor] = useState<string>("__all");
  const [filtroSubsetor, setFiltroSubsetor] = useState<string>("__all");
  const [pending, setPending] = useState<Record<string, Status>>({});
  const [domingoOpen, setDomingoOpen] = useState(false);

  async function load() {
    setLoading(true);
    const [c, ch, de] = await Promise.all([
      supabase.from("colaboradores").select("id,matricula,colaborador,setor,subsetor,lideranca,turno,sexo,sabado_trabalho,status").in("status", ["Ativo", "Afastado"]).order("colaborador"),
      supabase.from("chamadas").select("id,colaborador_id,data,status,registrado_por_nome,updated_at").eq("data", data),
      supabase.from("domingos_especiais").select("data"),
    ]);
    if (!c.error && c.data) setColabs(c.data as any);
    if (!ch.error && ch.data) setChamadas(ch.data as any);
    if (!de.error && de.data) setDomingos((de.data as any[]).map((d) => d.data));
    setLoading(false);
  }

  async function loadHist() {
    // últimos 30 dias para pendências e dashboards mensais
    const start = new Date();
    start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("chamadas")
      .select("id,colaborador_id,data,status,registrado_por_nome,updated_at")
      .gte("data", startStr);
    if (!error && data) setAllChamadas(data as any);
  }

  useEffect(() => {
    load();
    loadHist();
    // eslint-disable-next-line
  }, [data]);

  // Filtra colaboradores ativos. Se for domingo, só mostra se for "Domingo Especial" cadastrado.
  const isDomingo = useMemo(() => {
    const dt = new Date(data + "T00:00:00");
    return dt.getDay() === 0;
  }, [data]);

  const isDomingoEspecial = domingos.includes(data);

  const colabsFiltrados = useMemo(() => {
    let arr = colabs;
    if (filtroLider !== "__all") arr = arr.filter((c) => c.lideranca === filtroLider);
    if (filtroTurno !== "__all") arr = arr.filter((c) => c.turno === filtroTurno);
    if (filtroSexo !== "__all") arr = arr.filter((c) => c.sexo === filtroSexo);
    if (filtroSetor !== "__all") arr = arr.filter((c) => c.setor === filtroSetor);
    if (filtroSubsetor !== "__all") arr = arr.filter((c) => c.subsetor === filtroSubsetor);
    return arr;
  }, [colabs, filtroLider, filtroTurno, filtroSexo, filtroSetor, filtroSubsetor]);

  const liderancas = useMemo(() => Array.from(new Set(colabs.map((c) => c.lideranca).filter(Boolean))) as string[], [colabs]);
  const turnos = useMemo(() => Array.from(new Set(colabs.map((c) => c.turno).filter(Boolean))) as string[], [colabs]);
  const setores = useMemo(() => Array.from(new Set(colabs.map((c) => c.setor).filter(Boolean))) as string[], [colabs]);
  const subsetores = useMemo(() => Array.from(new Set(colabs.map((c) => c.subsetor).filter(Boolean))) as string[], [colabs]);

  const statusByColab = useMemo(() => {
    const m: Record<string, Status> = {};
    chamadas.forEach((c) => (m[c.colaborador_id] = c.status));
    return m;
  }, [chamadas]);

  const getEffectiveStatus = (id: string): Status | null => pending[id] ?? statusByColab[id] ?? null;

  function setStatus(colabId: string, st: Status) {
    setPending((p) => ({ ...p, [colabId]: st }));
  }

  async function salvar() {
    const entries = Object.entries(pending);
    if (entries.length === 0) {
      toast.info("Nada para salvar");
      return;
    }
    const userName = user?.user_metadata?.nome || user?.email || "";
    const rows = entries.map(([colaborador_id, status]) => ({
      colaborador_id,
      data,
      status,
      registrado_por: user?.id ?? null,
      registrado_por_nome: userName,
    }));
    const { error } = await supabase.from("chamadas").upsert(rows, { onConflict: "colaborador_id,data" });
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(`${entries.length} chamada(s) salva(s)`);
    setPending({});
    load();
    loadHist();
  }

  function limpar() {
    setPending({});
  }

  // Indicadores do dia
  const total = colabsFiltrados.length;
  const counts = useMemo(() => {
    const c: Record<Status | "Pendente", number> = {
      Presente: 0, Folga: 0, Falta: 0, Atestado: 0, Ferias: 0, Afastado: 0, Licenca: 0, Pendente: 0,
    };
    colabsFiltrados.forEach((co) => {
      const st = getEffectiveStatus(co.id);
      if (!st) c.Pendente++;
      else c[st]++;
    });
    return c;
    // eslint-disable-next-line
  }, [colabsFiltrados, statusByColab, pending]);

  // Taxa por setor
  const taxaSetor = useMemo(() => {
    const map = new Map<string, { total: number; presentes: number; ausencias: number }>();
    colabsFiltrados.forEach((co) => {
      const s = co.setor || "—";
      const o = map.get(s) ?? { total: 0, presentes: 0, ausencias: 0 };
      o.total++;
      const st = getEffectiveStatus(co.id);
      if (st === "Presente") o.presentes++;
      else if (st === "Falta" || st === "Atestado") o.ausencias++;
      map.set(s, o);
    });
    return Array.from(map, ([setor, v]) => ({
      setor,
      ...v,
      pct: v.total ? Math.round((v.presentes / v.total) * 100) : 0,
      pctAusencia: v.total ? Math.round((v.ausencias / v.total) * 100) : 0,
    })).sort((a, b) => a.setor.localeCompare(b.setor));
    // eslint-disable-next-line
  }, [colabsFiltrados, statusByColab, pending]);

  // Pendências do dia (TOP por liderança)
  const pendentesPorLider = useMemo(() => {
    const map = new Map<string, number>();
    colabsFiltrados.forEach((co) => {
      const st = getEffectiveStatus(co.id);
      if (!st) {
        const k = co.lideranca || "—";
        map.set(k, (map.get(k) ?? 0) + 1);
      }
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    // eslint-disable-next-line
  }, [colabsFiltrados, statusByColab, pending]);

  // Datas com pendências (últimos 30 dias úteis)
  const datasComPendencias = useMemo(() => {
    const ativos = colabs.length || 0;
    const byDate = new Map<string, number>();
    allChamadas.forEach((c) => {
      byDate.set(c.data, (byDate.get(c.data) ?? 0) + 1);
    });
    // gerar últimos 30 dias e filtrar dias úteis (seg-sab) + domingos especiais
    const arr: { data: string; preenchidos: number; total: number; pct: number; faltam: number }[] = [];
    const hoje = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const dow = d.getDay();
      const valido = dow !== 0 || domingos.includes(ds);
      if (!valido) continue;
      const preenchidos = byDate.get(ds) ?? 0;
      if (preenchidos >= ativos) continue; // dia completo, não é pendência
      arr.push({
        data: ds,
        preenchidos,
        total: ativos,
        pct: ativos ? Math.round((preenchidos / ativos) * 100) : 0,
        faltam: ativos - preenchidos,
      });
    }
    return arr.sort((a, b) => (a.data < b.data ? 1 : -1));
  }, [allChamadas, colabs.length, domingos]);

  // Pendências do mês (top líderes com mais ausências de registro no mês corrente)
  const pendentesMes = useMemo(() => {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioStr = inicioMes.toISOString().slice(0, 10);
    const ativos = colabs;
    // contagem total de "slots" não preenchidos por liderança
    const map = new Map<string, number>();
    // gerar dias úteis do mês até hoje
    const dias: string[] = [];
    const hoje = new Date();
    for (let d = new Date(inicioMes); d <= hoje; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const dow = new Date(ds + "T00:00:00").getDay();
      if (dow === 0 && !domingos.includes(ds)) continue;
      dias.push(ds);
    }
    const setMar = new Map<string, Set<string>>(); // data -> set de colabs com chamada
    allChamadas.forEach((c) => {
      if (c.data < inicioStr) return;
      const s = setMar.get(c.data) ?? new Set();
      s.add(c.colaborador_id);
      setMar.set(c.data, s);
    });
    dias.forEach((ds) => {
      const presentSet = setMar.get(ds) ?? new Set();
      ativos.forEach((co) => {
        if (!presentSet.has(co.id)) {
          const k = co.lideranca || "—";
          map.set(k, (map.get(k) ?? 0) + 1);
        }
      });
    });
    return Array.from(map, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [allChamadas, colabs, domingos]);

  function corPct(pct: number) {
    if (pct >= 95) return "bg-emerald-500";
    if (pct >= 80) return "bg-yellow-500";
    return "bg-red-500";
  }

  function badgePct(pct: number) {
    if (pct >= 95) return "bg-emerald-100 text-emerald-700 border-emerald-300";
    if (pct >= 80) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    return "bg-red-100 text-red-700 border-red-300";
  }

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)]">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <Link to="/inicio">
            <Button variant="outline" size="sm" className="gap-2">
              <LayoutGrid className="h-4 w-4" /> Menu
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-xl font-bold">Chamada</h1>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Hero + Domingo Especial + atualizar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Controle de Chamadas</h2>
              <p className="text-sm text-muted-foreground">Gerencie a presença dos colaboradores</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Card className="px-4 py-3 flex items-center gap-3">
              <div>
                <p className="text-sm font-semibold">Domingo Especial</p>
                <div className="flex items-center gap-2 mt-1">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setDomingoOpen((v) => !v)}
                  >
                    {isDomingoEspecial ? "Ativo" : "Selecionar"}
                  </button>
                </div>
              </div>
              <Badge variant={isDomingoEspecial ? "default" : "outline"}>
                {isDomingoEspecial ? "Ativo" : "Inativo"}
              </Badge>
            </Card>
            <Button variant="outline" onClick={() => { load(); loadHist(); }} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Atualizar Lista
            </Button>
          </div>
        </div>

        {domingoOpen && (
          <DomingoEspecialPanel
            domingos={domingos}
            onChange={() => { load(); loadHist(); }}
          />
        )}

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full bg-muted/40 p-1">
            <TabsTrigger value="diaria" className="gap-2">
              <UserCheck className="h-4 w-4" /> Chamada Diária
            </TabsTrigger>
            <TabsTrigger value="banco" className="gap-2">
              <Database className="h-4 w-4" /> Banco de Chamadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diaria" className="space-y-6 mt-6">
            {/* Pendências do dia + Datas com pendências */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Pendências do Dia ({formatBr(data).slice(0, 5)})</h3>
                </div>
                {pendentesPorLider.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma pendência 🎉</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, pendentesPorLider.length * 38)}>
                    <BarChart data={pendentesPorLider} layout="vertical" margin={{ left: 80 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <RTooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12 }}>
                        {pendentesPorLider.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : "#eab308"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h3 className="font-bold text-lg">Datas com Pendências</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {datasComPendencias.length} data(s) com registros incompletos
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={loadHist}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {datasComPendencias.slice(0, 12).map((d) => (
                    <button
                      key={d.data}
                      onClick={() => setData(d.data)}
                      className="w-full flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div>
                        <p className="font-semibold">{formatBrShortDay(d.data)}</p>
                        <p className="text-xs text-muted-foreground">{d.preenchidos}/{d.total} registros</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("border", badgePct(d.pct))}>Faltam {d.faltam}</Badge>
                        <span className="text-sm font-semibold w-10 text-right">{d.pct}%</span>
                      </div>
                    </button>
                  ))}
                  {datasComPendencias.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma data pendente 👏</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Pendências do Mês */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Pendências do Mês ({new Date().toLocaleDateString("pt-BR", { month: "long" })})</h3>
              </div>
              {pendentesMes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma pendência este mês</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, pendentesMes.length * 40)}>
                  <BarChart data={pendentesMes} layout="vertical" margin={{ left: 80 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <RTooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12 }}>
                      {pendentesMes.map((_, i) => (
                        <Cell key={i} fill={i < 2 ? "#ef4444" : i < 4 ? "#f97316" : "#eab308"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Filtros */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="h-5 w-5" />
                <h3 className="font-bold text-lg">Data da Chamada e Filtros</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Selecione a Data</Label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1.5" />
                  <p className="text-xs text-muted-foreground mt-1">{formatBrLong(data)}</p>
                </div>
                <div>
                  <Label>Filtrar por Liderança</Label>
                  <Select value={filtroLider} onValueChange={setFiltroLider}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todas as lideranças" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todas as lideranças</SelectItem>
                      {liderancas.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Turno</Label>
                  <Select value={filtroTurno} onValueChange={setFiltroTurno}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos os turnos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos os turnos</SelectItem>
                      {turnos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Sexo</Label>
                  <Select value={filtroSexo} onValueChange={setFiltroSexo}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos</SelectItem>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Setor</Label>
                  <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos os setores" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos os setores</SelectItem>
                      {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Filtrar por Subsetor</Label>
                  <Select value={filtroSubsetor} onValueChange={setFiltroSubsetor}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Todos os subsetores" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all">Todos os subsetores</SelectItem>
                      {subsetores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{total} colaboradores</span>
                {isDomingo && !isDomingoEspecial && (
                  <Badge variant="outline" className="ml-2">Domingo — sem expediente</Badge>
                )}
              </div>
            </Card>

            {/* Pendências (alerta) */}
            {counts.Pendente > 0 && (
              <Card className="p-4 border-orange-300 bg-orange-50/60">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <h3 className="font-bold text-orange-700">Pendências da Chamada</h3>
                </div>
                <p className="text-sm text-orange-700/80 mt-1">
                  {counts.Pendente} colaborador(es) ainda não tiveram presença registrada
                </p>
              </Card>
            )}

            {/* Indicadores do dia */}
            <Card className="p-5">
              <h3 className="text-xl font-bold">Indicadores do Dia</h3>
              <p className="text-sm text-muted-foreground mb-4">Resumo quantitativo da chamada do dia {formatBr(data)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <CardIndicador icon={Clock} bg="bg-slate-100" tone="text-slate-600" label="Pendentes" sub={`de ${total}`} value={counts.Pendente} />
                {STATUSES.map((s) => (
                  <CardIndicador
                    key={s.value}
                    icon={s.icon}
                    bg={s.bg}
                    tone={s.tone}
                    label={s.label}
                    sub={`${counts[s.value]}/${total}`}
                    value={counts[s.value]}
                  />
                ))}
              </div>

              <p className="text-xs font-semibold tracking-wider text-muted-foreground mt-6 mb-3">TAXA POR SETOR</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {taxaSetor.map((s) => (
                  <Card key={s.setor} className="p-4">
                    <p className="font-semibold mb-2">{s.setor}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={s.pct} className={cn("h-2 flex-1", s.pct >= 80 ? "" : "")} />
                      <span className={cn("font-bold", s.pct >= 80 ? "text-emerald-600" : s.pct >= 50 ? "text-yellow-600" : "text-red-600")}>{s.pct}%</span>
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-muted-foreground">
                      <span>{s.presentes}/{s.total} presentes</span>
                      <span className={cn(s.ausencias > 0 ? "text-red-500" : "")}>{s.ausencias} ausências ({s.total ? Math.round((s.ausencias / s.total) * 100) : 0}%)</span>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>

            {/* Lista de Chamada */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xl font-bold">Lista de Chamada</h3>
                  <p className="text-sm text-muted-foreground">Clique nos botões para marcar a presença de cada colaborador</p>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <Button onClick={salvar} className="gap-2" disabled={Object.keys(pending).length === 0}>
                  <Save className="h-4 w-4" /> Salvar Chamada
                </Button>
                <Button variant="outline" onClick={limpar} className="gap-2">
                  <Eraser className="h-4 w-4" /> Limpar Seleções
                </Button>
                {Object.keys(pending).length > 0 && (
                  <Badge variant="outline" className="self-center">{Object.keys(pending).length} pendente(s) p/ salvar</Badge>
                )}
              </div>

              <div className="space-y-2">
                {colabsFiltrados.map((co) => {
                  const st = getEffectiveStatus(co.id);
                  return (
                    <div
                      key={co.id}
                      className="rounded-lg border p-3 flex flex-col lg:flex-row lg:items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{co.colaborador}</p>
                        <p className="text-xs text-muted-foreground">
                          Matrícula: {co.matricula} • {co.setor || "—"}
                        </p>
                        {st && (
                          <Badge
                            className={cn("mt-1.5 text-xs", STATUSES.find(s => s.value === st)?.bg, STATUSES.find(s => s.value === st)?.tone, "border-transparent")}
                          >
                            {STATUSES.find(s => s.value === st)?.icon && (() => {
                              const Icon = STATUSES.find(s => s.value === st)!.icon;
                              return <Icon className="h-3 w-3 mr-1" />;
                            })()}
                            {STATUSES.find(s => s.value === st)?.label}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map((s) => {
                          const active = st === s.value;
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.value}
                              onClick={() => setStatus(co.id, s.value)}
                              className={cn(
                                "px-3 py-2 rounded-md text-sm font-medium border flex items-center gap-1.5 transition-all",
                                active
                                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                  : "bg-background hover:bg-muted border-border text-foreground/80"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {colabsFiltrados.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado com os filtros atuais</p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="banco" className="mt-6">
            <BancoChamadas allChamadas={allChamadas} colabs={colabs} domingos={domingos} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CardIndicador({
  icon: Icon, bg, tone, label, sub, value,
}: { icon: any; bg: string; tone: string; label: string; sub: string; value: number }) {
  return (
    <Card className="p-3 flex flex-col items-center text-center">
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-2", bg)}>
        <Icon className={cn("h-5 w-5", tone)} />
      </div>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <p className="text-xs font-medium mt-1">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </Card>
  );
}

function DomingoEspecialPanel({ domingos, onChange }: { domingos: string[]; onChange: () => void }) {
  const { user } = useAuth();
  const [novo, setNovo] = useState("");
  const [desc, setDesc] = useState("");

  async function add() {
    if (!novo) return;
    const dt = new Date(novo + "T00:00:00");
    if (dt.getDay() !== 0) {
      toast.error("A data selecionada não é um domingo");
      return;
    }
    const { error } = await supabase.from("domingos_especiais").insert({
      data: novo, descricao: desc || null, created_by: user?.id ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Domingo especial cadastrado");
    setNovo(""); setDesc(""); onChange();
  }

  async function remove(d: string) {
    const { error } = await supabase.from("domingos_especiais").delete().eq("data", d);
    if (error) { toast.error(error.message); return; }
    onChange();
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Domingos Especiais (dias úteis)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <Input type="date" value={novo} onChange={(e) => setNovo(e.target.value)} />
        <Input placeholder="Descrição (opcional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Button onClick={add}>Cadastrar</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {domingos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum domingo especial cadastrado.</p>}
        {domingos.sort().map((d) => (
          <Badge key={d} variant="outline" className="gap-2 py-1.5">
            {formatBr(d)}
            <button onClick={() => remove(d)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
    </Card>
  );
}

function BancoChamadas({ allChamadas, colabs, domingos }: { allChamadas: Chamada[]; colabs: Colab[]; domingos: string[] }) {
  const colabMap = useMemo(() => new Map(colabs.map((c) => [c.id, c])), [colabs]);
  const datas = useMemo(() => {
    const set = new Set(allChamadas.map((c) => c.data));
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [allChamadas]);

  const [filtro, setFiltro] = useState<string>("__all");

  const linhas = useMemo(() => {
    let arr = [...allChamadas];
    if (filtro !== "__all") arr = arr.filter((c) => c.data === filtro);
    return arr.sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
  }, [allChamadas, filtro]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Database className="h-5 w-5" />
        <h3 className="text-xl font-bold">Banco de Chamadas</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Histórico de registros (últimos 30 dias)</p>
      <div className="mb-4 max-w-xs">
        <Label>Filtrar por data</Label>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Todas as datas</SelectItem>
            {datas.map((d) => <SelectItem key={d} value={d}>{formatBr(d)} {domingos.includes(d) ? "(domingo especial)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Colaborador</th>
              <th className="text-left p-3">Setor</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const co = colabMap.get(l.colaborador_id);
              const s = STATUSES.find((x) => x.value === l.status);
              return (
                <tr key={l.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{formatBr(l.data)}</td>
                  <td className="p-3">{co?.colaborador || "—"}</td>
                  <td className="p-3">{co?.setor || "—"}</td>
                  <td className="p-3">
                    {s && <Badge className={cn(s.bg, s.tone, "border-transparent")}>{s.label}</Badge>}
                  </td>
                  <td className="p-3 text-muted-foreground">{l.registrado_por_nome || "—"}</td>
                </tr>
              );
            })}
            {linhas.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
