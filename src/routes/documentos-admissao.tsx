import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Link2, Copy, ExternalLink, CheckCircle2, Upload, Trash2, Search } from "lucide-react";
import { DOC_TIPOS } from "@/lib/doc-tipos";
import { useServerFn } from "@tanstack/react-start";
import { getDocSignedUrl } from "@/lib/admissao-docs.functions";

export const Route = createFileRoute("/documentos-admissao")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

type Cand = {
  id: string;
  nome: string;
  cpf: string | null;
  data_nascimento: string | null;
  cargo_oferecido: string | null;
  data_inicio: string | null;
  doc_token: string | null;
  vaga_id: string;
  empresa_id: string | null;
};

type Doc = {
  id: string;
  candidato_id: string;
  tipo: string;
  nome_arquivo: string | null;
  url: string;
  storage_path: string | null;
  uploaded_at: string;
};

function Page() {
  const { empresaAtual, isAdminMestre, canEdit } = useEmpresa();
  const [cands, setCands] = useState<Cand[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Cand | null>(null);

  const load = async () => {
    if (!empresaAtual) return;
    setLoading(true);
    // pega todas as vagas da empresa
    const { data: vagas } = await supabase
      .from("admissoes_movimentacao")
      .select("id, empresa_id")
      .eq("empresa_id", empresaAtual.id);
    const vagaIds = (vagas || []).map((v: { id: string }) => v.id);
    if (vagaIds.length === 0) {
      setCands([]); setDocs([]); setLoading(false); return;
    }
    const { data: cs } = await supabase
      .from("vaga_candidatos")
      .select("id, nome, cpf, data_nascimento, cargo_oferecido, data_inicio, doc_token, vaga_id")
      .in("vaga_id", vagaIds)
      .eq("etapa", "admissao")
      .order("data_inicio", { ascending: false });
    const candList = (cs || []).map((c) => ({ ...c, empresa_id: empresaAtual.id })) as Cand[];
    setCands(candList);
    const candIds = candList.map((c) => c.id);
    if (candIds.length > 0) {
      const { data: ds } = await supabase
        .from("admissao_documentos")
        .select("*")
        .in("candidato_id", candIds);
      setDocs((ds as Doc[]) || []);
    } else setDocs([]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [empresaAtual?.id]);

  const docsByCand = useMemo(() => {
    const m = new Map<string, Set<string>>();
    docs.forEach((d) => {
      if (!m.has(d.candidato_id)) m.set(d.candidato_id, new Set());
      m.get(d.candidato_id)!.add(d.tipo);
    });
    return m;
  }, [docs]);

  const pct = (id: string) => {
    const set = docsByCand.get(id);
    if (!set) return 0;
    return Math.round((Array.from(set).filter((t) => DOC_TIPOS.find((d) => d.key === t)).length / DOC_TIPOS.length) * 100);
  };

  const filtered = cands.filter((c) =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.cargo_oferecido || "").toLowerCase().includes(busca.toLowerCase())
  );

  const linkOf = (c: Cand) => `${window.location.origin}/doc/${c.doc_token}`;

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Link copiado!"); };

  return (
    <AppLayout>
      <main className="px-4 md:px-6 py-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Documentos de Admissão</h1>
            <p className="text-sm text-muted-foreground">Profissionais admitidos e progresso de coleta de documentos</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input className="pl-8 w-64" placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Documentos</TableHead>
                <TableHead>Link</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum candidato em admissão ainda.</TableCell></TableRow>
              ) : filtered.map((c) => {
                const p = pct(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-sm">{c.cargo_oferecido || "—"}</TableCell>
                    <TableCell className="text-sm">{c.data_inicio ? new Date(c.data_inicio).toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[160px]">
                        <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                          <div className={`h-full ${p === 100 ? "bg-emerald-600" : "bg-amber-500"}`} style={{ width: `${p}%` }} />
                        </div>
                        <Badge variant={p === 100 ? "default" : "secondary"} className={p === 100 ? "bg-emerald-600" : ""}>
                          {p}%
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.doc_token && (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => copy(linkOf(c))}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(linkOf(c), "_blank")}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => setAberto(c)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Ver documentos
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {aberto && (
          <DocsCandDialog
            cand={aberto}
            docs={docs.filter((d) => d.candidato_id === aberto.id)}
            canEdit={canEdit || isAdminMestre}
            onClose={() => setAberto(null)}
            onChanged={load}
          />
        )}
      </main>
    </AppLayout>
  );
}

function DocsCandDialog({ cand, docs, canEdit, onClose, onChanged }: { cand: Cand; docs: Doc[]; canEdit: boolean; onClose: () => void; onChanged: () => void }) {
  const link = `${window.location.origin}/doc/${cand.doc_token}`;
  const [uploading, setUploading] = useState<string | null>(null);

  const docByTipo = new Map<string, Doc>();
  docs.forEach((d) => { if (!docByTipo.has(d.tipo)) docByTipo.set(d.tipo, d); });

  const upload = async (tipo: string, file: File) => {
    setUploading(tipo);
    const ext = file.name.split(".").pop();
    const path = `${cand.id}/${tipo}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documentos-admissao").upload(path, file);
    if (upErr) { setUploading(null); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("documentos-admissao").getPublicUrl(path);
    // garante etapa admissao para passar policy
    await supabase.from("vaga_candidatos").update({ etapa: "admissao" } as never).eq("id", cand.id);
    const { error } = await supabase.from("admissao_documentos").insert({
      candidato_id: cand.id, tipo, nome_arquivo: file.name, url: pub.publicUrl, storage_path: path,
    } as never);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success("Anexado");
    onChanged();
  };

  const remover = async (d: Doc) => {
    if (!confirm("Remover este documento?")) return;
    if (d.storage_path) await supabase.storage.from("documentos-admissao").remove([d.storage_path]);
    await supabase.from("admissao_documentos").delete().eq("id", d.id);
    onChanged();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos — {cand.nome}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
          <Link2 className="h-4 w-4 text-primary shrink-0" />
          <Input readOnly value={link} className="text-xs" />
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copiado"); }}>Copiar</Button>
          <Button size="sm" variant="ghost" onClick={() => window.open(link, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          O candidato valida com CPF e data de nascimento ({cand.cpf || "—"} • {cand.data_nascimento || "—"}) e pode voltar quando quiser.
        </p>

        <div className="grid gap-2">
          {DOC_TIPOS.map((t) => {
            const d = docByTipo.get(t.key);
            return (
              <Card key={t.key} className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {d ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.label}</p>
                      {d && (
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline truncate block">
                          {d.nome_arquivo || "arquivo"} • {new Date(d.uploaded_at).toLocaleDateString("pt-BR")}
                        </a>
                      )}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <input id={`u-${t.key}`} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && upload(t.key, e.target.files[0])} />
                      <Button size="sm" variant={d ? "outline" : "default"} disabled={uploading === t.key} asChild>
                        <label htmlFor={`u-${t.key}`} className="cursor-pointer">
                          <Upload className="h-3 w-3 mr-1" />{uploading === t.key ? "..." : d ? "Reenviar" : "Anexar"}
                        </label>
                      </Button>
                      {d && (
                        <Button size="icon" variant="ghost" onClick={() => remover(d)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
