import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Users, Sparkles, Briefcase, Heart, AlertCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/geracoes")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <GeracoesPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type GenKey = "Z" | "M" | "X" | "BB" | "ALPHA";

const GEN_META: Record<GenKey, { nome: string; cor: string; periodo: string; minAno: number; maxAno: number }> = {
  ALPHA: { nome: "Gen Alpha", cor: "hsl(200 80% 55%)", periodo: "2013+", minAno: 2013, maxAno: 9999 },
  Z:     { nome: "Gen Z",     cor: "hsl(160 70% 45%)", periodo: "1997 - 2012", minAno: 1997, maxAno: 2012 },
  M:     { nome: "Millennials", cor: "hsl(255 70% 70%)", periodo: "1981 - 1996", minAno: 1981, maxAno: 1996 },
  X:     { nome: "Gen X",     cor: "hsl(35 90% 55%)",  periodo: "1965 - 1980", minAno: 1965, maxAno: 1980 },
  BB:    { nome: "Baby Boomers", cor: "hsl(0 70% 60%)", periodo: "1946 - 1964", minAno: 1946, maxAno: 1964 },
};

const GUIAS: Record<GenKey, { resumo: string; esperaLogistica: string[]; comoLiderar: string[] }> = {
  ALPHA: {
    resumo: "Nascidos a partir de 2013. Ainda muito jovens; nasceram conectados, com IA e telas como parte natural do dia.",
    esperaLogistica: ["Tecnologia intuitiva e gamificação", "Aprendizado por vídeo curto", "Propósito claro desde o primeiro dia"],
    comoLiderar: ["Use linguagem visual e interativa", "Dê feedback imediato e contínuo", "Conecte tarefas a um propósito maior"],
  },
  Z: {
    resumo: "Nascidos entre 1997 e 2012. Cresceram com smartphone, redes sociais e acesso instantâneo à informação. Valorizam propósito, diversidade, saúde mental e flexibilidade. Pragmáticos e com pouca paciência para processos engessados.",
    esperaLogistica: [
      "Tecnologia no dia a dia: coletor, app, planilhas digitais — odeiam papel à toa.",
      "Clareza de função: o que é meu, o que é do outro, qual a meta de hoje.",
      "Feedback rápido e constante, não só na avaliação anual.",
      "Segurança real (EPI, ergonomia) — não aceitam risco como 'parte do trabalho'.",
      "Plano de carreira visível: querem saber o próximo passo em meses, não em anos.",
    ],
    comoLiderar: [
      "Explique o porquê de cada tarefa, não só o como.",
      "Use mensagens curtas, diretas e visuais (WhatsApp, mural digital, vídeos).",
      "Reconheça publicamente conquistas pequenas — micro-recompensas funcionam.",
      "Evite hierarquia exagerada e gritaria; eles trocam de emprego sem medo.",
      "Dê autonomia para resolver problemas e escute as ideias.",
    ],
  },
  M: {
    resumo: "Nascidos entre 1981 e 1996. Viveram a transição do analógico para o digital. Valorizam equilíbrio entre vida e trabalho, desenvolvimento profissional e ambientes colaborativos. São a 'ponte' entre Gen X e Gen Z.",
    esperaLogistica: [
      "Processos bem definidos, mas com espaço para sugerir melhorias.",
      "Treinamentos contínuos (operação, segurança, liderança, soft skills).",
      "Reconhecimento profissional: certificações, promoções, bonificação por meta.",
      "Boa comunicação entre turnos e setores — odeiam retrabalho por falha de informação.",
      "Liderança próxima e acessível, que apoia em vez de só cobrar.",
    ],
    comoLiderar: [
      "Construa relação 1:1: pergunte como está, conheça a família, o objetivo.",
      "Delegue com confiança e cobre resultado, não controle de hora em hora.",
      "Apresente metas claras e mostre o impacto do trabalho deles no resultado da filial.",
      "Invista em capacitação — quem se desenvolve fica.",
      "Promova reuniões curtas e produtivas (15 min é melhor que 1h).",
    ],
  },
  X: {
    resumo: "Nascidos entre 1965 e 1980. Independentes, resilientes e adaptáveis. Viveram a chegada do computador no trabalho. Valorizam estabilidade, respeito à experiência e reconhecimento pela trajetória.",
    esperaLogistica: [
      "Estabilidade no emprego e clareza nas regras (jornada, escala, benefícios).",
      "Respeito à experiência prática — eles conhecem o operacional como ninguém.",
      "Ferramentas que funcionam: equipamento bom, manutenção em dia, EPI adequado.",
      "Liderança coerente — falar uma coisa e fazer outra os afasta rapidamente.",
      "Reconhecimento pela tarimba: usar como referência técnica para os mais novos.",
    ],
    comoLiderar: [
      "Trate como parceiro, não como subordinado. Peça opinião antes de mudar processo.",
      "Comunique mudanças com antecedência e justificativa técnica.",
      "Use a experiência deles como mentoria informal para a Gen Z.",
      "Evite microgerência — eles entregam, só precisam saber o objetivo.",
      "Reconheça tempo de casa, conhecimento histórico e lealdade.",
    ],
  },
  BB: {
    resumo: "Nascidos entre 1946 e 1964. Lealdade institucional, ética de trabalho intensa e valorização de hierarquia. Trazem memória histórica e experiência de longo prazo.",
    esperaLogistica: [
      "Reconhecimento pela trajetória e estabilidade",
      "Comunicação formal e respeitosa",
      "Estrutura clara de comando e responsabilidades",
    ],
    comoLiderar: [
      "Valorize a experiência publicamente",
      "Mantenha comunicação direta e respeitosa",
      "Use-os como mentores formais",
    ],
  },
};

