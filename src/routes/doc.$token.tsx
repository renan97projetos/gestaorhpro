import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Upload, FileText, Lock, ShieldCheck } from "lucide-react";
import { DOC_TIPOS } from "@/lib/doc-tipos";
import {
  getCandidatePublicInfo,
  validateCandidateAccess,
  initCandidateIdentity,
  listCandidateDocs,
  uploadCandidateDoc,
} from "@/lib/admissao-docs.functions";

export const Route = createFileRoute("/doc/$token")({
  component: DocCollectPage,
});

type PublicInfo = {
  nome: string;
  cargo_oferecido: string | null;
  data_inicio: string | null;
  hasIdentity: boolean;
};

type Doc = {
  id: string;
  tipo: string;
  url: string | null;
  nome_arquivo: string | null;
  uploaded_at: string;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      res(result.split(",")[1] || "");
    };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function DocCollectPage() {
  const { token } = useParams({ from: "/doc/$token" });
  const getInfo = useServerFn(getCandidatePublicInfo);
  const validate = useServerFn(validateCandidateAccess);
  const initId = useServerFn(initCandidateIdentity);
  const listDocs = useServerFn(listCandidateDocs);
  const uploadDoc = useServerFn(uploadCandidateDoc);

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<PublicInfo | null>(null);
  const [authed, setAuthed] = useState(false);
  const [cpf, setCpf] = useState("");
  const [nasc, setNasc] = useState("");
  const [creds, setCreds] = useState<{ cpf: string; dob: string } | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const i = await getInfo({ data: { token } });
        setInfo(i);
      } catch {
        setInfo(null);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const refresh = async (c: { cpf: string; dob: string }) => {
    const { docs } = await listDocs({ data: { token, cpf: c.cpf, dob: c.dob } });
    setDocs(docs);
  };

  const validar = async () => {
    if (!info) return;
    setSubmitting(true);
    try {
      if (!info.hasIdentity) {
        // First time: register CPF + DOB
        await initId({ data: { token, cpf, dob: nasc } });
      }
      await validate({ data: { token, cpf, dob: nasc } });
      const c = { cpf, dob: nasc };
      setCreds(c);
      setAuthed(true);
      await refresh(c);
      toast.success("Acesso liberado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na validação");
    } finally {
      setSubmitting(false);
    }
  };

  const upload = async (tipo: string, file: File) => {
    if (!creds) return;
    if (file.size > 15 * 1024 * 1024) return toast.error("Arquivo maior que 15MB");
    setUploading(tipo);
    try {
      const fileBase64 = await fileToBase64(file);
      await uploadDoc({
        data: {
          token,
          cpf: creds.cpf,
          dob: creds.dob,
          tipo,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          fileBase64,
        },
      });
      toast.success("Documento enviado!");
      await refresh(creds);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio");
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!info)
    return (
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
            <h1 className="text-xl font-bold">
              {info.hasIdentity ? "Validação de identidade" : "Cadastro inicial"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Olá, <b>{info.nome}</b>.{" "}
            {info.hasIdentity
              ? "Para acessar o envio de documentos, confirme seus dados:"
              : "Este é seu primeiro acesso. Defina seu CPF e data de nascimento — eles serão usados nos próximos acessos."}
          </p>
          <div>
            <Label>CPF</Label>
            <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
          </div>
          <div>
            <Label>Data de nascimento</Label>
            <Input type="date" value={nasc} onChange={(e) => setNasc(e.target.value)} />
          </div>
          <Button className="w-full" onClick={validar} disabled={submitting || !cpf || !nasc}>
            <ShieldCheck className="h-4 w-4 mr-2" /> {submitting ? "Validando..." : "Validar e acessar"}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Seus dados ficam salvos com segurança e você pode voltar a este link a qualquer momento para anexar mais documentos.
          </p>
        </Card>
      </div>
    );
  }

  const enviadosPorTipo = new Map<string, Doc>();
  docs.forEach((d) => {
    if (!enviadosPorTipo.has(d.tipo)) enviadosPorTipo.set(d.tipo, d);
  });
  const totalReq = DOC_TIPOS.length;
  const totalOk = DOC_TIPOS.filter((t) => enviadosPorTipo.has(t.key)).length;
  const pct = Math.round((totalOk / totalReq) * 100);

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold">{info.nome}</h1>
              <p className="text-sm text-muted-foreground">
                {info.cargo_oferecido || "—"}
                {info.data_inicio && ` • Início: ${new Date(info.data_inicio).toLocaleDateString("pt-BR")}`}
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
                      {d && d.url && (
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
