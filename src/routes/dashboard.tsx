import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, UserX, Building2, Briefcase, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Dashboard />
      </AppLayout>
    </RequireAuth>
  ),
});

type Colab = {
  status: string;
  setor: string | null;
  cargo: string | null;
  turno: string | null;
};

const COLORS = ["hsl(220 70% 55%)", "hsl(150 60% 50%)", "hsl(30 90% 60%)", "hsl(0 70% 60%)", "hsl(270 60% 60%)"];

function Dashboard() {
  const [data, setData] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("colaboradores")
      .select("status,setor,cargo,turno")
      .then(({ data }) => {
        setData((data as Colab[]) ?? []);
        setLoading(false);
      });
  }, []);

  const total = data.length;
  const ativos = data.filter((c) => c.status === "Ativo").length;
  const demitidos = data.filter((c) => c.status === "Demitido").length;
  const setoresUniq = new Set(data.filter((c) => c.setor).map((c) => c.setor!)).size;
  const cargosUniq = new Set(data.filter((c) => c.cargo).map((c) => c.cargo!)).size;
  const turnosUniq = new Set(data.filter((c) => c.turno).map((c) => c.turno!)).size;

  const bySetor = aggregate(data.filter((c) => c.status === "Ativo"), "setor", 8);
  const byTurno = aggregate(data.filter((c) => c.status === "Ativo"), "turno", 6);
  const byCargo = aggregate(data.filter((c) => c.status === "Ativo"), "cargo", 6);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Visão geral dos colaboradores</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={Users} label="Total" value={total} color="primary" />
        <Kpi icon={UserCheck} label="Ativos" value={ativos} color="success" />
        <Kpi icon={UserX} label="Demitidos" value={demitidos} color="destructive" />
        <Kpi icon={Building2} label="Setores" value={setoresUniq} color="primary" />
        <Kpi icon={Briefcase} label="Cargos" value={cargosUniq} color="primary" />
        <Kpi icon={Clock} label="Turnos" value={turnosUniq} color="primary" />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-semibold mb-4">Colaboradores ativos por setor</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bySetor} margin={{ left: 0, right: 8, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.62 0.18 235)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Distribuição por turno (Ativos)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byTurno} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {byTurno.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold mb-4">Top cargos (Ativos)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byCargo} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.72 0.16 220)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function aggregate(arr: Colab[], key: keyof Colab, top: number) {
  const map = new Map<string, number>();
  arr.forEach((c) => {
    const v = (c[key] as string) || "Não informado";
    map.set(v, (map.get(v) ?? 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}

function Kpi({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "primary" | "success" | "destructive";
}) {
  const bg =
    color === "success"
      ? "bg-success/10 text-success"
      : color === "destructive"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
