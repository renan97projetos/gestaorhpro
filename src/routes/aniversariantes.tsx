import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Cake, Gift, PartyPopper, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/aniversariantes")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <AniversariantesPage />
      </AppLayout>
    </RequireAuth>
  ),
});

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Colab = {
  id: string; matricula: string; colaborador: string; cargo: string | null;
  setor: string | null; data_nascimento: string | null; status: string;
};

function parseDataLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function calcIdade(nasc: Date, ref: Date) {
  let i = ref.getFullYear() - nasc.getFullYear();
  const m = ref.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nasc.getDate())) i--;
  return i;
}

function AniversariantesPage() {
  const [colabs, setColabs] = useState<Colab[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("mes");

  const carregar = async () => {
    const { data } = await supabase
      .from("colaboradores")
      .select("id, matricula, colaborador, cargo, setor, data_nascimento, status")
      .in("status", ["Ativo", "Afastado", "Ferias"])
      .not("data_nascimento", "is", null);
    setColabs((data as Colab[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel("aniv-colab")
      .on("postgres_changes", { event: "*", schema: "public", table: "colaboradores" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const diaAtual = hoje.getDate();

  const { doMes, porMes, hojeList } = useMemo(() => {
    const porMes = Array.from({ length: 12 }, (_, i) => ({ mes: MESES_CURTOS[i], idx: i, qtd: 0 }));
    const doMes: (Colab & { dia: number; idade: number; ehHoje: boolean })[] = [];
    const hojeList: (Colab & { idade: number })[] = [];
    for (const c of colabs) {
      if (!c.data_nascimento) continue;
      const d = parseDataLocal(c.data_nascimento);
      if (isNaN(d.getTime())) continue;
      porMes[d.getMonth()].qtd++;
      if (d.getMonth() === mesAtual) {
        const idade = calcIdade(d, hoje) + (d.getDate() <= diaAtual ? 0 : 0);
        // idade que completa neste ano
        const idadeAno = hoje.getFullYear() - d.getFullYear();
        doMes.push({ ...c, dia: d.getDate(), idade: idadeAno, ehHoje: d.getDate() === diaAtual });
        if (d.getDate() === diaAtual) hojeList.push({ ...c, idade: idadeAno });
      }
    }
    doMes.sort((a, b) => a.dia - b.dia);
    return { doMes, porMes, hojeList };
  }, [colabs, mesAtual, diaAtual]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-pink-500 to-amber-400 flex items-center justify-center shadow-md">
          <Cake className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Aniversariantes</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "carregando..." : `${colabs.length} colaboradores ativos com data cadastrada`}
          </p>
        </div>
      </div>

      {hojeList.length > 0 && (
        <Card className="p-4 border-pink-300 bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/20 dark:to-amber-950/20">
          <div className="flex items-start gap-3">
            <PartyPopper className="h-6 w-6 text-pink-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-pink-900 dark:text-pink-200">
                🎉 Hoje é aniversário de {hojeList.length === 1 ? "1 colaborador" : `${hojeList.length} colaboradores`}!
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {hojeList.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-pink-500" />
                    <span className="font-medium">{c.colaborador}</span>
                    <span className="text-muted-foreground">— {c.idade} anos{c.cargo ? ` • ${c.cargo}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="mes" className="gap-2"><Calendar className="h-4 w-4" /> Do mês ({doMes.length})</TabsTrigger>
          <TabsTrigger value="ano" className="gap-2"><Cake className="h-4 w-4" /> Ano todo</TabsTrigger>
        </TabsList>

        <TabsContent value="mes" className="mt-4">
          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-4">{MESES[mesAtual]}</h2>
            {doMes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum aniversariante neste mês.</p>
            ) : (
              <ul className="divide-y">
                {doMes.map((c) => (
                  <li key={c.id} className={`py-3 flex items-center justify-between gap-3 ${c.ehHoje ? "bg-pink-50 dark:bg-pink-950/20 -mx-2 px-2 rounded" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0 ${c.ehHoje ? "bg-pink-500 text-white" : "bg-muted"}`}>
                        <span className="text-[10px] leading-none uppercase">{MESES_CURTOS[mesAtual]}</span>
                        <span className="text-sm font-bold leading-none mt-0.5">{c.dia}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate flex items-center gap-2">
                          {c.colaborador}
                          {c.ehHoje && <Badge className="bg-pink-500 hover:bg-pink-500">Hoje 🎂</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Mat. {c.matricula}{c.cargo ? ` • ${c.cargo}` : ""}{c.setor ? ` • ${c.setor}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{c.idade} anos</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="ano" className="mt-4">
          <Card className="p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-4">Distribuição por mês</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => [`${v} pessoas`, "Aniversariantes"]} />
                <Bar dataKey="qtd" radius={[6, 6, 0, 0]}>
                  {porMes.map((m) => (
                    <Cell key={m.idx} fill={m.idx === mesAtual ? "hsl(330 80% 60%)" : "hsl(var(--primary))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
              {porMes.map((m) => (
                <div key={m.idx} className={`p-2 rounded border text-center ${m.idx === mesAtual ? "border-pink-300 bg-pink-50 dark:bg-pink-950/20" : ""}`}>
                  <p className="text-xs text-muted-foreground">{MESES[m.idx]}</p>
                  <p className="text-lg font-bold">{m.qtd}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
