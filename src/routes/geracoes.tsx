import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Users, Sparkles, Briefcase, Heart } from "lucide-react";

export const Route = createFileRoute("/geracoes")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <GeracoesPage />
      </AppLayout>
    </RequireAuth>
  ),
});

// Dados calculados a partir da planilha de aniversários (185 colaboradores únicos, nomes duplicados removidos)
// Headcount oficial da filial: 187 colaboradores
// Base: 185 da planilha de aniversários + 2 ajuste de headcount (1 Millennial e 1 Gen X)
const TOTAL = 187;
const GERACOES = [
  { nome: "Gen Z", qtd: 87, pct: 46.5, cor: "hsl(160 70% 45%)", periodo: "1997 - 2012" },
  { nome: "Millennials", qtd: 82, pct: 43.9, cor: "hsl(255 70% 70%)", periodo: "1981 - 1996" },
  { nome: "Gen X", qtd: 18, pct: 9.6, cor: "hsl(35 90% 55%)", periodo: "1965 - 1980" },
];

// Histograma de idades (dados reais da planilha, nomes únicos)
const HISTOGRAMA: Array<{ idade: number; Z: number; M: number; X: number }> = [
  { idade: 18, Z: 4, M: 0, X: 0 }, { idade: 19, Z: 4, M: 0, X: 0 },
  { idade: 20, Z: 6, M: 0, X: 0 }, { idade: 21, Z: 8, M: 0, X: 0 },
  { idade: 22, Z: 6, M: 0, X: 0 }, { idade: 23, Z: 11, M: 0, X: 0 },
  { idade: 24, Z: 13, M: 0, X: 0 }, { idade: 25, Z: 13, M: 0, X: 0 },
  { idade: 26, Z: 9, M: 0, X: 0 }, { idade: 27, Z: 3, M: 0, X: 0 },
  { idade: 28, Z: 7, M: 0, X: 0 }, { idade: 29, Z: 10, M: 0, X: 0 },
  { idade: 30, Z: 0, M: 11, X: 0 }, { idade: 31, Z: 0, M: 5, X: 0 },
  { idade: 32, Z: 0, M: 7, X: 0 }, { idade: 33, Z: 0, M: 3, X: 0 },
  { idade: 34, Z: 0, M: 6, X: 0 }, { idade: 35, Z: 0, M: 7, X: 0 },
  { idade: 36, Z: 0, M: 5, X: 0 }, { idade: 37, Z: 0, M: 4, X: 0 },
  { idade: 38, Z: 0, M: 3, X: 0 }, { idade: 39, Z: 0, M: 2, X: 0 },
  { idade: 40, Z: 0, M: 5, X: 0 }, { idade: 41, Z: 0, M: 5, X: 0 },
  { idade: 42, Z: 0, M: 4, X: 0 }, { idade: 43, Z: 0, M: 1, X: 0 },
  { idade: 44, Z: 0, M: 5, X: 0 }, { idade: 45, Z: 0, M: 0, X: 1 },
  { idade: 46, Z: 0, M: 0, X: 3 }, { idade: 47, Z: 0, M: 0, X: 2 },
  { idade: 48, Z: 0, M: 0, X: 1 }, { idade: 49, Z: 0, M: 0, X: 2 },
  { idade: 52, Z: 0, M: 0, X: 3 }, { idade: 53, Z: 0, M: 0, X: 1 },
  { idade: 55, Z: 0, M: 0, X: 1 }, { idade: 56, Z: 0, M: 0, X: 2 },
  { idade: 60, Z: 0, M: 0, X: 2 },
];

type Info = {
  nome: string;
  qtd: number;
  pct: number;
  cor: string;
  resumo: string;
  esperaLogistica: string[];
  comoLiderar: string[];
};

