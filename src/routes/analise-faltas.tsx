import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Calendar, DollarSign, TrendingUp, Users as UsersIcon,
  CalendarDays, Briefcase, Info,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/analise-faltas")({
  head: () => ({
    meta: [
      { title: "Análise de Faltas e Custo Oculto — Gestão Filial" },
      { name: "description", content: "Padrões de faltas por dia da semana e estimativa do custo oculto em R$ por colaborador." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppLayout>
        <AnaliseFaltasPage />
      </AppLayout>
    </RequireAuth>
  ),
});

// ---- Configuração de salários por cargo ----
// Salário ÷ 30 dias = custo aproximado de uma falta
const SALARIOS_CARGO: Record<string, number> = {
  "Assistente de Estoque Júnior": 1763.13,
  "Assistente de Estoque Jr": 1763.13,
  "Repositor de Estoque": 1663.10,
  "Repositor": 1663.10,
};
const SALARIO_MEDIO = (1763.13 + 1663.10) / 2; // 1713.115

function salarioDoCargo(cargo: string | null): { valor: number; origem: "exato" | "media" } {
  if (!cargo) return { valor: SALARIO_MEDIO, origem: "media" };
  // tenta match case-insensitive contendo
  const c = cargo.toLowerCase();
  for (const [k, v] of Object.entries(SALARIOS_CARGO)) {
    if (c.includes(k.toLowerCase())) return { valor: v, origem: "exato" };
  }
  return { valor: SALARIO_MEDIO, origem: "media" };
}

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6"];

type Chamada = {
  id: string;
  data: string;
  status: string;
  colaborador_id: string;
};
type Colab = {
  id: string;
  matricula: string;
  colaborador: string;
  cargo: string | null;
  setor: string | null;
  lideranca: string | null;
  status: string;
};

function AnaliseFaltasPage() {
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<"30" | "90" | "180" | "365" | "all">("90");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: ch }, { data: co }] = await Promise.all([
        supabase.from("chamadas").select("id,data,status,colaborador_id").eq("status", "Falta"),
        supabase.from("colaboradores").select("id,matricula,colaborador,cargo,setor,lideranca,status"),
      ]);
      if (!mounted) return;
      setChamadas((ch as Chamada[]) ?? []);
      setColabs((co as Colab[]) ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const colabMap = useMemo(() => {
    const m = new Map<string, Colab>();
    colabs.forEach((c) => m.set(c.id, c));
    return m;
  }, [colabs]);

  const faltasFiltradas = useMemo(() => {
    if (periodo === "all") return chamadas;
    const dias = Number(periodo);
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    return chamadas.filter((c) => new Date(c.data + "T00:00:00") >= limite);
  }, [chamadas, periodo]);

  // ============ PADRÃO DE FALTAS ============
  const porDiaSemana = useMemo(() => {
    const counts = Array(7).fill(0);
    faltasFiltradas.forEach((c) => {
      const d = new Date(c.data + "T00:00:00");
      counts[d.getDay()]++;
    });
    return DIAS_SEMANA.map((dia, i) => ({ dia, faltas: counts[i] }));
  }, [faltasFiltradas]);

  const totalFaltas = faltasFiltradas.length;
  const diaPico = porDiaSemana.reduce((a, b) => (b.faltas > a.faltas ? b : a), porDiaSemana[0]);
  const segunda = porDiaSemana[1].faltas;
  const sexta = porDiaSemana[5].faltas;
  const meioSemana = porDiaSemana[2].faltas + porDiaSemana[3].faltas + porDiaSemana[4].faltas;

  // Comparativo simples
  const pctSegunda = totalFaltas ? Math.round((segunda / totalFaltas) * 100) : 0;
  const pctSexta = totalFaltas ? Math.round((sexta / totalFaltas) * 100) : 0;
  const pctMeio = totalFaltas ? Math.round((meioSemana / totalFaltas) * 100) : 0;

  // Top colaboradores faltantes
  const topFaltantes = useMemo(() => {
    const m = new Map<string, number>();
    faltasFiltradas.forEach((c) => m.set(c.colaborador_id, (m.get(c.colaborador_id) ?? 0) + 1));
    return Array.from(m, ([id, qtd]) => {
      const c = colabMap.get(id);
      return {
        id,
        nome: c?.colaborador ?? "—",
        cargo: c?.cargo ?? "—",
        setor: c?.setor ?? "—",
        qtd,
      };
    })
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 15);
  }, [faltasFiltradas, colabMap]);

  // ============ CUSTO OCULTO ============
  // Custo total por cargo
  const custoPorCargo = useMemo(() => {
    const m = new Map<string, { qtd: number; custo: number }>();
    faltasFiltradas.forEach((c) => {
      const colab = colabMap.get(c.colaborador_id);
      const cargo = colab?.cargo ?? "Sem cargo";
      const { valor } = salarioDoCargo(cargo);
      const custoFalta = valor / 30;
      const atual = m.get(cargo) ?? { qtd: 0, custo: 0 };
      m.set(cargo, { qtd: atual.qtd + 1, custo: atual.custo + custoFalta });
    });
    return Array.from(m, ([cargo, { qtd, custo }]) => ({
      cargo,
      qtd,
      custo: Math.round(custo * 100) / 100,
    })).sort((a, b) => b.custo - a.custo);
  }, [faltasFiltradas, colabMap]);

  const custoTotal = custoPorCargo.reduce((s, c) => s + c.custo, 0);
  const custoAssistente = custoPorCargo
    .filter((c) => c.cargo.toLowerCase().includes("assistente"))
    .reduce((s, c) => s + c.custo, 0);
  const custoRepositor = custoPorCargo
    .filter((c) => c.cargo.toLowerCase().includes("repositor"))
    .reduce((s, c) => s + c.custo, 0);
  const custoOutros = custoTotal - custoAssistente - custoRepositor;
  const custoMedio = totalFaltas ? custoTotal / totalFaltas : 0;

  // Custo individual (top 15)
  const custoIndividual = useMemo(() => {
    return topFaltantes.map((t) => {
      const { valor, origem } = salarioDoCargo(t.cargo);
      const custo = (valor / 30) * t.qtd;
      return { ...t, custo: Math.round(custo * 100) / 100, origem };
    });
  }, [topFaltantes]);

  // Resumo dos 3 grupos para gráfico de pizza de custo
  const custoPie = [
    { name: "Assistentes Estoque", value: Math.round(custoAssistente * 100) / 100 },
    { name: "Repositores", value: Math.round(custoRepositor * 100) / 100 },
    { name: "Outros cargos (média)", value: Math.round(custoOutros * 100) / 100 },
  ].filter((p) => p.value > 0);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando análise...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-warning/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Análise de Faltas</h1>
            <p className="text-muted-foreground text-sm">
              Padrão de comportamento e impacto financeiro das faltas
            </p>
          </div>
        </div>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="180">Últimos 6 meses</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
            <SelectItem value="all">Todo o histórico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Calendar} label="Total de Faltas" value={totalFaltas} sub="No período selecionado" tone="warning" />
        <Kpi icon={CalendarDays} label="Dia de Pico" value={diaPico.dia} sub={`${diaPico.faltas} faltas (${totalFaltas ? Math.round((diaPico.faltas / totalFaltas) * 100) : 0}%)`} tone="destructive" />
        <Kpi icon={DollarSign} label="Custo Oculto Total" value={`R$ ${custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Salário ÷ 30 × faltas" tone="destructive" />
        <Kpi icon={TrendingUp} label="Custo Médio / Falta" value={`R$ ${custoMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Por dia ausente" tone="primary" />
      </div>

      <Tabs defaultValue="padrao">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="padrao" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Padrão de Faltas
          </TabsTrigger>
          <TabsTrigger value="custo" className="gap-2">
            <DollarSign className="h-4 w-4" /> Custo Oculto
          </TabsTrigger>
        </TabsList>

        {/* ============ ABA PADRÃO ============ */}
        <TabsContent value="padrao" className="space-y-4 mt-4">
          {/* Insights rápidos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <InsightCard
              titulo="Falta mais na Segunda?"
              valor={`${segunda} faltas`}
              pct={pctSegunda}
              destaque={segunda >= sexta && segunda >= meioSemana / 3}
            />
            <InsightCard
              titulo="Falta mais na Sexta?"
              valor={`${sexta} faltas`}
              pct={pctSexta}
              destaque={sexta > segunda && sexta >= meioSemana / 3}
            />
            <InsightCard
              titulo="Distribuído no meio da semana?"
              valor={`${meioSemana} faltas`}
              pct={pctMeio}
              destaque={meioSemana / 3 > segunda && meioSemana / 3 > sexta}
            />
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Faltas por Dia da Semana</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Distribuição dos dias com maior incidência de faltas
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porDiaSemana}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <ReTooltip />
                <Bar dataKey="faltas" radius={[6, 6, 0, 0]}>
                  {porDiaSemana.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.faltas === diaPico.faltas && entry.faltas > 0
                          ? "#ef4444"
                          : "#3b82f6"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Diagnóstico:</strong>{" "}
                {totalFaltas === 0
                  ? "Sem faltas registradas no período."
                  : segunda > sexta && segunda > meioSemana / 3
                  ? "Padrão típico de 'segunda-feira difícil' — colaboradores tendem a faltar após o fim de semana. Investigue jornada/clima de início de semana."
                  : sexta > segunda
                  ? "Padrão de 'sexta antecipada' — possível antecipação de fim de semana. Avalie engajamento na sexta-feira."
                  : "Faltas distribuídas — não há viés claro por dia da semana."}
              </p>
            </div>
          </Card>

          {/* Top faltantes */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Colaboradores com Mais Faltas</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Top 15 no período</p>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5 pr-3">
                {topFaltantes.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3">Sem faltas no período.</p>
                )}
                {topFaltantes.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t.cargo} · {t.setor}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold px-3 py-1 rounded-full bg-warning/10 text-warning shrink-0">
                      {t.qtd} {t.qtd === 1 ? "falta" : "faltas"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* ============ ABA CUSTO ============ */}
        <TabsContent value="custo" className="space-y-4 mt-4">
          {/* Resumo por grupo de cargo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CustoCard
              titulo="Assistentes de Estoque"
              salario={1763.13}
              custo={custoAssistente}
              qtd={custoPorCargo
                .filter((c) => c.cargo.toLowerCase().includes("assistente"))
                .reduce((s, c) => s + c.qtd, 0)}
              tone="destructive"
            />
            <CustoCard
              titulo="Repositores"
              salario={1663.10}
              custo={custoRepositor}
              qtd={custoPorCargo
                .filter((c) => c.cargo.toLowerCase().includes("repositor"))
                .reduce((s, c) => s + c.qtd, 0)}
              tone="warning"
            />
            <CustoCard
              titulo="Outros cargos (média)"
              salario={SALARIO_MEDIO}
              custo={custoOutros}
              qtd={custoPorCargo
                .filter((c) => !c.cargo.toLowerCase().includes("assistente") && !c.cargo.toLowerCase().includes("repositor"))
                .reduce((s, c) => s + c.qtd, 0)}
              tone="primary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pizza por grupo */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Distribuição do Custo Oculto</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Em R$ por grupo de cargo
              </p>
              {custoPie.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">
                  Sem custos calculados no período.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={custoPie}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={(e) => `${e.name}: R$ ${e.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                    >
                      {custoPie.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip
                      formatter={(v: number) =>
                        `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Detalhamento por cargo */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Custo por Cargo</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Detalhamento por função</p>
              <ScrollArea className="max-h-[280px]">
                <div className="space-y-1.5 pr-3">
                  {custoPorCargo.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3">Sem dados.</p>
                  )}
                  {custoPorCargo.map((c) => {
                    const { valor, origem } = salarioDoCargo(c.cargo);
                    return (
                      <div
                        key={c.cargo}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border bg-card"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.cargo}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.qtd} faltas · R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/mês{" "}
                            {origem === "media" && <span className="text-warning">(média)</span>}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-destructive shrink-0">
                          R$ {c.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Custo individual */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Custo Oculto por Colaborador</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Top 15 — quanto cada colaborador custou em faltas
            </p>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-1.5 pr-3">
                {custoIndividual.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3">Sem dados.</p>
                )}
                {custoIndividual.map((c, i) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.cargo} · {c.qtd} {c.qtd === 1 ? "falta" : "faltas"}{" "}
                          {c.origem === "media" && (
                            <span className="text-warning">(salário médio)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-destructive shrink-0">
                      R$ {c.custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Metodologia */}
          <Card className="p-5 bg-muted/30">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-semibold">Metodologia de cálculo</p>
                <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Custo por falta = <strong>salário ÷ 30 dias</strong></li>
                  <li>Assistente de Estoque Jr: R$ 1.763,13 → <strong>R$ 58,77/falta</strong></li>
                  <li>Repositor: R$ 1.663,10 → <strong>R$ 55,44/falta</strong></li>
                  <li>Outros cargos: usa média dos dois (R$ {SALARIO_MEDIO.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) → <strong>R$ {(SALARIO_MEDIO / 30).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/falta</strong></li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============ COMPONENTES ============
function Kpi({
  icon: Icon, label, value, sub, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  tone: "primary" | "warning" | "destructive" | "success";
}) {
  const map = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning-foreground border-warning/30",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    success: "bg-success/10 text-success border-success/20",
  };
  return (
    <Card className={`p-4 border ${map[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-xl md:text-2xl font-bold mt-1 truncate">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${map[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function InsightCard({
  titulo, valor, pct, destaque,
}: {
  titulo: string; valor: string; pct: number; destaque: boolean;
}) {
  return (
    <Card className={`p-4 ${destaque ? "border-2 border-warning bg-warning/5" : ""}`}>
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="text-2xl font-bold mt-1">{valor}</p>
      <p className="text-xs mt-1">
        {pct}% do total
        {destaque && <span className="ml-2 text-warning font-semibold">⚠ destaque</span>}
      </p>
    </Card>
  );
}

function CustoCard({
  titulo, salario, custo, qtd, tone,
}: {
  titulo: string; salario: number; custo: number; qtd: number;
  tone: "primary" | "warning" | "destructive";
}) {
  const map = {
    primary: "border-primary/30 bg-primary/5 text-primary",
    warning: "border-warning/30 bg-warning/5 text-warning",
    destructive: "border-destructive/30 bg-destructive/5 text-destructive",
  };
  return (
    <Card className={`p-4 border-2 ${map[tone]}`}>
      <p className="text-sm font-semibold text-foreground">{titulo}</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Salário: R$ {salario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-muted-foreground">
        Custo/falta: R$ {(salario / 30).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
      </p>
      <div className="mt-3 pt-3 border-t border-current/20">
        <p className="text-2xl font-bold">
          R$ {custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground">{qtd} faltas no período</p>
      </div>
    </Card>
  );
}
