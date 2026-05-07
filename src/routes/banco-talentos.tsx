import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { Briefcase, Construction, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/banco-talentos")({
  component: () => (
    <RequireAuth>
      <BancoTalentosPage />
    </RequireAuth>
  ),
});

function BancoTalentosPage() {
  const { isAdminMestre } = useEmpresa();

  return (
    <AppLayout>
      <main className="min-h-full bg-[image:var(--gradient-soft)] px-4 md:px-6 py-10">
        <div className="max-w-5xl mx-auto">
          {isAdminMestre ? (
            <Card className="p-10 md:p-16 text-center space-y-6">
              <div className="inline-flex h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 items-center justify-center mx-auto shadow-lg">
                <Construction className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
                EM ANDAMENTO
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                O módulo <strong>Banco de Talentos PRO</strong> está em desenvolvimento.
                Em breve as empresas terão um repositório inteligente de currículos com
                triagem assistida, tags por competência e match automático com vagas abertas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto pt-4">
                {[
                  { t: "Triagem com IA", d: "Ranqueamento automático" },
                  { t: "Tags e filtros", d: "Busca por competência" },
                  { t: "Match com vagas", d: "Sugestões em tempo real" },
                ].map((f) => (
                  <Card key={f.t} className="p-4 text-left">
                    <Sparkles className="h-4 w-4 text-amber-500 mb-2" />
                    <p className="text-sm font-bold">{f.t}</p>
                    <p className="text-xs text-muted-foreground">{f.d}</p>
                  </Card>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-10 text-center space-y-4">
              <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 items-center justify-center mx-auto">
                <Briefcase className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Banco de Talentos PRO</h1>
              <p className="text-muted-foreground">Disponível em breve.</p>
            </Card>
          )}
        </div>
      </main>
      <EmBrevePopup />
    </AppLayout>
  );
}

function EmBrevePopup() {
  const { isAdminMestre } = useEmpresa();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAdminMestre) setOpen(true);
  }, [isAdminMestre]);

  if (isAdminMestre) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-2">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <DialogTitle>Banco de Talentos PRO</DialogTitle>
          <DialogDescription>
            Esta funcionalidade já vai estar liberada em breve. Estamos preparando um
            repositório de currículos com triagem inteligente, tags por competência e
            match automático com as vagas da sua empresa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
