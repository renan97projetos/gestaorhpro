import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Gift } from "lucide-react";

type Aniv = { id: string; colaborador: string; cargo: string | null; setor: string | null; idade: number };

export function AniversarioPopup() {
  const { user, isGestor } = useAuth();
  const [list, setList] = useState<Aniv[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || !isGestor) return;
    let cancelado = false;
    (async () => {
      const { data } = await supabase
        .from("colaboradores")
        .select("id, colaborador, cargo, setor, data_nascimento, status")
        .in("status", ["Ativo", "Afastado", "Ferias"])
        .not("data_nascimento", "is", null);
      if (cancelado || !data) return;
      const hoje = new Date();
      const dia = hoje.getDate();
      const mes = hoje.getMonth();
      const aniversariantes: Aniv[] = [];
      for (const c of data) {
        if (!c.data_nascimento) continue;
        const [y, m, d] = c.data_nascimento.split("-").map(Number);
        if (m - 1 === mes && d === dia) {
          aniversariantes.push({
            id: c.id, colaborador: c.colaborador, cargo: c.cargo, setor: c.setor,
            idade: hoje.getFullYear() - y,
          });
        }
      }
      if (aniversariantes.length === 0) return;
      // mostra 1x por dia por usuário
      const chave = `aniv-popup-${user.id}-${hoje.toISOString().slice(0, 10)}`;
      if (localStorage.getItem(chave)) return;
      localStorage.setItem(chave, "1");
      setList(aniversariantes);
      setOpen(true);
    })();
    return () => { cancelado = true; };
  }, [user, isGestor]);

  if (!isGestor || list.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-pink-500" />
            Aniversariantes de hoje 🎂
          </DialogTitle>
          <DialogDescription>
            {list.length === 1 ? "1 colaborador faz aniversário hoje." : `${list.length} colaboradores fazem aniversário hoje.`} Que tal parabenizar?
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
          {list.map((c) => (
            <li key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-gradient-to-r from-pink-50 to-amber-50 dark:from-pink-950/20 dark:to-amber-950/20">
              <Gift className="h-5 w-5 text-pink-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{c.colaborador}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.idade} anos{c.cargo ? ` • ${c.cargo}` : ""}{c.setor ? ` • ${c.setor}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
          <Link to="/aniversariantes" onClick={() => setOpen(false)}>
            <Button className="bg-gradient-to-r from-pink-500 to-amber-400 text-white">Ver todos</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
