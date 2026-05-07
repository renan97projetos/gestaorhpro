import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/vaga/$token")({
  component: PaginaCandidatura,
});

type Vaga = {
  id: string;
  cargo: string | null;
  setor: string | null;
  turno: string | null;
  observacao: string | null;
  status: string;
};

function PaginaCandidatura() {
  const { token } = Route.useParams();
  const [vaga, setVaga] = useState<Vaga | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", cidade: "", endereco: "", observacao: "" });
  const [cv, setCv] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vagas_publicas" as never)
        .select("id,cargo,setor,turno")
        .eq("link_token", token)
        .maybeSingle();
      setVaga(data ? ({ ...(data as object), status: "aberta", observacao: null } as Vaga) : null);
      setLoading(false);
    })();
  }, [token]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaga) return;
    if (!form.nome.trim()) return toast.error("Informe seu nome");
    setEnviando(true);
    let curriculo_url: string | null = null;
    if (cv) {
      const ext = cv.name.split(".").pop();
      const path = `${vaga.id}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("curriculos").upload(path, cv);
      if (up.error) {
        toast.error("Falha ao enviar currículo: " + up.error.message);
        setEnviando(false);
        return;
      }
      curriculo_url = supabase.storage.from("curriculos").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("vaga_candidatos").insert({
      vaga_id: vaga.id,
      nome: form.nome.trim(),
      email: form.email || null,
      telefone: form.telefone || null,
      cidade: form.cidade || null,
      endereco: form.endereco || null,
      observacao: form.observacao || null,
      curriculo_url,
      origem: "link",
    } as never);
    setEnviando(false);
    if (error) return toast.error(error.message);
    setEnviado(true);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!vaga) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="text-xl font-bold">Vaga não encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">O link pode ter expirado ou estar incorreto.</p>
      </Card>
    </div>
  );
  if (vaga.status !== "aberta") return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="text-xl font-bold">Vaga encerrada</h1>
        <p className="text-sm text-muted-foreground mt-2">Esta vaga não está mais recebendo inscrições.</p>
      </Card>
    </div>
  );

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/5 to-background">
      <Card className="p-8 max-w-md text-center space-y-3">
        <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
        <h1 className="text-2xl font-bold">Candidatura enviada!</h1>
        <p className="text-sm text-muted-foreground">Recebemos seus dados. Entraremos em contato em breve.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-primary/5 to-background">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{vaga.cargo || "Vaga aberta"}</h1>
              {vaga.setor && <p className="text-sm text-muted-foreground">{vaga.setor}{vaga.turno ? ` • ${vaga.turno}` : ""}</p>}
            </div>
          </div>
          {vaga.observacao && <p className="text-sm mt-3 whitespace-pre-wrap">{vaga.observacao}</p>}
        </Card>

        <Card className="p-6">
          <h2 className="font-bold mb-4">Cadastre-se para esta vaga</h2>
          <form onSubmit={enviar} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Nome completo *</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" /></div>
              <div><Label>Cidade</Label><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro" /></div>
              <div className="md:col-span-2">
                <Label>Currículo (PDF, DOC)</Label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setCv(e.target.files?.[0] || null)} />
              </div>
              <div className="md:col-span-2"><Label>Mensagem (opcional)</Label><Textarea rows={3} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
            </div>
            <Button type="submit" disabled={enviando} className="w-full">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar candidatura
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
