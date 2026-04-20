import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Plus, BarChart3, Link2, Lock, Unlock, Trash2, ListChecks } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from "recharts";
import { PerguntasBuilder } from "@/components/PerguntasBuilder";

export const Route = createFileRoute("/pesquisas")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <PesquisasPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Pesquisa = {
  id: string;
  titulo: string;
  descricao: string | null;
  introducao: string | null;
  tipo: "enps" | "clima" | "lideranca" | "pulse";
  status: "aberta" | "fechada";
  token: string;
  created_at: string;
  closed_at: string | null;
};

const INTRO_PADRAO =
  "Esta pesquisa tem como objetivo ouvir você e gerar melhorias contínuas no nosso ambiente, nos setores e na liderança. Suas respostas são 100% anônimas e serão usadas para construir um lugar melhor para todos trabalharem.";

type Resposta = {
  id: string;
  pesquisa_id: string;
  nota: number;
  comentario: string | null;
  setor: string | null;
  lideranca: string | null;
  created_at: string;
};

function PesquisasPage() {
  const { isAdmin } = useAuth();
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pesquisa | null>(null);

  // create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [titulo, setTitulo] = useState("Pesquisa de Clima");
  const [descricao, setDescricao] = useState("Sua opinião é anônima e nos ajuda a melhorar.");
  const [introducao, setIntroducao] = useState(INTRO_PADRAO);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from("pesquisas").select("*").order("created_at", { ascending: false }),
      supabase.from("respostas_pesquisa").select("*"),
    ]);
    setPesquisas((ps as Pesquisa[]) ?? []);
    setRespostas((rs as Resposta[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const ch = supabase
      .channel("pesquisas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pesquisas" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "respostas_pesquisa" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // auto-select first
  useEffect(() => {
    if (!selected && pesquisas.length > 0) setSelected(pesquisas[0]);
    if (selected && !pesquisas.find((p) => p.id === selected.id)) {
      setSelected(pesquisas[0] ?? null);
    }
  }, [pesquisas, selected]);

  const handleCreate = async () => {
    if (!titulo.trim()) return toast.error("Informe o título");
    const { data, error } = await supabase
      .from("pesquisas")
      .insert({
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        introducao: introducao.trim() || null,
        tipo: "enps",
      })
      .select()
      .single();
    if (error) return toast.error(error.message);

    // pergunta padrão eNPS para começar
    await supabase.from("pesquisa_perguntas").insert({
      pesquisa_id: (data as any).id,
      texto: "De 0 a 10, o quanto você recomendaria a empresa como lugar para trabalhar?",
      tipo: "nota_0_10",
      obrigatoria: true,
      ordem: 0,
    });

    toast.success("Pesquisa criada! Configure as perguntas na aba 'Perguntas'.");
    setOpenCreate(false);
    setSelected(data as Pesquisa);
  };

  const toggleStatus = async (p: Pesquisa) => {
    const novo = p.status === "aberta" ? "fechada" : "aberta";
    const { error } = await supabase
      .from("pesquisas")
      .update({ status: novo, closed_at: novo === "fechada" ? new Date().toISOString() : null })
      .eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(novo === "aberta" ? "Pesquisa reaberta" : "Pesquisa fechada");
  };

  const deletePesquisa = async (p: Pesquisa) => {
    if (!confirm(`Excluir a pesquisa "${p.titulo}" e todas as respostas?`)) return;
    const { error } = await supabase.from("pesquisas").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Pesquisa excluída");
  };

  const publicUrl = (token: string) =>
    typeof window !== "undefined" ? `${window.location.origin}/p/${token}` : `/p/${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(publicUrl(token));
    toast.success("Link copiado!");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pesquisas de Clima</h1>
          <p className="text-sm text-muted-foreground">
            Crie pesquisas anônimas e acompanhe a satisfação da equipe.
          </p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova pesquisa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova pesquisa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div>
                <Label>Descrição curta (opcional)</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
              </div>
              <div>
                <Label>Introdução / Mensagem inicial</Label>
                <Textarea
                  value={introducao}
                  onChange={(e) => setIntroducao(e.target.value)}
                  rows={5}
                  placeholder="Explique o objetivo da pesquisa e por que ela é importante."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Será mostrada no topo do formulário público para o colaborador.
                </p>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                Após criar, você poderá adicionar quantas perguntas quiser na aba <strong>Perguntas</strong>{" "}
                (nota 0–10, escolha única, múltipla, texto curto ou dissertativa) e definir quais são
                obrigatórias.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Criar e configurar perguntas</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Lista de pesquisas */}
        <Card className="p-3 h-fit">
          <h2 className="text-sm font-semibold px-2 py-1.5 text-muted-foreground">Pesquisas</h2>
          {loading && <p className="text-xs text-muted-foreground p-2">Carregando…</p>}
          {!loading && pesquisas.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">Nenhuma pesquisa criada ainda.</p>
          )}
          <div className="space-y-1">
            {pesquisas.map((p) => {
              const total = respostas.filter((r) => r.pesquisa_id === p.id).length;
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left px-3 py-2 rounded-md border transition ${
                    active ? "bg-primary/10 border-primary/30" : "hover:bg-muted/50 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{p.titulo}</span>
                    <Badge variant={p.status === "aberta" ? "default" : "secondary"} className="text-[10px]">
                      {p.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                    <span>{p.tipo.toUpperCase()}</span>
                    <span>•</span>
                    <span>{total} resposta{total === 1 ? "" : "s"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Detalhe / Dashboard */}
        <div className="space-y-4">
          {selected ? (
            <PesquisaDetail
              pesquisa={selected}
              respostas={respostas.filter((r) => r.pesquisa_id === selected.id)}
              publicUrl={publicUrl(selected.token)}
              onCopy={() => copyLink(selected.token)}
              onToggle={() => toggleStatus(selected)}
              onDelete={() => deletePesquisa(selected)}
              canDelete={isAdmin}
            />
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Crie uma pesquisa para começar.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function PesquisaDetail({
  pesquisa,
  respostas,
  publicUrl,
  onCopy,
  onToggle,
  onDelete,
  canDelete,
}: {
  pesquisa: Pesquisa;
  respostas: Resposta[];
  publicUrl: string;
  onCopy: () => void;
  onToggle: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const stats = useMemo(() => calcEnps(respostas), [respostas]);
  const porSetor = useMemo(() => groupBy(respostas, "setor"), [respostas]);
  const porLideranca = useMemo(() => groupBy(respostas, "lideranca"), [respostas]);

  return (
    <>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{pesquisa.titulo}</h2>
              <Badge variant={pesquisa.status === "aberta" ? "default" : "secondary"}>
                {pesquisa.status}
              </Badge>
            </div>
            {pesquisa.descricao && (
              <p className="text-sm text-muted-foreground mt-1">{pesquisa.descricao}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={onCopy}>
              <Copy className="h-4 w-4 mr-1" /> Copiar link
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <Link2 className="h-4 w-4 mr-1" /> Abrir
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={onToggle}>
              {pesquisa.status === "aberta" ? (
                <>
                  <Lock className="h-4 w-4 mr-1" /> Fechar
                </>
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-1" /> Reabrir
                </>
              )}
            </Button>
            {canDelete && (
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-xs font-mono break-all">
          {publicUrl}
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Respostas" value={stats.total} />
        <Kpi label="eNPS" value={stats.enps} highlight tone={enpsTone(stats.enps)} />
        <Kpi label="Promotores" value={`${stats.promotoresPct}%`} sub={`${stats.promotores}`} />
        <Kpi label="Detratores" value={`${stats.detratoresPct}%`} sub={`${stats.detratores}`} />
      </div>

      <Tabs defaultValue="perguntas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="perguntas">
            <ListChecks className="h-4 w-4 mr-1" /> Perguntas
          </TabsTrigger>
          <TabsTrigger value="distribuicao">
            <BarChart3 className="h-4 w-4 mr-1" /> Distribuição
          </TabsTrigger>
          <TabsTrigger value="setor">Por setor</TabsTrigger>
          <TabsTrigger value="lideranca">Por liderança</TabsTrigger>
          <TabsTrigger value="comentarios">Comentários ({respostas.filter((r) => r.comentario).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas">
          <Card className="p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Perguntas da pesquisa</h3>
              <p className="text-xs text-muted-foreground">
                Adicione, edite e reordene as perguntas. Marque as que devem ser de preenchimento
                obrigatório.
              </p>
            </div>
            <PerguntasBuilder pesquisaId={pesquisa.id} />
          </Card>
        </TabsContent>


        <TabsContent value="distribuicao">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Distribuição das notas (0–10)</h3>
            {stats.total === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma resposta ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.distribuicao}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nota" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="qtd" radius={[6, 6, 0, 0]}>
                    {stats.distribuicao.map((d, i) => (
                      <Cell key={i} fill={notaColor(d.nota)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="setor">
          <BreakdownCard title="Análise por setor" data={porSetor} />
        </TabsContent>

        <TabsContent value="lideranca">
          <BreakdownCard title="Análise por liderança" data={porLideranca} />
        </TabsContent>

        <TabsContent value="comentarios">
          <Card className="p-4 space-y-2">
            {respostas.filter((r) => r.comentario).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum comentário ainda.
              </p>
            )}
            {respostas
              .filter((r) => r.comentario)
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .map((r) => (
                <div key={r.id} className="border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="h-6 w-6 rounded-full text-xs font-semibold flex items-center justify-center text-white"
                      style={{ background: notaColor(r.nota) }}
                    >
                      {r.nota}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.setor || "Setor —"} • {r.lideranca || "Liderança —"}
                    </span>
                  </div>
                  <p className="text-sm">{r.comentario}</p>
                </div>
              ))}
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, Resposta[]> }) {
  const rows = Object.entries(data)
    .map(([nome, list]) => ({ nome, ...calcEnps(list) }))
    .sort((a, b) => b.total - a.total);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sem dados ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="text-left p-2">Grupo</th>
                <th className="text-right p-2">Respostas</th>
                <th className="text-right p-2">Promot.</th>
                <th className="text-right p-2">Neutros</th>
                <th className="text-right p-2">Detrat.</th>
                <th className="text-right p-2">eNPS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nome} className="border-b last:border-0">
                  <td className="p-2 font-medium">{r.nome}</td>
                  <td className="p-2 text-right">{r.total}</td>
                  <td className="p-2 text-right text-emerald-600">{r.promotores}</td>
                  <td className="p-2 text-right text-amber-600">{r.neutros}</td>
                  <td className="p-2 text-right text-rose-600">{r.detratores}</td>
                  <td className="p-2 text-right">
                    <Badge
                      variant="outline"
                      style={{ borderColor: enpsTone(r.enps), color: enpsTone(r.enps) }}
                    >
                      {r.enps}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  tone?: string;
}) {
  return (
    <Card className={`p-4 ${highlight ? "border-2" : ""}`} style={highlight && tone ? { borderColor: tone } : {}}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1" style={highlight && tone ? { color: tone } : {}}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}

// ===== helpers =====
function calcEnps(arr: Resposta[]) {
  const total = arr.length;
  const promotores = arr.filter((r) => r.nota >= 9).length;
  const neutros = arr.filter((r) => r.nota >= 7 && r.nota <= 8).length;
  const detratores = arr.filter((r) => r.nota <= 6).length;
  const promotoresPct = total ? Math.round((promotores / total) * 100) : 0;
  const detratoresPct = total ? Math.round((detratores / total) * 100) : 0;
  const enps = total ? Math.round(promotoresPct - detratoresPct) : 0;
  const distribuicao = Array.from({ length: 11 }, (_, n) => ({
    nota: n,
    qtd: arr.filter((r) => r.nota === n).length,
  }));
  return { total, promotores, neutros, detratores, promotoresPct, detratoresPct, enps, distribuicao };
}

function groupBy(arr: Resposta[], key: "setor" | "lideranca") {
  const map: Record<string, Resposta[]> = {};
  arr.forEach((r) => {
    const k = (r[key] || "Não informado").trim() || "Não informado";
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function enpsTone(v: number) {
  if (v >= 50) return "hsl(142 71% 45%)";
  if (v >= 0) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}
function notaColor(n: number) {
  if (n >= 9) return "hsl(142 71% 45%)";
  if (n >= 7) return "hsl(38 92% 50%)";
  return "hsl(0 72% 51%)";
}
