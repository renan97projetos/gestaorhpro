import { useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  empresaId: string | undefined;
  userId: string | undefined;
  onImported: () => void;
};

// Definição das colunas aceitas (cabeçalhos esperados na planilha)
const COLUNAS: { key: string; label: string; required?: boolean; hint?: string }[] = [
  { key: "matricula", label: "matricula", required: true, hint: "Texto único" },
  { key: "colaborador", label: "colaborador", required: true, hint: "Nome completo" },
  { key: "status", label: "status", hint: "Ativo | Demitido | Afastado | Ferias" },
  { key: "sexo", label: "sexo", hint: "Masculino | Feminino" },
  { key: "cargo", label: "cargo" },
  { key: "setor", label: "setor" },
  { key: "subsetor", label: "subsetor" },
  { key: "lideranca", label: "lideranca" },
  { key: "turno", label: "turno" },
  { key: "sabado_trabalho", label: "sabado_trabalho", hint: "Sim | Não" },
  { key: "sabado_horario", label: "sabado_horario" },
  { key: "horario_almoco", label: "horario_almoco" },
  { key: "horario_cafe", label: "horario_cafe" },
  { key: "admissao", label: "admissao", hint: "AAAA-MM-DD" },
  { key: "data_nascimento", label: "data_nascimento", hint: "AAAA-MM-DD" },
  { key: "cidade", label: "cidade" },
  { key: "bairro", label: "bairro" },
  { key: "tem_filho", label: "tem_filho", hint: "Sim | Não" },
  { key: "data_demissao", label: "data_demissao", hint: "AAAA-MM-DD" },
  { key: "tipo_demissao", label: "tipo_demissao" },
];

const STATUS_VALIDOS = ["Ativo", "Demitido", "Afastado", "Ferias"];

function excelDateToISO(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(v).trim();
  if (!s) return null;
  // Já no formato ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // dd/mm/aaaa
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return s;
}

function downloadModelo() {
  const headers = COLUNAS.map((c) => c.label);
  const exemplo = [
    "0001", "João da Silva", "Ativo", "Masculino", "Operador", "Produção",
    "Linha 1", "Maria Lima", "Manhã", "Não", "", "12:00-13:00", "09:30-09:45",
    "2024-01-15", "1990-05-20", "São Paulo", "Centro", "Sim", "", "",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exemplo]);
  ws["!cols"] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");
  XLSX.writeFile(wb, "modelo-colaboradores.xlsx");
}

export function ImportarColaboradoresDialog({ open, onOpenChange, empresaId, userId, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const reset = () => { setFile(null); setPreview([]); setErrors([]); };

  const handleFile = async (f: File) => {
    setFile(f);
    setErrors([]);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const errs: string[] = [];
      const normalized = rows.map((r, idx) => {
        const obj: Record<string, unknown> = {};
        // case-insensitive lookup
        const keysLower: Record<string, string> = {};
        Object.keys(r).forEach((k) => (keysLower[k.trim().toLowerCase()] = k));
        COLUNAS.forEach((c) => {
          const realKey = keysLower[c.label.toLowerCase()];
          let val: unknown = realKey ? r[realKey] : "";
          if (typeof val === "string") val = val.trim();
          if (val === "") val = null;
          if (["admissao", "data_nascimento", "data_demissao"].includes(c.key)) {
            val = val ? excelDateToISO(val) : null;
          }
          obj[c.key] = val;
        });
        if (!obj.matricula) errs.push(`Linha ${idx + 2}: matrícula vazia`);
        if (!obj.colaborador) errs.push(`Linha ${idx + 2}: nome vazio`);
        if (obj.status && !STATUS_VALIDOS.includes(String(obj.status))) {
          errs.push(`Linha ${idx + 2}: status inválido "${obj.status}"`);
        }
        if (!obj.status) obj.status = "Ativo";
        return obj;
      });
      setPreview(normalized);
      setErrors(errs);
    } catch (e) {
      toast.error("Erro ao ler arquivo: " + (e as Error).message);
    }
  };

  const handleImport = async () => {
    if (!empresaId || !userId) return toast.error("Empresa não selecionada");
    if (!preview.length) return toast.error("Nenhum registro para importar");
    if (errors.length) return toast.error("Corrija os erros antes de importar");
    setImporting(true);
    const payload = preview.map((r) => ({ ...r, empresa_id: empresaId, created_by: userId }));
    // inserir em lotes de 200
    let inseridos = 0;
    for (let i = 0; i < payload.length; i += 200) {
      const slice = payload.slice(i, i + 200);
      const { error } = await supabase.from("colaboradores").insert(slice as never);
      if (error) {
        setImporting(false);
        toast.error(`Erro no lote ${i / 200 + 1}: ${error.message}`);
        return;
      }
      inseridos += slice.length;
    }
    setImporting(false);
    toast.success(`${inseridos} colaborador(es) importado(s) com sucesso`);
    reset();
    onOpenChange(false);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar colaboradores via Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-4 bg-muted/30">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="font-semibold text-sm">Colunas aceitas na planilha</h4>
                <p className="text-xs text-muted-foreground">
                  Use exatamente estes cabeçalhos na primeira linha. Campos com <Badge variant="destructive" className="text-[10px] px-1 py-0">obrigatório</Badge> não podem ficar vazios.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadModelo}>
                <Download className="h-4 w-4 mr-1" /> Baixar modelo
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 text-xs">
              {COLUNAS.map((c) => (
                <div key={c.key} className="flex items-center gap-1.5 bg-background rounded px-2 py-1 border">
                  <code className="font-mono text-primary">{c.label}</code>
                  {c.required && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">obr.</Badge>}
                  {c.hint && <span className="text-muted-foreground truncate" title={c.hint}>· {c.hint}</span>}
                </div>
              ))}
            </div>
          </Card>

          <div>
            <label className="text-sm font-medium mb-2 block">Selecione o arquivo (.xlsx, .xls, .csv)</label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>

          {file && (
            <Card className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary">{preview.length} registro(s)</Badge>
              </div>
              {errors.length > 0 ? (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-destructive text-sm font-medium">
                    <AlertCircle className="h-4 w-4" /> {errors.length} erro(s) encontrados:
                  </div>
                  {errors.slice(0, 20).map((e, i) => (
                    <p key={i} className="text-xs text-destructive pl-5">• {e}</p>
                  ))}
                  {errors.length > 20 && <p className="text-xs text-muted-foreground pl-5">… +{errors.length - 20}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" /> Pronto para importar
                </div>
              )}
              {preview.length > 0 && (
                <div className="mt-3 max-h-48 overflow-auto border rounded">
                  <table className="text-xs w-full">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="text-left p-1.5">matricula</th>
                        <th className="text-left p-1.5">colaborador</th>
                        <th className="text-left p-1.5">cargo</th>
                        <th className="text-left p-1.5">setor</th>
                        <th className="text-left p-1.5">status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-1.5">{String(r.matricula ?? "")}</td>
                          <td className="p-1.5">{String(r.colaborador ?? "")}</td>
                          <td className="p-1.5">{String(r.cargo ?? "")}</td>
                          <td className="p-1.5">{String(r.setor ?? "")}</td>
                          <td className="p-1.5">{String(r.status ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="text-xs text-muted-foreground p-2">… +{preview.length - 10} linhas</p>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleImport}
            disabled={!preview.length || errors.length > 0 || importing}
            className="bg-[image:var(--gradient-primary)]"
          >
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Importar {preview.length > 0 ? `(${preview.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
