import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";
import { useState, useCallback } from "react";

/**
 * Dialog padrão exibido quando um usuário com perfil "visualizador" (role `usuario`)
 * tenta executar uma ação restrita a admin/gestor.
 */
export function BloqueioAcessoDialog({
  open,
  onOpenChange,
  acao,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  acao?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">Acesso bloqueado</DialogTitle>
          <DialogDescription className="text-center">
            {acao ?? "Esta ação"} é restrita a <strong>administradores</strong> e{" "}
            <strong>gestores</strong>. Seu perfil atual é apenas de visualização.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook que devolve { guard, dialog } — chame guard() antes da ação, e renderize {dialog}
 * em algum ponto da árvore. Se `allowed` for false, abre o pop-up e retorna false.
 */
export function useReadOnlyGuard(allowed: boolean, defaultAcao = "Esta ação") {
  const [open, setOpen] = useState(false);
  const [acao, setAcao] = useState<string | undefined>(undefined);

  const guard = useCallback(
    (acaoOverride?: string) => {
      if (allowed) return true;
      setAcao(acaoOverride ?? defaultAcao);
      setOpen(true);
      return false;
    },
    [allowed, defaultAcao],
  );

  const dialog = (
    <BloqueioAcessoDialog open={open} onOpenChange={setOpen} acao={acao} />
  );

  return { guard, dialog };
}

/** Banner discreto indicando que o perfil é apenas de visualização. */
export function ReadOnlyBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-300/40 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700/40 p-3 text-amber-900 dark:text-amber-200 text-xs">
      <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
      <span>
        <strong>Modo visualização.</strong> Você só pode consultar os dados. Ações de criar,
        editar ou excluir são restritas a administradores e gestores.
      </span>
    </div>
  );
}
