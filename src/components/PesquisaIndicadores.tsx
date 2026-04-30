import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Loader2, BarChart3 } from "lucide-react";

type Pergunta = {
  id: string;
  texto: string;
  tipo: "nota_0_10" | "escolha_unica" | "escolha_multipla" | "texto_curto" | "texto_longo";
  opcoes: string[] | null;
  ordem: number;
};

type Item = {
  pergunta_id: string;
  valor_nota: number | null;
  valor_texto: string | null;
  valor_opcoes: string[] | null;
};

const PALETA = [
  "hsl(217 91% 60%)",
  "hsl(160 70% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(255 70% 70%)",
  "hsl(180 60% 45%)",
  "hsl(330 70% 60%)",
  "hsl(45 90% 55%)",
  "hsl(280 60% 55%)",
  "hsl(140 50% 50%)",
];

function notaCor(n: number) {
  if (n >= 9) return "hsl(142 71% 45%)";
  if (n >= 7) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}

export function PesquisaIndicadores({ pesquisaId }: { pesquisaId: string }) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [{ data: pq }, { data: it }] = await Promise.all([
        supabase
          .from("pesquisa_perguntas")
          .select("id, texto, tipo, opcoes, ordem")
          .eq("pesquisa_id", pesquisaId)
          .order("ordem"),
        supabase
          .from("respostas_item")
          .select("pergunta_id, valor_nota, valor_texto, valor_opcoes, resposta_id, respostas_pesquisa!inner(pesquisa_id)")
          .eq("respostas_pesquisa.pesquisa_id", pesquisaId),
      ]);
      if (!alive) return;
      setPerguntas(((pq as any[]) ?? []).map((p) => ({
        ...p,
        opcoes: Array.isArray(p.opcoes) ? p.opcoes : null,
      })));
      setItens((it as any[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [pesquisaId]);

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      </Card>
    );
  }

  if (perguntas.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Esta pesquisa ainda não tem perguntas cadastradas.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {perguntas.map((p) => (
        <PerguntaIndicador
          key={p.id}
          pergunta={p}
          itens={itens.filter((i) => i.pergunta_id === p.id)}
        />
      ))}
    </div>
  );
}

function PerguntaIndicador({ pergunta, itens }: { pergunta: Pergunta; itens: Item[] }) {
  const dados = useMemo(() => {
    if (pergunta.tipo === "nota_0_10") {
      const buckets = [
        { nome: "Promotores (9-10)", cor: "hsl(142 71% 45%)", qtd: 0 },
        { nome: "Neutros (7-8)", cor: "hsl(38 92% 50%)", qtd: 0 },
        { nome: "Detratores (0-6)", cor: "hsl(0 72% 51%)", qtd: 0 },
      ];
      let soma = 0;
      let cont = 0;
      itens.forEach((i) => {
        if (i.valor_nota === null || i.valor_nota === undefined) return;
        const n = i.valor_nota;
        soma += n;
        cont++;
        if (n >= 9) buckets[0].qtd++;
        else if (n >= 7) buckets[1].qtd++;
        else buckets[2].qtd++;
      });
      return {
        kind: "pie" as const,
        total: cont,
        media: cont ? (soma / cont).toFixed(1) : "—",
        data: buckets.filter((b) => b.qtd > 0),
      };
    }
    if (pergunta.tipo === "escolha_unica" || pergunta.tipo === "escolha_multipla") {
      const map = new Map<string, number>();
      itens.forEach((i) => {
        if (pergunta.tipo === "escolha_unica" && i.valor_texto) {
          map.set(i.valor_texto, (map.get(i.valor_texto) ?? 0) + 1);
        } else if (Array.isArray(i.valor_opcoes)) {
          i.valor_opcoes.forEach((op) => map.set(op, (map.get(op) ?? 0) + 1));
        }
      });
      const arr = Array.from(map, ([nome, qtd], idx) => ({
        nome,
        qtd,
        cor: PALETA[idx % PALETA.length],
      })).sort((a, b) => b.qtd - a.qtd);
      return { kind: "pie" as const, total: itens.length, media: null, data: arr };
    }
    // textos
    const respostas = itens
      .map((i) => i.valor_texto)
      .filter((t): t is string => !!t && t.trim().length > 0);
    return { kind: "texto" as const, total: respostas.length, media: null, data: respostas };
  }, [pergunta, itens]);

  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug">{pergunta.texto}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dados.total} resposta{dados.total === 1 ? "" : "s"}
            {dados.media !== null && ` • Média ${dados.media}`}
          </p>
        </div>
        <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      {dados.total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem respostas ainda.</p>
      ) : dados.kind === "pie" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={dados.data}
                dataKey="qtd"
                nameKey="nome"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={85}
                stroke="hsl(var(--background))"
                strokeWidth={2}
                label={(entry: any) =>
                  dados.total
                    ? `${Math.round((entry.qtd / dados.total) * 100)}%`
                    : ""
                }
                labelLine={false}
              >
                {dados.data.map((d: any, i) => (
                  <Cell key={i} fill={d.cor} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number, n) => [`${v} resposta${v === 1 ? "" : "s"}`, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {dados.data.map((d: any) => {
              const pct = dados.total ? Math.round((d.qtd / dados.total) * 100) : 0;
              return (
                <div key={d.nome} className="flex items-center gap-2 text-xs">
                  <span className="h-3 w-3 rounded-sm shrink-0" style={{ background: d.cor }} />
                  <span className="flex-1 truncate">{d.nome}</span>
                  <span className="font-semibold tabular-nums">{d.qtd}</span>
                  <span className="text-muted-foreground tabular-nums w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {(dados.data as string[]).slice(0, 30).map((t, i) => (
            <div key={i} className="text-sm rounded border px-3 py-2 bg-muted/30">
              {t}
            </div>
          ))}
          {(dados.data as string[]).length > 30 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              +{(dados.data as string[]).length - 30} respostas adicionais
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// Suprimir aviso de import não usado
void notaCor;
