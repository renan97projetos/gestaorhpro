import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

export type PerguntaTipo = "nota_0_10" | "escolha_unica" | "escolha_multipla" | "texto_curto" | "texto_longo";

export type PerguntaDraft = {
  id?: string;
  texto: string;
  tipo: PerguntaTipo;
  opcoes: string[];
  obrigatoria: boolean;
  ordem: number;
};

const TIPOS: { value: PerguntaTipo; label: string }[] = [
  { value: "nota_0_10", label: "Nota 0–10 (eNPS / escala)" },
  { value: "escolha_unica", label: "Escolha única" },
  { value: "escolha_multipla", label: "Escolha múltipla" },
  { value: "texto_curto", label: "Texto curto" },
  { value: "texto_longo", label: "Texto dissertativo" },
];

export function PerguntasBuilder({ pesquisaId }: { pesquisaId: string }) {
  const [items, setItems] = useState<PerguntaDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pesquisa_perguntas")
      .select("*")
      .eq("pesquisa_id", pesquisaId)
      .order("ordem", { ascending: true });
    setItems(
      ((data as any[]) ?? []).map((d) => ({
        id: d.id,
        texto: d.texto,
        tipo: d.tipo,
        opcoes: Array.isArray(d.opcoes) ? d.opcoes : [],
        obrigatoria: d.obrigatoria,
        ordem: d.ordem,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [pesquisaId]);

  const add = () => {
    setItems((arr) => [
      ...arr,
      {
        texto: "",
        tipo: "nota_0_10",
        opcoes: [],
        obrigatoria: true,
        ordem: arr.length,
      },
    ]);
  };

  const update = (idx: number, patch: Partial<PerguntaDraft>) => {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const remove = (idx: number) => {
    setItems((arr) => arr.filter((_, i) => i !== idx).map((it, i) => ({ ...it, ordem: i })));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((arr) => {
      const next = [...arr];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return arr;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((it, i) => ({ ...it, ordem: i }));
    });
  };

  const saveAll = async () => {
    // valida
    for (const it of items) {
      if (!it.texto.trim()) return toast.error("Todas as perguntas precisam de um texto.");
      if ((it.tipo === "escolha_unica" || it.tipo === "escolha_multipla") && it.opcoes.filter((o) => o.trim()).length < 2)
        return toast.error(`A pergunta "${it.texto}" precisa de pelo menos 2 opções.`);
    }

    setSaving(true);
    // estratégia simples: apaga tudo e reinsere
    const { error: delErr } = await supabase.from("pesquisa_perguntas").delete().eq("pesquisa_id", pesquisaId);
    if (delErr) {
      setSaving(false);
      return toast.error(delErr.message);
    }
    if (items.length > 0) {
      const payload = items.map((it, i) => ({
        pesquisa_id: pesquisaId,
        texto: it.texto.trim(),
        tipo: it.tipo,
        opcoes:
          it.tipo === "escolha_unica" || it.tipo === "escolha_multipla"
            ? it.opcoes.map((o) => o.trim()).filter(Boolean)
            : null,
        obrigatoria: it.obrigatoria,
        ordem: i,
      }));
      const { error: insErr } = await supabase.from("pesquisa_perguntas").insert(payload);
      if (insErr) {
        setSaving(false);
        return toast.error(insErr.message);
      }
    }
    setSaving(false);
    toast.success("Perguntas salvas!");
    fetchItems();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Carregando perguntas…</p>;

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma pergunta ainda. Clique em "Adicionar pergunta" para começar.
        </Card>
      )}

      {items.map((it, idx) => (
        <Card key={idx} className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center pt-1 text-muted-foreground">
              <GripVertical className="h-4 w-4" />
              <span className="text-[10px] font-bold">{idx + 1}</span>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-xs">Texto da pergunta</Label>
                <Input
                  value={it.texto}
                  onChange={(e) => update(idx, { texto: e.target.value })}
                  placeholder="Ex.: Como você avalia a comunicação do seu líder?"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de resposta</Label>
                  <Select value={it.tipo} onValueChange={(v) => update(idx, { tipo: v as PerguntaTipo })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={it.obrigatoria}
                      onCheckedChange={(c) => update(idx, { obrigatoria: c })}
                    />
                    <Label className="text-sm">Obrigatória</Label>
                  </div>
                </div>
              </div>

              {(it.tipo === "escolha_unica" || it.tipo === "escolha_multipla") && (
                <div>
                  <Label className="text-xs">Opções</Label>
                  <div className="space-y-2">
                    {it.opcoes.map((op, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input
                          value={op}
                          onChange={(e) => {
                            const next = [...it.opcoes];
                            next[oi] = e.target.value;
                            update(idx, { opcoes: next });
                          }}
                          placeholder={`Opção ${oi + 1}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => update(idx, { opcoes: it.opcoes.filter((_, i) => i !== oi) })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => update(idx, { opcoes: [...it.opcoes, ""] })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Adicionar opção
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(idx, 1)}
                disabled={idx === items.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => remove(idx)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2 justify-between">
        <Button variant="outline" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar pergunta
        </Button>
        <Button onClick={saveAll} disabled={saving}>
          {saving ? "Salvando…" : "Salvar perguntas"}
        </Button>
      </div>
    </div>
  );
}
