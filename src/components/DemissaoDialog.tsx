import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2 } from "lucide-react";

const TIPO_DEMISSAO_OPTS = [
  "Pedido de demissao",
  "Sem justa causa",
  "Com justa causa",
  "Acordo",
  "Fim de contrato",
] as const;

export type DemissaoData = {
  data_demissao: string;
  tipo_demissao: string;
};

export function DemissaoDialog({
  open,
  onClose,
  colaboradorNome,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  colaboradorNome: string;
  onConfirm: (data: DemissaoData) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tipo, setTipo] = useState("");
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setTipo("");
      setData(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!tipo) return;
    setSaving(true);
    await onConfirm({ data_demissao: data, tipo_demissao: tipo });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-md">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirmar Demissão
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja demitir o colaborador{" "}
              <strong className="text-foreground">{colaboradorNome}</strong>? Esta ação irá registrar
              a demissão e atualizar os indicadores de turnover.
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => setStep(2)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Demissão
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Motivo da Demissão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Selecione o motivo da demissão do colaborador <strong className="text-foreground">{colaboradorNome}</strong>:
            </p>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Motivo do Desligamento</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPO_DEMISSAO_OPTS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Data da demissão</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
              <Button
                onClick={handleConfirm}
                disabled={!tipo || saving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Demissão"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
