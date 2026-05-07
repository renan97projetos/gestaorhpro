import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, CheckCircle2, Megaphone } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Aviso {
  id: string;
  titulo: string;
  resumo: string;
  conteudo: string | null;
  criticidade: string;
}

const critIcon = (c: string) =>
  c === "alerta" ? <AlertTriangle className="h-5 w-5 text-amber-500" /> :
  c === "sucesso" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
  <Info className="h-5 w-5 text-blue-500" />;

export function AvisoPopup() {
  const { user } = useAuth();
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: avisos } = await supabase
        .from("avisos")
        .select("id,titulo,resumo,conteudo,criticidade")
        .eq("ativo", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!avisos || avisos.length === 0) return;
      const { data: lidos } = await supabase
        .from("avisos_leituras")
        .select("aviso_id")
        .eq("user_id", user.id)
        .in("aviso_id", avisos.map(a => a.id));
      const lidosSet = new Set((lidos || []).map(l => l.aviso_id));
      const naoLido = avisos.find(a => !lidosSet.has(a.id));
      if (naoLido) setAviso(naoLido as Aviso);
    })();
  }, [user]);

  const fechar = async () => {
    if (!aviso || !user) return;
    await supabase.from("avisos_leituras").insert({ aviso_id: aviso.id, user_id: user.id });
    setAviso(null);
  };

  if (!aviso) return null;

  return (
    <Dialog open={true} onOpenChange={(o) => { if (!o) fechar(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-4 w-4" />
            <Badge variant="outline" className="capitalize">{aviso.criticidade}</Badge>
          </div>
          <DialogTitle className="flex items-start gap-2">
            {critIcon(aviso.criticidade)}
            <span>{aviso.titulo}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm">{aviso.resumo}</p>
          {aviso.conteudo && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{aviso.conteudo}</p>}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Link to="/avisos" onClick={fechar}>
            <Button variant="ghost">Ver todos</Button>
          </Link>
          <Button onClick={fechar}>Entendi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