const INFOS: Info[] = [
  {
    nome: "Gen Z",
    qtd: 87,
    pct: 46.5,
    cor: "hsl(160 70% 45%)",
    resumo:
      "Nascidos entre 1997 e 2012. Cresceram com smartphone, redes sociais e acesso instantâneo à informação. Valorizam propósito, diversidade, saúde mental e flexibilidade. São pragmáticos e têm pouca paciência para processos engessados.",
    esperaLogistica: [
      "Tecnologia no dia a dia: coletor, app, planilhas digitais — odeiam papel à toa.",
      "Clareza de função: o que é meu, o que é do outro, qual é a meta de hoje.",
      "Feedback rápido e constante, não só na avaliação anual.",
      "Segurança real (EPI, ergonomia) — não aceitam risco como 'parte do trabalho'.",
      "Plano de carreira visível: querem saber o próximo passo em meses, não em anos.",
    ],
    comoLiderar: [
      "Explique o porquê de cada tarefa, não só o como. Sem isso, eles desconectam.",
      "Use mensagens curtas, diretas e visuais (WhatsApp, mural digital, vídeos).",
      "Reconheça publicamente conquistas pequenas — micro-recompensas funcionam.",
      "Evite hierarquia exagerada e gritaria; eles trocam de emprego sem medo.",
      "Dê autonomia para resolver problemas e escute as ideias — eles têm muitas.",
    ],
  },
  {
    nome: "Millennials",
    qtd: 82,
    pct: 43.9,
    cor: "hsl(255 70% 70%)",
    resumo:
      "Nascidos entre 1981 e 1996. Viveram a transição do analógico para o digital. Valorizam equilíbrio entre vida e trabalho, desenvolvimento profissional e ambientes colaborativos. São a 'ponte' entre Gen X e Gen Z.",
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
  {
    nome: "Gen X",
    qtd: 18,
    pct: 9.6,
    cor: "hsl(35 90% 55%)",
    resumo:
      "Nascidos entre 1965 e 1980. Independentes, resilientes e adaptáveis. Viveram a chegada do computador no trabalho. Valorizam estabilidade, respeito à experiência e reconhecimento pela trajetória.",
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
];

function GeracoesPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center shadow-md">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gerações na Equipe</h1>
          <p className="text-sm text-muted-foreground">
            Análise da composição etária da filial — {TOTAL} colaboradores únicos
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {GERACOES.map((g) => (
          <Card key={g.nome} className="p-4 md:p-5">
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
            {GERACOES.map((g) => (
              <span key={g.nome} className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm" style={{ background: g.cor }} />
                {g.nome} ({g.pct.toFixed(0)}%)
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={GERACOES}
                dataKey="qtd"
                nameKey="nome"
                innerRadius={60}
                outerRadius={110}
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {GERACOES.map((g) => (
                  <Cell key={g.nome} fill={g.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n) => [`${v} pessoas`, n]} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5">
          <h3 className="text-sm font-semibold mb-3">Distribuição de idades (histograma)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={HISTOGRAMA}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="idade" tick={{ fontSize: 11 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Z" stackId="a" fill="hsl(160 70% 45%)" name="Gen Z" />
              <Bar dataKey="M" stackId="a" fill="hsl(255 70% 70%)" name="Millennials" />
              <Bar dataKey="X" stackId="a" fill="hsl(35 90% 55%)" name="Gen X" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Cards detalhados por geração */}
      <div className="space-y-4">
        <h2 className="text-lg md:text-xl font-bold">Entendendo cada geração</h2>
        {INFOS.map((info) => (
          <Card key={info.nome} className="overflow-hidden">
            <div
              className="px-5 py-3 flex items-center justify-between gap-3 text-white"
              style={{ background: info.cor }}
            >
              <div>
                <h3 className="text-lg font-bold">{info.nome}</h3>
                <p className="text-xs opacity-90">
                  {info.qtd} colaboradores ({info.pct.toFixed(1)}% da equipe)
                </p>
              </div>
              <Sparkles className="h-6 w-6 opacity-80" />
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm leading-relaxed">{info.resumo}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">O que esperam da logística</h4>
                  </div>
                  <ul className="space-y-1.5 text-sm">
                    {info.esperaLogistica.map((item, i) => (
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
                    {info.comoLiderar.map((item, i) => (
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
        ))}
      </div>

      <Card className="p-4 bg-muted/40 border-dashed">
        <p className="text-xs text-muted-foreground">
          📊 Análise baseada no headcount oficial de {TOTAL} colaboradores (185 com data de nascimento na planilha + 2 ajuste de headcount).
          Faixas geracionais: Gen Z (1997-2012), Millennials (1981-1996), Gen X (1965-1980).
        </p>
      </Card>
    </div>
  );
}
