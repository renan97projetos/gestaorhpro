import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, Building2 } from "lucide-react";

export const Route = createFileRoute("/p/$token")({
  component: PublicSurveyPage,
});

type Pesquisa = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  status: "aberta" | "fechada";
};

function PublicSurveyPage() {
  const { token } = useParams({ from: "/p/$token" });
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [setor, setSetor] = useState("");
  const [lideranca, setLideranca] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pesquisas")
        .select("id, titulo, descricao, tipo, status")
        .eq("token", token)
        .maybeSingle();
      setPesquisa(data as Pesquisa | null);
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (nota === null) return toast.error("Selecione uma nota de 0 a 10");
    if (!pesquisa) return;
    setSending(true);
    const { error } = await supabase.from("respostas_pesquisa").insert({
      pesquisa_id: pesquisa.id,
      nota,
      comentario: comentario.trim() || null,
      setor: setor.trim() || null,
      lideranca: lideranca.trim() || null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
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
          <p className="text-sm text-muted-foreground mt-2">
            O link é inválido ou foi removido.
          </p>
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

        {pesquisa.descricao && (
          <Card className="p-4 text-sm text-muted-foreground">{pesquisa.descricao}</Card>
        )}

        <Card className="p-5 space-y-5">
          <div>
            <Label className="text-base font-semibold">
              De 0 a 10, o quanto você recomendaria a empresa como lugar para trabalhar?
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              0 = Nada provável • 10 = Extremamente provável
            </p>
            <div className="grid grid-cols-11 gap-1 mt-3">
              {Array.from({ length: 11 }, (_, n) => n).map((n) => {
                const active = nota === n;
                const color = n >= 9 ? "emerald" : n >= 7 ? "amber" : "rose";
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNota(n)}
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
          </div>

          <div>
            <Label>Comentário (opcional)</Label>
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              placeholder="O que mais influenciou sua nota?"
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Setor (opcional)</Label>
              <Input value={setor} onChange={(e) => setSetor(e.target.value)} maxLength={100} />
            </div>
            <div>
              <Label>Liderança (opcional)</Label>
              <Input value={lideranca} onChange={(e) => setLideranca(e.target.value)} maxLength={100} />
            </div>
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
