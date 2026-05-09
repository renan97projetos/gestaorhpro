import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, DoorOpen, Send } from "lucide-react";
import { toast } from "sonner";
import { PerguntaInput } from "./entrevistas-desligamento";

export const Route = createFileRoute("/desligamento/$token")({
  component: PaginaDesligamento,
});

type Entrevista = { id: string; modelo_id: string | null; status: string };
type Pergunta = { id: string; modelo_id: string; ordem: number; tipo: string; texto: string; opcoes: string[] | null; obrigatoria: boolean };
type Modelo = { id: string; titulo: string; descricao: string | null };

function PaginaDesligamento() {
  const { token } = Route.useParams();
  const [entrevista, setEntrevista] = useState<Entrevista | null>(null);
  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<string, { texto?: string; nota?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: e } = await supabase.from("desligamento_entrevistas").select("id,modelo_id,status").eq("token", token).maybeSingle();
      if (!e) { setLoading(false); return; }
      const ent = e as Entrevista;
      setEntrevista(ent);
      if (ent.modelo_id) {
        const [m, p] = await Promise.all([
          supabase.from("desligamento_modelos").select("id,titulo,descricao").eq("id", ent.modelo_id).maybeSingle(),
          supabase.from("desligamento_perguntas").select("*").eq("modelo_id", ent.modelo_id).order("ordem"),
        ]);
        setModelo(m.data as Modelo | null);
        setPerguntas((p.data as Pergunta[]) || []);
      }
      setLoading(false);
    })();
  }, [token]);

  const enviar = async () => {
    if (!entrevista) return;
    for (const p of perguntas) {
      const r = respostas[p.id];
      const vazio = !r || (r.texto === undefined && r.nota === undefined) || (r.texto !== undefined && !r.texto.trim() && r.nota === undefined);
      if (p.obrigatoria && vazio) return toast.error(`Responda: ${p.texto}`);
    }
    setEnviando(true);
    const payload = perguntas.map((p) => ({
      entrevista_id: entrevista.id,
      pergunta_id: p.id,
      valor_texto: respostas[p.id]?.texto ?? null,
      valor_nota: respostas[p.id]?.nota ?? null,
    }));
    const ins = await supabase.from("desligamento_respostas").insert(payload as never);
    if (ins.error) { toast.error(ins.error.message); setEnviando(false); return; }
    await supabase.from("desligamento_entrevistas").update({ status: "respondida", respondida_em: new Date().toISOString() } as never).eq("id", entrevista.id);
    setEnviando(false);
    setEnviado(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!entrevista) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="text-xl font-bold">Entrevista não encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">O link pode ter expirado.</p>
      </Card>
    </div>
  );
  if (entrevista.status !== "pendente" || enviado) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-background">
      <Card className="p-8 max-w-md text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <h1 className="text-2xl font-bold">Obrigado!</h1>
        <p className="text-sm text-muted-foreground">Suas respostas foram registradas. Desejamos sucesso na sua próxima jornada.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-background">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <DoorOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{modelo?.titulo || "Entrevista de Desligamento"}</h1>
              {modelo?.descricao && <p className="text-sm text-muted-foreground mt-1">{modelo.descricao}</p>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Suas respostas são valiosas para melhorarmos como empresa. Leva poucos minutos.</p>
        </Card>

        <Card className="p-6 space-y-3">
          {perguntas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta entrevista ainda não tem perguntas configuradas.</p>
          ) : perguntas.map((p, i) => (
            <PerguntaInput
              key={p.id}
              index={i + 1}
              pergunta={p}
              valor={respostas[p.id] || {}}
              onChange={(v) => setRespostas({ ...respostas, [p.id]: v })}
            />
          ))}
          {perguntas.length > 0 && (
            <Button onClick={enviar} disabled={enviando} className="w-full">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Enviar respostas
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
