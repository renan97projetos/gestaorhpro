import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Building2 } from "lucide-react";

export const Route = createFileRoute("/p/$token")({
  component: PublicSurveyPage,
});

type Pesquisa = {
  id: string;
  titulo: string;
  descricao: string | null;
  introducao: string | null;
  tipo: string;
  status: "aberta" | "fechada";
};

type Pergunta = {
  id: string;
  texto: string;
  tipo: "nota_0_10" | "escolha_unica" | "escolha_multipla" | "texto_curto" | "texto_longo";
  opcoes: string[] | null;
  obrigatoria: boolean;
  ordem: number;
};

function PublicSurveyPage() {
  const { token } = useParams({ from: "/p/$token" });
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [setor, setSetor] = useState("");
  const [lideranca, setLideranca] = useState("");
  const [comentarioFinal, setComentarioFinal] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("pesquisas")
        .select("id, titulo, descricao, introducao, tipo, status")
        .eq("token", token)
        .maybeSingle();
      setPesquisa(p as Pesquisa | null);
      if (p) {
        const { data: perg } = await supabase
          .from("pesquisa_perguntas")
          .select("*")
          .eq("pesquisa_id", (p as any).id)
          .order("ordem", { ascending: true });
        setPerguntas(((perg as any[]) ?? []).map((x) => ({ ...x, opcoes: x.opcoes ?? null })));
      }
      setLoading(false);
    })();
  }, [token]);

  const setResp = (pid: string, val: any) => setRespostas((r) => ({ ...r, [pid]: val }));

  const validate = (): string | null => {
    for (const p of perguntas) {
      if (!p.obrigatoria) continue;
      const v = respostas[p.id];
      if (p.tipo === "nota_0_10" && (v === undefined || v === null)) return `Selecione uma nota: "${p.texto}"`;
      if ((p.tipo === "texto_curto" || p.tipo === "texto_longo") && (!v || !String(v).trim()))
        return `Responda: "${p.texto}"`;
      if (p.tipo === "escolha_unica" && !v) return `Selecione uma opção: "${p.texto}"`;
      if (p.tipo === "escolha_multipla" && (!Array.isArray(v) || v.length === 0))
        return `Selecione ao menos uma opção: "${p.texto}"`;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!pesquisa) return;
    const err = validate();
    if (err) return toast.error(err);
    setSending(true);

    // 1) Cria registro mestre. Mantém compat: se houver pergunta nota_0_10, usa a primeira como "nota" agregada.
    const primeiraNota = perguntas.find((p) => p.tipo === "nota_0_10");
    const notaAgregada = primeiraNota ? (respostas[primeiraNota.id] ?? null) : null;

    const { data: master, error: e1 } = await supabase
      .from("respostas_pesquisa")
      .insert({
        pesquisa_id: pesquisa.id,
        nota: notaAgregada,
        comentario: comentarioFinal.trim() || null,
        setor: setor.trim() || null,
        lideranca: lideranca.trim() || null,
      })
      .select("id")
      .single();

    if (e1 || !master) {
      setSending(false);
      return toast.error(e1?.message ?? "Erro ao enviar");
    }

    // 2) Insere itens
    const items = perguntas
      .map((p) => {
        const v = respostas[p.id];
        if (v === undefined || v === null || v === "") return null;
        const base: any = { resposta_id: master.id, pergunta_id: p.id };
        if (p.tipo === "nota_0_10") base.valor_nota = Number(v);
        else if (p.tipo === "texto_curto" || p.tipo === "texto_longo") base.valor_texto = String(v);
        else if (p.tipo === "escolha_unica") base.valor_texto = String(v);
        else if (p.tipo === "escolha_multipla") base.valor_opcoes = v;
        return base;
      })
      .filter(Boolean) as any[];

    if (items.length > 0) {
      const { error: e2 } = await supabase.from("respostas_item").insert(items);
      if (e2) {
        setSending(false);
        return toast.error(e2.message);
      }
    }

    setSending(false);
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <p className="text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  if (!pesquisa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold">Pesquisa não encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">O link é inválido ou foi removido.</p>
        </Card>
      </div>
    );
  }

  if (pesquisa.status === "fechada") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-xl font-semibold">{pesquisa.titulo}</h1>
          <p className="text-sm text-muted-foreground mt-3">
            Esta pesquisa está encerrada e não aceita mais respostas. Obrigado!
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="p-8 max-w-md text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Obrigado!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Sua resposta foi registrada de forma anônima.
          </p>
        </Card>
      </div>
    );
  }

  const intro =
    pesquisa.introducao ??
    "Esta pesquisa tem como objetivo ouvir você e gerar melhorias contínuas no nosso ambiente, nos setores e na liderança. Suas respostas são 100% anônimas e serão usadas para construir um lugar melhor para todos trabalharem.";

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{pesquisa.titulo}</h1>
            <p className="text-xs text-muted-foreground">Resposta 100% anônima</p>
          </div>
        </div>

        <Card className="p-4 text-sm whitespace-pre-line">{intro}</Card>
        {pesquisa.descricao && (
          <Card className="p-4 text-sm text-muted-foreground">{pesquisa.descricao}</Card>
        )}

        <Card className="p-5 space-y-6">
          {perguntas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Esta pesquisa ainda não possui perguntas configuradas.
            </p>
          )}

          {perguntas.map((p, idx) => (
            <PerguntaField
              key={p.id}
              pergunta={p}
              index={idx + 1}
              value={respostas[p.id]}
              onChange={(v) => setResp(p.id, v)}
            />
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
            <div>
              <Label>Setor (opcional)</Label>
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label>Liderança (opcional)</Label>
              <Input value={lideranca} onChange={(e) => setLideranca(e.target.value)} maxLength={100} />
            </div>
          </div>

          <div>
            <Label>Quer deixar um comentário ou sugestão livre? (opcional)</Label>
            <Textarea
              value={comentarioFinal}
              onChange={(e) => setComentarioFinal(e.target.value)}
              rows={4}
              placeholder="Use este espaço para escrever livremente o que quiser nos contar."
              maxLength={2000}
            />
          </div>

          <Button className="w-full" size="lg" disabled={sending} onClick={handleSubmit}>
            {sending ? "Enviando…" : "Enviar resposta"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Não coletamos nome, e-mail ou IP. Sua resposta é totalmente anônima.
          </p>
        </Card>
      </div>
    </div>
  );
}

function PerguntaField({
  pergunta,
  index,
  value,
  onChange,
}: {
  pergunta: Pergunta;
  index: number;
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <div>
      <Label className="text-base font-semibold flex items-start gap-1">
        <span className="text-muted-foreground">{index}.</span>
        <span>
          {pergunta.texto}
          {pergunta.obrigatoria && <span className="text-rose-500 ml-1">*</span>}
        </span>
      </Label>

      {pergunta.tipo === "nota_0_10" && (
        <>
          <p className="text-xs text-muted-foreground mt-1">0 = Nada provável • 10 = Extremamente provável</p>
          <div className="grid grid-cols-11 gap-1 mt-3">
            {Array.from({ length: 11 }, (_, n) => n).map((n) => {
              const active = value === n;
              const color = n >= 9 ? "emerald" : n >= 7 ? "amber" : "rose";
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`aspect-square rounded-md text-sm font-semibold border transition ${
                    active
                      ? color === "emerald"
                        ? "bg-emerald-500 text-white border-emerald-500"
                        : color === "amber"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-rose-500 text-white border-rose-500"
                      : "hover:bg-muted border-border"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </>
      )}

      {pergunta.tipo === "texto_curto" && (
        <Input
          className="mt-2"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={300}
        />
      )}

      {pergunta.tipo === "texto_longo" && (
        <Textarea
          className="mt-2"
          rows={4}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={2000}
          placeholder="Escreva sua resposta…"
        />
      )}

      {pergunta.tipo === "escolha_unica" && (
        <div className="space-y-2 mt-3">
          {(pergunta.opcoes ?? []).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onChange(op)}
              className={`w-full text-left px-3 py-2 rounded-md border transition text-sm ${
                value === op ? "bg-primary/10 border-primary" : "hover:bg-muted border-border"
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      )}

      {pergunta.tipo === "escolha_multipla" && (
        <div className="space-y-2 mt-3">
          {(pergunta.opcoes ?? []).map((op) => {
            const arr: string[] = Array.isArray(value) ? value : [];
            const checked = arr.includes(op);
            return (
              <label
                key={op}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition text-sm ${
                  checked ? "bg-primary/10 border-primary" : "hover:bg-muted border-border"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => {
                    if (c) onChange([...arr, op]);
                    else onChange(arr.filter((x) => x !== op));
                  }}
                />
                {op}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
