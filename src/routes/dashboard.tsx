import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, UserCheck, UserX, TrendingUp, UserPlus, Briefcase, Clock,
  Building2, Network, ChevronRight, BarChart3, CalendarDays,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  ColabFull, aggregate, contratacoesPorMes, turnoverDoAno, anosDisponiveis,
} from "@/lib/dashboard-helpers";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </RequireAuth>
  ),
});

function Dashboard() {
  const [data, setData] = useState<ColabFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [anoContratacao, setAnoContratacao] = useState<number>(new Date().getFullYear());
  const [anoTurnover, setAnoTurnover] = useState<number>(new Date().getFullYear());
  const [drill, setDrill] = useState<{ title: string; field: string; value: string; people: ColabFull[] } | null>(null);

  const fetchData = async () => {
    const { data } = await supabase.from("colaboradores").select("*");
    setData((data as ColabFull[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // Atualiza automaticamente quando algum colaborador é demitido / editado / criado
    const channel = supabase
      .channel("dashboard-colaboradores")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "colaboradores" },
        () => fetchData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = data.length;
  const ativos = data.filter((c) => c.status === "Ativo").length;
  const afastados = data.filter((c) => c.status === "Afastado" || c.status === "Ferias").length;
  const demitidos = data.filter((c) => c.status === "Demitido").length;
  const ativosOuAfastados = ativos + afastados;

  const homens = data.filter((c) => c.sexo === "Masculino" && c.status !== "Demitido").length;
  const mulheres = data.filter((c) => c.sexo === "Feminino" && c.status !== "Demitido").length;
  const totalSexo = homens + mulheres || 1;
  const pctH = Math.round((homens / totalSexo) * 1000) / 10;
  const pctM = Math.round((mulheres / totalSexo) * 1000) / 10;

  const anos = useMemo(() => anosDisponiveis(data), [data]);
  const turnover = useMemo(() => turnoverDoAno(data, anoTurnover), [data, anoTurnover]);
  const contratacoes = useMemo(() => contratacoesPorMes(data, anoContratacao), [data, anoContratacao]);
  const totalContratado = contratacoes.reduce((s, m) => s + m.contratacoes, 0);
  const picoMensal = Math.max(...contratacoes.map((m) => m.contratacoes), 0);
  const mesesAtivos = contratacoes.filter((m) => m.contratacoes > 0).length;
  const mediaMensal = mesesAtivos ? Math.round((totalContratado / mesesAtivos) * 10) / 10 : 0;

  const ativosArr = data.filter((c) => c.status === "Ativo");
  const bySetor = aggregate(ativosArr, "setor");
  const byTurno = aggregate(ativosArr, "turno");
  const byCargo = aggregate(ativosArr, "cargo");
  const byLideranca = aggregate(ativosArr, "lideranca");
  const byHorarioAlmoco = aggregate(ativosArr, "horario_almoco");

  const turnoverColor =
    turnover.taxa <= 5 ? "text-success" : turnover.taxa <= 15 ? "text-warning" : "text-destructive";
  const turnoverBg =
    turnover.taxa <= 5 ? "bg-success/10" : turnover.taxa <= 15 ? "bg-warning/10" : "bg-destructive/10";

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Indicadores em tempo real de RH</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Total de Colaboradores" value={ativosOuAfastados} sub="Ativos + afastados (sem demitidos)" tone="primary" />
        <Kpi icon={UserCheck} label="Colaboradores Ativos" value={ativos} sub="Trabalhando no sistema" tone="success" />
        <Kpi icon={UserX} label="Colaboradores Afastados" value={afastados} sub="Temporariamente ausentes" tone="warning" />
        <Kpi icon={TrendingUp} label="Turnover" value={`${turnover.taxa}%`} sub={`Taxa de rotatividade ${anoTurnover}`} tone="destructive" />
      </div>

      {/* Distribuição por gênero */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Distribuição por Gênero</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Quantitativo de colaboradores por sexo</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-5 text-center">
            <p className="text-4xl font-bold text-blue-600">{homens}</p>
            <p className="font-semibold mt-1">Homens</p>
            <p className="text-blue-600 text-sm">{pctH}%</p>
          </div>
          <div className="rounded-xl border-2 border-pink-200 bg-pink-50 dark:bg-pink-950/30 p-5 text-center">
            <p className="text-4xl font-bold text-pink-600">{mulheres}</p>
            <p className="font-semibold mt-1">Mulheres</p>
            <p className="text-pink-600 text-sm">{pctM}%</p>
          </div>
          <div className="md:col-span-1 flex flex-col justify-center">
            <p className="text-sm text-muted-foreground mb-2">Proporção do total</p>
            <div className="h-3 rounded-full overflow-hidden flex bg-muted">
              <div className="bg-blue-500" style={{ width: `${pctH}%` }} />
              <div className="bg-pink-500" style={{ width: `${pctM}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs">
              <span className="text-blue-600">Masculino</span>
              <span className="text-pink-600">Feminino</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Contratações por mês */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Contratações por Mês</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Distribuição mensal das contratações em {anoContratacao}</p>
        <div className="flex items-center justify-between mb-4">
          <Select value={String(anoContratacao)} onValueChange={(v) => setAnoContratacao(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <TrendingUp className="h-4 w-4" />
            {totalContratado} contratações em {anoContratacao}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={contratacoes}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="contratacoes" fill="oklch(0.62 0.18 235)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
          <Mini label="Pico mensal" value={picoMensal} />
          <Mini label="Média mensal" value={mediaMensal} />
          <Mini label="Meses ativos" value={mesesAtivos} />
        </div>
      </Card>

      {/* Indicador de Turnover */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Indicador de Turnover</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Taxa de rotatividade calculada com base na média de colaboradores do ano
        </p>
        <Select value={String(anoTurnover)} onValueChange={(v) => setAnoTurnover(Number(v))}>
          <SelectTrigger className="w-32 mb-4"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anos.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="rounded-xl border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4" /> {anoTurnover}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${turnoverBg} ${turnoverColor}`}>
              {turnover.taxa}% Turnover
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-success">+{turnover.admissoes}</p>
              <p className="text-xs text-muted-foreground">Admissões</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-bold text-destructive">-{turnover.demissoes}</p>
              <p className="text-xs text-muted-foreground">Demissões</p>
            </div>
            <div>
              <p className={`text-2xl md:text-3xl font-bold ${turnover.saldo >= 0 ? "text-success" : "text-destructive"}`}>
                {turnover.saldo >= 0 ? "+" : ""}{turnover.saldo}
              </p>
              <p className="text-xs text-muted-foreground">Saldo</p>
            </div>
          </div>
          <div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={turnover.taxa <= 5 ? "bg-success h-full" : turnover.taxa <= 15 ? "bg-warning h-full" : "bg-destructive h-full"}
                style={{ width: `${Math.min(turnover.taxa, 100)}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Taxa calculada: Demissões ÷ Média de colaboradores × 100
            </p>
            <p className={`text-center text-lg font-bold mt-1 ${turnoverColor}`}>{turnover.taxa}% ao ano</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Turnover até 5%: Excelente</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> 5-15%: Aceitável</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Acima de 15%: Atenção</span>
        </div>
      </Card>

      {/* Indicadores Detalhados */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Indicadores Detalhados</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListPanel title="Distribuição por Setor" subtitle="Colaboradores ativos organizados por área" icon={Building2} items={bySetor} />
          <ListPanel title="Distribuição por Turno" subtitle="Organização dos horários de trabalho" icon={Clock} items={byTurno} />
          <ListPanel title="Estrutura de Liderança" subtitle="Hierarquia organizacional" icon={Network} items={byLideranca} />
          <ListPanel title="Distribuição por Cargo" subtitle="Funções e responsabilidades" icon={Briefcase} items={byCargo} />
          <ListPanel title="Horário de Almoço" subtitle="Distribuição dos intervalos" icon={Clock} items={byHorarioAlmoco} />
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumo Geral</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Visão consolidada do quadro</p>
            <div className="space-y-2 text-sm">
              <Row label="Colaboradores ativos + afastados" value={ativosOuAfastados} />
              <Row label="Demitidos (histórico)" value={demitidos} />
              <Row label="Total de setores" value={new Set(ativosArr.map((c) => c.setor).filter(Boolean)).size} />
              <Row label="Total de cargos" value={new Set(ativosArr.map((c) => c.cargo).filter(Boolean)).size} />
              <Row label="Total de líderes" value={byLideranca.length} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string | number; sub: string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const map = {
    primary: "bg-primary/10 text-primary border-primary/20",
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning-foreground border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <Card className={`p-4 border ${map[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl md:text-3xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function ListPanel({
  title, subtitle, icon: Icon, items,
}: {
  title: string; subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { name: string; value: number }[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 6);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>
      <div className="space-y-1">
        {visible.map((it) => (
          <div key={it.name} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 transition">
            <span className="text-sm truncate pr-2">{it.name}</span>
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs min-w-7 text-center">{it.value}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </span>
          </div>
        ))}
        {items.length > 6 && (
          <button onClick={() => setExpanded((v) => !v)} className="w-full text-xs text-primary mt-2 hover:underline">
            {expanded ? "Mostrar menos" : `Ver todos (${items.length})`}
          </button>
        )}
        {items.length === 0 && <p className="text-sm text-muted-foreground p-3">Sem dados</p>}
      </div>
    </Card>
  );
}
