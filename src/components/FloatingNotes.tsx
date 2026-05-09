import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Minus, GripHorizontal, StickyNote, Save } from "lucide-react";
import { cn } from "@/lib/utils";

type Nota = {
  id: string;
  titulo: string;
  conteudo: string | null;
  cor: string | null;
};

type FloatState = {
  id: string;
  minimized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Ctx = {
  scope: "global" | "modulo";
  setScope: (s: "global" | "modulo") => void;
  floatingIds: string[];
  isFloating: (id: string) => boolean;
  toggleFloating: (n: { id: string }) => void;
  closeFloating: (id: string) => void;
};

const FloatingNotesContext = createContext<Ctx | null>(null);

const LS_IDS = "floatingNotes:ids";
const LS_STATES = "floatingNotes:states";
const LS_SCOPE = "floatingNotes:scope";

export function FloatingNotesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  const [scope, setScopeState] = useState<"global" | "modulo">(() => {
    if (typeof window === "undefined") return "global";
    return (localStorage.getItem(LS_SCOPE) as "global" | "modulo") || "global";
  });
  const setScope = (s: "global" | "modulo") => {
    setScopeState(s);
    try { localStorage.setItem(LS_SCOPE, s); } catch { /* ignore */ }
  };

  const [floatingIds, setFloatingIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(LS_IDS) || "[]"); } catch { return []; }
  });
  const [states, setStates] = useState<Record<string, FloatState>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(LS_STATES) || "{}"); } catch { return {}; }
  });
  const [notas, setNotas] = useState<Record<string, Nota>>({});

  useEffect(() => { try { localStorage.setItem(LS_IDS, JSON.stringify(floatingIds)); } catch { /* ignore */ } }, [floatingIds]);
  useEffect(() => { try { localStorage.setItem(LS_STATES, JSON.stringify(states)); } catch { /* ignore */ } }, [states]);

  // Carrega conteúdo das notas flutuantes
  useEffect(() => {
    if (!user || floatingIds.length === 0) { setNotas({}); return; }
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("notas")
        .select("id, titulo, conteudo, cor")
        .in("id", floatingIds)
        .eq("user_id", user.id);
      if (cancel) return;
      const map: Record<string, Nota> = {};
      ((data as Nota[]) || []).forEach((n) => { map[n.id] = n; });
      setNotas(map);
      // remove ids que não existem mais
      const existentes = Object.keys(map);
      setFloatingIds((prev) => prev.filter((id) => existentes.includes(id)));
    })();
    return () => { cancel = true; };
  }, [user, floatingIds.length]);

  const toggleFloating = useCallback((n: { id: string }) => {
    setFloatingIds((prev) => prev.includes(n.id) ? prev.filter((x) => x !== n.id) : [...prev, n.id]);
    setStates((prev) => prev[n.id] ? prev : {
      ...prev,
      [n.id]: {
        id: n.id, minimized: false,
        x: 80 + (Object.keys(prev).length % 5) * 30,
        y: 80 + (Object.keys(prev).length % 5) * 30,
        w: 280, h: 240,
      },
    });
  }, []);

  const closeFloating = useCallback((id: string) => {
    setFloatingIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const isFloating = useCallback((id: string) => floatingIds.includes(id), [floatingIds]);

  // Esconde camada flutuante quando o escopo é "modulo" e o usuário está fora de /notas
  const visivel = scope === "global" || location.pathname.startsWith("/notas");

  const updateNota = useCallback(async (id: string, patch: Partial<Nota>) => {
    setNotas((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    await supabase.from("notas").update(patch as never).eq("id", id);
  }, []);

  const updateState = useCallback((id: string, patch: Partial<FloatState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const ctx = useMemo<Ctx>(() => ({ scope, setScope, floatingIds, isFloating, toggleFloating, closeFloating }), [scope, floatingIds, isFloating, toggleFloating, closeFloating]);

  return (
    <FloatingNotesContext.Provider value={ctx}>
      {children}
      {visivel && floatingIds.length > 0 && (
        <FloatingLayer
          ids={floatingIds}
          notas={notas}
          states={states}
          updateNota={updateNota}
          updateState={updateState}
          onClose={closeFloating}
        />
      )}
    </FloatingNotesContext.Provider>
  );
}

export function useFloatingNotes() {
  const ctx = useContext(FloatingNotesContext);
  if (!ctx) throw new Error("FloatingNotesProvider faltando");
  return ctx;
}

// ============ Layer ============
function FloatingLayer({
  ids, notas, states, updateNota, updateState, onClose,
}: {
  ids: string[];
  notas: Record<string, Nota>;
  states: Record<string, FloatState>;
  updateNota: (id: string, patch: Partial<Nota>) => void;
  updateState: (id: string, patch: Partial<FloatState>) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[60]">
      {ids.map((id) => {
        const n = notas[id];
        const s = states[id];
        if (!n || !s) return null;
        return (
          <FloatingNoteWindow
            key={id}
            nota={n}
            state={s}
            onChange={(patch) => updateNota(id, patch)}
            onMove={(patch) => updateState(id, patch)}
            onClose={() => onClose(id)}
          />
        );
      })}
    </div>
  );
}

function FloatingNoteWindow({
  nota, state, onChange, onMove, onClose,
}: {
  nota: Nota;
  state: FloatState;
  onChange: (patch: Partial<Nota>) => void;
  onMove: (patch: Partial<FloatState>) => void;
  onClose: () => void;
}) {
  const [conteudo, setConteudo] = useState(nota.conteudo || "");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setConteudo(nota.conteudo || ""); }, [nota.id]);

  const scheduleSave = (val: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onChange({ conteudo: val });
      setSavedAt(Date.now());
    }, 600);
  };

  const onDragStart = (e: React.MouseEvent) => {
    dragRef.current = { x: state.x, y: state.y, startX: e.clientX, startY: e.clientY };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  };
  const onDragMove = (e: MouseEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    onMove({
      x: Math.max(0, Math.min(window.innerWidth - 60, dragRef.current.x + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, dragRef.current.y + dy)),
    });
  };
  const onDragEnd = () => {
    dragRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
  };

  if (state.minimized) {
    return (
      <button
        onClick={() => onMove({ minimized: false })}
        style={{ left: state.x, top: state.y, background: nota.cor || "#FEF3C7" }}
        className="absolute pointer-events-auto h-9 px-3 rounded-full shadow-lg flex items-center gap-2 text-slate-900 text-xs font-medium hover:shadow-xl transition-shadow"
      >
        <StickyNote className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{nota.titulo}</span>
      </button>
    );
  }

  return (
    <div
      className="absolute pointer-events-auto rounded-lg shadow-2xl border border-black/10 flex flex-col overflow-hidden"
      style={{ left: state.x, top: state.y, width: state.w, height: state.h, background: nota.cor || "#FEF3C7" }}
    >
      <div
        onMouseDown={onDragStart}
        className="flex items-center gap-1 px-2 py-1.5 bg-black/10 cursor-grab active:cursor-grabbing select-none"
      >
        <GripHorizontal className="h-3.5 w-3.5 text-slate-700 shrink-0" />
        <span className="text-xs font-semibold text-slate-900 truncate flex-1">{nota.titulo}</span>
        {savedAt && <Save className="h-3 w-3 text-slate-700/70" />}
        <button onClick={() => onMove({ minimized: true })} className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-black/10" title="Minimizar">
          <Minus className="h-3 w-3 text-slate-800" />
        </button>
        <button onClick={onClose} className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-black/10" title="Fechar">
          <X className="h-3 w-3 text-slate-800" />
        </button>
      </div>
      <Textarea
        value={conteudo}
        onChange={(e) => { setConteudo(e.target.value); scheduleSave(e.target.value); }}
        className="flex-1 resize-none border-0 bg-transparent text-slate-900 placeholder:text-slate-600 focus-visible:ring-0 rounded-none text-sm"
        placeholder="Escreva sua anotação..."
      />
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX, startY = e.clientY, startW = state.w, startH = state.h;
          const move = (ev: MouseEvent) => onMove({
            w: Math.max(200, startW + (ev.clientX - startX)),
            h: Math.max(140, startH + (ev.clientY - startY)),
          });
          const end = () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseup", end);
          };
          window.addEventListener("mousemove", move);
          window.addEventListener("mouseup", end);
        }}
        className={cn("absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize")}
        style={{ background: "transparent" }}
        title="Redimensionar"
      />
    </div>
  );
}