function classificar(ano: number): GenKey | null {
  for (const [k, v] of Object.entries(GEN_META) as [GenKey, typeof GEN_META[GenKey]][]) {
    if (ano >= v.minAno && ano <= v.maxAno) return k;
  }
  return null;
}

function calcIdade(dataNasc: string): number {
  const d = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--;
  return idade;
}

function GeracoesPage() {
  const [colabs, setColabs] = useState<{ data_nascimento: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const { data } = await supabase
      .from("colaboradores")
      .select("data_nascimento")
      .eq("status", "Ativo");
    setColabs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel("geracoes-colab")
      .on("postgres_changes", { event: "*", schema: "public", table: "colaboradores" }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const { totalAtivos, comData, semData, contagem, histograma, ordemKeys } = useMemo(() => {
    const cont: Record<GenKey, number> = { ALPHA: 0, Z: 0, M: 0, X: 0, BB: 0 };
    const histMap = new Map<number, Record<GenKey, number>>();
    let semData = 0;
    for (const c of colabs) {
      if (!c.data_nascimento) { semData++; continue; }
      const d = new Date(c.data_nascimento);
      if (isNaN(d.getTime())) { semData++; continue; }
      const ano = d.getFullYear();
      const gen = classificar(ano);
      if (!gen) { semData++; continue; }
      cont[gen]++;
      const idade = calcIdade(c.data_nascimento);
      if (!histMap.has(idade)) histMap.set(idade, { ALPHA: 0, Z: 0, M: 0, X: 0, BB: 0 });
      histMap.get(idade)![gen]++;
    }
    const histograma = Array.from(histMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([idade, gens]) => ({ idade, ...gens }));
    const totalAtivos = colabs.length;
    const comData = totalAtivos - semData;
    const ordemKeys: GenKey[] = (["Z", "M", "X", "ALPHA", "BB"] as GenKey[]).filter((k) => cont[k] > 0);
    return { totalAtivos, comData, semData, contagem: cont, histograma, ordemKeys };
  }, [colabs]);

  const dadosPizza = ordemKeys.map((k) => ({
    nome: GEN_META[k].nome,
    qtd: contagem[k],
    pct: comData ? (contagem[k] / comData) * 100 : 0,
    cor: GEN_META[k].cor,
    periodo: GEN_META[k].periodo,
    key: k,
  }));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center shadow-md">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gerações na Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Análise dinâmica — {loading ? "carregando..." : `${totalAtivos} colaboradores ativos`}
          </p>
        </div>
      </div>

      {semData > 0 && (
        <Card className="p-4 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
          <div className="flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                {semData} colaborador(es) sem data de nascimento cadastrada
              </p>
              <p className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
                Esses colaboradores não entram no cálculo. Edite o cadastro deles e adicione a data de nascimento para incluí-los na análise.
              </p>
            </div>
          </div>
        </Card>
      )}

      {comData === 0 && !loading ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum colaborador ativo com data de nascimento cadastrada ainda.
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className={`grid gap-3 md:gap-4 grid-cols-2 ${ordemKeys.length >= 3 ? "md:grid-cols-3" : ""} ${ordemKeys.length >= 4 ? "lg:grid-cols-4" : ""} ${ordemKeys.length >= 5 ? "xl:grid-cols-5" : ""}`}>
            {dadosPizza.map((g) => (
              <Card key={g.key} className="p-4 md:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ background: g.cor }} />
                  <p className="text-xs md:text-sm font-medium text-muted-foreground">{g.nome}</p>
                </div>
                <p className="text-2xl md:text-3xl font-bold">{g.qtd}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {g.pct.toFixed(1)}% do total
                </p>
              </Card>
            ))}
          </div>

          {/* Pizza + histograma */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4 md:p-5">
              <h3 className="text-sm font-semibold mb-1">Distribuição por geração</h3>
              <div className="flex flex-wrap gap-3 text-xs mb-3">
                {dadosPizza.map((g) => (
                  <span key={g.key} className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-sm" style={{ background: g.cor }} />
                    {g.nome} ({g.pct.toFixed(0)}%)
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    dataKey="qtd"
                    nameKey="nome"
                    innerRadius={60}
                    outerRadius={110}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {dadosPizza.map((g) => (
                      <Cell key={g.key} fill={g.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n) => [`${v} pessoas`, n]} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4 md:p-5">
              <h3 className="text-sm font-semibold mb-3">Distribuição de idades</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={histograma}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="idade" tick={{ fontSize: 11 }} interval={Math.max(1, Math.floor(histograma.length / 15))} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {ordemKeys.map((k) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={GEN_META[k].cor} name={GEN_META[k].nome} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Cards detalhados por geração */}
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold">Entendendo cada geração</h2>
            {ordemKeys.map((k) => {
              const meta = GEN_META[k];
              const guia = GUIAS[k];
              const qtd = contagem[k];
              const pct = comData ? (qtd / comData) * 100 : 0;
              return (
                <Card key={k} className="overflow-hidden">
                  <div
                    className="px-5 py-3 flex items-center justify-between gap-3 text-white"
                    style={{ background: meta.cor }}
                  >
                    <div>
                      <h3 className="text-lg font-bold">{meta.nome}</h3>
                      <p className="text-xs opacity-90">
                        {qtd} colaboradores ({pct.toFixed(1)}% da equipe) — {meta.periodo}
                      </p>
                    </div>
                    <Sparkles className="h-6 w-6 opacity-80" />
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-sm leading-relaxed">{guia.resumo}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="h-4 w-4 text-primary" />
                          <h4 className="text-sm font-semibold">O que esperam da logística</h4>
                        </div>
                        <ul className="space-y-1.5 text-sm">
                          {guia.esperaLogistica.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-lg border p-4 bg-muted/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Heart className="h-4 w-4 text-rose-500" />
                          <h4 className="text-sm font-semibold">Como liderar</h4>
                        </div>
                        <ul className="space-y-1.5 text-sm">
                          {guia.comoLiderar.map((item, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="text-rose-500 mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-4 bg-muted/40 border-dashed">
            <p className="text-xs text-muted-foreground">
              📊 Análise atualizada em tempo real a partir dos colaboradores ativos com data de nascimento cadastrada ({comData} de {totalAtivos}).
              Faixas: Baby Boomers (1946-1964), Gen X (1965-1980), Millennials (1981-1996), Gen Z (1997-2012), Gen Alpha (2013+).
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
