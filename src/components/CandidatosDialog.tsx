import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Link2, Trash2, FileText, ExternalLink } from "lucide-react";
import { logAudit } from "@/lib/audit";

const ETAPAS = [
  { v: "inscrito", l: "Inscrito", color: "bg-slate-500" },
  { v: "triagem", l: "Triagem", color: "bg-blue-600" },
  { v: "entrevista", l: "Entrevista", color: "bg-amber-600" },
  { v: "admissao", l: "Admissão", color: "bg-emerald-600" },
  { v: "reprovado", l: "Reprovado", color: "bg-red-600" },
];

type Cand = {
  id: string;
  vaga_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  endereco: string | null;
  curriculo_url: string | null;
  etapa: string;
  origem: string;
  observacao: string | null;
  cargo_oferecido: string | null;
  salario: number | null;
  data_inicio: string | null;
  created_at: string;
  doc_token?: string | null;

type Vaga = {
  id: string;
  link_token: string | null;
  cargo: string | null;
  setor: string | null;
  status: string;
};

export function CandidatosDialog({ vaga, canEdit, onClose }: { vaga: Vaga; canEdit: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Cand[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [admDialog, setAdmDialog] = useState<Cand | null>(null);
  const [novo, setNovo] = useState({ nome: "", email: "", telefone: "", cidade: "", endereco: "", observacao: "", curriculo_url: "" });
  const [admForm, setAdmForm] = useState({ data_inicio: new Date().toISOString().slice(0, 10), cargo_oferecido: "", salario: "" });

  const linkPublico = vaga.link_token ? `${window.location.origin}/vaga/${vaga.link_token}` : "";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("vaga_candidatos")
      .select("*")
      .eq("vaga_id", vaga.id)
      .order("created_at", { ascending: false });
    setRows((data as Cand[]) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [vaga.id]);

  const adicionar = async () => {
    if (!novo.nome.trim()) return toast.error("Informe o nome");
    const { error } = await supabase.from("vaga_candidatos").insert({
      vaga_id: vaga.id,
      nome: novo.nome.trim(),
      email: novo.email || null,
      telefone: novo.telefone || null,
      cidade: novo.cidade || null,
      endereco: novo.endereco || null,
      observacao: novo.observacao || null,
      curriculo_url: novo.curriculo_url || null,
      origem: "manual",
    } as never);
    if (error) return toast.error(error.message);
    logAudit({ acao: "create", entidade: "vaga_candidatos", resumo: `Adicionou candidato ${novo.nome}` });
    toast.success("Candidato adicionado");
    setNovo({ nome: "", email: "", telefone: "", cidade: "", endereco: "", observacao: "", curriculo_url: "" });
    setAdding(false);
    load();
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${vaga.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("curriculos").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("curriculos").getPublicUrl(path);
    setNovo((n) => ({ ...n, curriculo_url: data.publicUrl }));
    toast.success("Currículo anexado");
  };

  const moverEtapa = async (c: Cand, etapa: string) => {
    if (etapa === "admissao") {
      setAdmForm({ data_inicio: new Date().toISOString().slice(0, 10), cargo_oferecido: c.cargo_oferecido || vaga.cargo || "", salario: c.salario ? String(c.salario) : "" });
      setAdmDialog(c);
      return;
    }
    const { error } = await supabase.from("vaga_candidatos").update({ etapa } as never).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  const confirmarAdmissao = async () => {
    if (!admDialog) return;
    if (!admForm.data_inicio) return toast.error("Informe a data de início");
    if (!admForm.cargo_oferecido) return toast.error("Informe o cargo");
    const { error } = await supabase.from("vaga_candidatos").update({
      etapa: "admissao",
      data_inicio: admForm.data_inicio,
      cargo_oferecido: admForm.cargo_oferecido,
      salario: admForm.salario ? Number(admForm.salario) : null,
    } as never).eq("id", admDialog.id);
    if (error) return toast.error(error.message);
    logAudit({ acao: "update", entidade: "vaga_candidatos", entidade_id: admDialog.id, resumo: `Movido para admissão: ${admDialog.nome}` });
    toast.success("Candidato movido para Admissão");
    setAdmDialog(null);
    load();
  };

  const remover = async (c: Cand) => {
    if (!confirm(`Remover candidato ${c.nome}?`)) return;
    await supabase.from("vaga_candidatos").delete().eq("id", c.id);
    load();
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico);
    toast.success("Link copiado!");
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Candidatos — {vaga.cargo || "Vaga"} {vaga.setor ? `(${vaga.setor})` : ""}</DialogTitle>
        </DialogHeader>

        {linkPublico && vaga.status === "aberta" && (
          <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/40">
            <Link2 className="h-4 w-4 text-primary shrink-0" />
            <Input readOnly value={linkPublico} className="text-xs" />
            <Button size="sm" variant="outline" onClick={copiarLink}>Copiar</Button>
            <Button size="sm" variant="ghost" onClick={() => window.open(linkPublico, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-muted-foreground">
            {rows.length} candidato(s) — {rows.filter((r) => r.origem === "link").length} via link
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setAdding((v) => !v)}>
              <Plus className="h-4 w-4 mr-1" /> {adding ? "Cancelar" : "Adicionar manualmente"}
            </Button>
          )}
        </div>

        {adding && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Nome *</Label><Input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={novo.cidade} onChange={(e) => setNovo({ ...novo, cidade: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Endereço</Label><Input value={novo.endereco} onChange={(e) => setNovo({ ...novo, endereco: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Currículo (PDF/DOC)</Label>
                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {novo.curriculo_url && <p className="text-xs text-emerald-600 mt-1">✓ Anexado</p>}
              </div>
              <div className="md:col-span-2"><Label>Observação</Label><Textarea rows={2} value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} /></div>
            </div>
            <Button onClick={adicionar} className="w-full">Salvar candidato</Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidato</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Inscrição</TableHead>
                <TableHead>CV</TableHead>
                <TableHead>Etapa</TableHead>
                {canEdit && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Nenhum candidato ainda.</TableCell></TableRow>
              ) : rows.map((c) => {
                const et = ETAPAS.find((e) => e.v === c.etapa) || ETAPAS[0];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium">{c.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.origem === "link" ? <Badge variant="outline" className="text-[10px] h-4">via link</Badge> : <Badge variant="secondary" className="text-[10px] h-4">manual</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.email && <div>{c.email}</div>}
                      {c.telefone && <div>{c.telefone}</div>}
                    </TableCell>
                    <TableCell className="text-xs">{c.cidade || "—"}</TableCell>
                    <TableCell className="text-xs">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {c.curriculo_url ? (
                        <a href={c.curriculo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" /> Ver
                        </a>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={c.etapa} onValueChange={(v) => moverEtapa(c, v)}>
                          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ETAPAS.map((e) => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${et.color} text-white`}>{et.l}</Badge>
                      )}
                      {c.etapa === "admissao" && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 space-y-0.5">
                          {c.data_inicio && <div>Início: {new Date(c.data_inicio).toLocaleDateString("pt-BR")}</div>}
                          <div>{c.cargo_oferecido}{c.salario != null && <> — R$ {Number(c.salario).toFixed(2)}</>}</div>
                          <button
                            type="button"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                            onClick={() => {
                              const link = `${window.location.origin}/doc/${(c as unknown as { doc_token?: string }).doc_token}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Link de coleta de documentos copiado!");
                            }}
                          >
                            <Link2 className="h-3 w-3" /> Copiar link de documentos
                          </button>
                        </div>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remover(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>

        {/* Diálogo: mover para Admissão */}
        <Dialog open={!!admDialog} onOpenChange={(o) => !o && setAdmDialog(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Mover {admDialog?.nome} para Admissão</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Data de início *</Label>
                <Input type="date" value={admForm.data_inicio} onChange={(e) => setAdmForm({ ...admForm, data_inicio: e.target.value })} />
              </div>
              <div>
                <Label>Cargo *</Label>
                <Input value={admForm.cargo_oferecido} onChange={(e) => setAdmForm({ ...admForm, cargo_oferecido: e.target.value })} />
              </div>
              <div>
                <Label>Salário (R$)</Label>
                <Input type="number" step="0.01" value={admForm.salario} onChange={(e) => setAdmForm({ ...admForm, salario: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdmDialog(null)}>Cancelar</Button>
              <Button onClick={confirmarAdmissao}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
