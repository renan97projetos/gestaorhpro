import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Upload, FileText, Lock, ShieldCheck } from "lucide-react";
import { DOC_TIPOS } from "@/lib/doc-tipos";

export const Route = createFileRoute("/doc/$token")({
  component: DocCollectPage,
});

type Candidato = {
  id: string;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  cargo_oferecido: string | null;
  data_inicio: string | null;
  vaga_id: string;
};

type Doc = {
  id: string;
  tipo: string;
  url: string;
  nome_arquivo: string | null;
  uploaded_at: string;
};

function onlyDigits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function DocCollectPage() {
  const { token } = useParams({ from: "/doc/$token" });
  const [loading, setLoading] = useState(true);
  const [cand, setCand] = useState<Candidato | null>(null);
  const [authed, setAuthed] = useState(false);
  const [cpf, setCpf] = useState("");
  const [nasc, setNasc] = useState("");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vaga_candidatos")
        .select("id, nome, cpf, data_nascimento, cargo_oferecido, data_inicio, vaga_id")
        .eq("doc_token", token)
        .maybeSingle();
      setCand((data as Candidato) || null);
      setLoading(false);
      // tenta auto-login se já validou nessa sessão
      const saved = sessionStorage.getItem(`doc_auth_${token}`);
      if (saved && data) {
        setAuthed(true);
        await loadDocs((data as Candidato).id);
      }
    })();
  }, [token]);

  const loadDocs = async (candId: string) => {
    const { data } = await supabase
      .from("admissao_documentos")
      .select("*")
      .eq("candidato_id", candId)
      .order("uploaded_at", { ascending: false });
    setDocs((data as Doc[]) || []);
  };

  const validar = async () => {
    if (!cand) return;
    const cpfOk = cand.cpf ? onlyDigits(cand.cpf) === onlyDigits(cpf) : true;
    const nascOk = cand.data_nascimento ? cand.data_nascimento === nasc : true;
    if (!cand.cpf && !cand.data_nascimento) {
      // primeira vez — grava o que foi informado
      await supabase
        .from("vaga_candidatos")
        .update({ cpf: onlyDigits(cpf) || null, data_nascimento: nasc || null } as never)
        .eq("id", cand.id);
    } else if (!cpfOk || !nascOk) {
      return toast.error("CPF ou data de nascimento incorretos");
    }
    sessionStorage.setItem(`doc_auth_${token}`, "1");
    setAuthed(true);
    await loadDocs(cand.id);
    toast.success("Acesso liberado");
  };

  const upload = async (tipo: string, file: File) => {
    if (!cand) return;
    setUploading(tipo);
    const ext = file.name.split(".").pop();
    const path = `${cand.id}/${tipo}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documentos-admissao").upload(path, file);
    if (upErr) {
      setUploading(null);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("documentos-admissao").getPublicUrl(path);
    const { error } = await supabase.from("admissao_documentos").insert({
      candidato_id: cand.id,
      tipo,
      nome_arquivo: file.name,
      url: pub.publicUrl,
      storage_path: path,
    } as never);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success("Documento enviado!");
    await loadDocs(cand.id);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!cand) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="text-xl font-bold">Link inválido</h1>
        <p className="text-sm text-muted-foreground mt-2">Este link de coleta de documentos não foi encontrado.</p>
      </Card>
    </div>
  );

  if (!authed) {
    return (
      <div className="min-h-screen bg-[image:var(--gradient-soft)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Validação de identidade</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Olá, <b>{cand.nome}</b>. Para acessar o envio de documentos da sua admissão, confirme seus dados:
          </p>
          <div>
            <Label>CPF</Label>
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} />
          </div>
          <Button className="w-full" onClick={validar}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Validar e acessar
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Seus dados ficam salvos e você pode voltar a este link a qualquer momento para anexar mais documentos.
          </p>
        </Card>
      </div>
    );
  }

  const enviadosPorTipo = new Map<string, Doc>();
  docs.forEach((d) => { if (!enviadosPorTipo.has(d.tipo)) enviadosPorTipo.set(d.tipo, d); });
  const totalReq = DOC_TIPOS.length;
  const totalOk = DOC_TIPOS.filter((t) => enviadosPorTipo.has(t.key)).length;
  const pct = Math.round((totalOk / totalReq) * 100);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">{cand.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {cand.cargo_oferecido || "—"}
                {cand.data_inicio && ` • Início: ${new Date(cand.data_inicio).toLocaleDateString("pt-BR")}`}
              </p>
            </div>
            <Badge className={pct === 100 ? "bg-emerald-600" : "bg-amber-600"}>
              {totalOk}/{totalReq} documentos ({pct}%)
            </Badge>
          </div>
          <div className="mt-3 h-2 rounded bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </Card>

        <div className="grid gap-3">
          {DOC_TIPOS.map((t) => {
            const d = enviadosPorTipo.get(t.key);
            return (
              <Card key={t.key} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {d ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      {d && (
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                          {d.nome_arquivo || "Ver arquivo"} • {new Date(d.uploaded_at).toLocaleDateString("pt-BR")}
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <input
                      id={`f-${t.key}`}
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => e.target.files?.[0] && upload(t.key, e.target.files[0])}
                    />
                    <Button size="sm" variant={d ? "outline" : "default"} disabled={uploading === t.key} asChild>
                      <label htmlFor={`f-${t.key}`} className="cursor-pointer">
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        {uploading === t.key ? "Enviando..." : d ? "Reenviar" : "Anexar"}
                      </label>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-center text-muted-foreground py-4">
          Seus documentos ficam salvos e atrelados ao seu cadastro. Você pode voltar a este link quando quiser para enviar os que faltam.
        </p>
      </div>
    </div>
  );
}
