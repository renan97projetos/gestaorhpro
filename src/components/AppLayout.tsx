import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, History, LogOut, Menu, X, LayoutGrid, UserCog, ClipboardList, UserCheck, Lightbulb, CalendarClock, Sparkles, AlertTriangle, Cake, ArrowRightLeft, MapPin, MessageSquareHeart, NotebookPen, Activity, Building2, Crown, Settings, ExternalLink, Handshake, FolderArchive, Megaphone, LifeBuoy, BookOpen, Users2, Upload, Briefcase, ShieldCheck, ChevronDown, ChevronRight, DoorOpen, PanelLeftClose, PanelLeftOpen, Search, Bell, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { autoFitImage } from "@/lib/image-fit";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AniversarioPopup } from "@/components/AniversarioPopup";
import { AvisoPopup } from "@/components/AvisoPopup";
import { OnlineUsersWidget } from "@/components/OnlineUsersWidget";
import { LogoEditorDialog } from "@/components/LogoEditorDialog";
import { FloatingNotesProvider } from "@/components/FloatingNotes";
import { useIsMobile } from "@/hooks/use-mobile";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Início",
    items: [
      { to: "/inicio", label: "Menu", icon: LayoutGrid },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/avisos", label: "Avisos", icon: Megaphone },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { to: "/cadastro", label: "Colaboradores", icon: Users },
      { to: "/aniversariantes", label: "Aniversariantes", icon: Cake },
      { to: "/mapa-alocacao", label: "Mapa de Alocação", icon: MapPin },
    ],
  },
  {
    label: "Frequência",
    items: [
      { to: "/chamada", label: "Chamada", icon: UserCheck },
      { to: "/chamada-terceiros", label: "Chamada Terceiros", icon: Handshake },
      { to: "/analise-faltas", label: "Análise de Faltas", icon: AlertTriangle },
    ],
  },
  {
    label: "Movimentações & Admissões",
    items: [
      { to: "/experiencia", label: "Experiência (90 dias)", icon: CalendarClock },
      { to: "/solicitacao-movimentacao", label: "Movimentações", icon: History },
      { to: "/movimentacoes-admissoes", label: "Gestão de Vagas", icon: ArrowRightLeft },
      { to: "/historico-admissoes", label: "Histórico Admissões", icon: History },
      { to: "/documentos-admissao", label: "Documentos Admissão", icon: FolderArchive },
    ],
  },
  {
    label: "Engajamento",
    items: [
      { to: "/feedbacks", label: "Feedbacks", icon: MessageSquareHeart },
      { to: "/pesquisas", label: "Pesquisas", icon: ClipboardList },
      { to: "/ideias", label: "Ideias", icon: Lightbulb },
      { to: "/entrevistas-desligamento", label: "Entrevista de Desligamento", icon: DoorOpen },
      { to: "/geracoes", label: "Gerações", icon: Sparkles },
      { to: "/notas", label: "Bloco de Notas", icon: NotebookPen },
    ],
  },
  {
    label: "Suporte & Comunidade",
    items: [
      { to: "/chamados", label: "Chamados", icon: LifeBuoy },
      { to: "/base-conhecimento", label: "Base de Conhecimento", icon: BookOpen },
      { to: "/canal-etica", label: "Canal de Ética", icon: ShieldCheck },
      { to: "/rede-social", label: "Rede Social (em breve)", icon: Users2 },
      { to: "/banco-talentos", label: "Banco de Talentos PRO (em breve)", icon: Briefcase },
    ],
  },
];

const baseNav: NavItem[] = navGroups.flatMap((g) => g.items);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const { empresas, empresaAtual, setEmpresaId, isAdminMestre, isAdminEmpresa, isGestorEmpresa, refresh } = useEmpresa();
  const desabilitados = (empresaAtual?.modulos_desabilitados || []) as string[];
  void baseNav;
  const logoInputRef = useRef<HTMLInputElement>(null);
  void logoInputRef;
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);

  const handleLogoSave = async (file: File) => {
    if (!empresaAtual) return;
    if (!isGestorEmpresa) {
      toast.error("Apenas gestores podem alterar a logo");
      return;
    }
    setUploadingLogo(true);
    try {
      const path = `${empresaAtual.id}/logo_url-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("empresa-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("empresa-assets").getPublicUrl(path);
      const { data: updated, error: updErr } = await supabase
        .from("empresas")
        .update({ logo_url: data.publicUrl } as never)
        .eq("id", empresaAtual.id)
        .select("id")
        .maybeSingle();
      if (updErr) throw updErr;
      if (!updated) throw new Error("Sem permissão para atualizar esta empresa.");
      toast.success("Logo atualizada");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    } finally {
      setUploadingLogo(false);
    }
  };
  void autoFitImage;
  const adminGroupItems: NavItem[] = [
    ...(isGestorEmpresa ? [{ to: "/empresa-config", label: "Configurações da Empresa", icon: Settings }] : []),
    ...(isAdminEmpresa ? [{ to: "/empresa-membros", label: "Usuários da Empresa", icon: UserCog }] : []),
    ...(isAdmin ? [
      { to: "/auditoria", label: "Histórico de Uso", icon: Activity },
      { to: "/usuarios", label: "Usuários (legado)", icon: UserCog },
    ] : []),
    ...(isAdminMestre ? [
      { to: "/mestre", label: "Painel Mestre (SaaS)", icon: Crown },
      { to: "/crm", label: "CRM Vendas", icon: Handshake },
      { to: "/documentacao-produto", label: "Documentação do Produto", icon: BookOpen },
    ] : []),
  ];
  const groupsFiltradas: NavGroup[] = navGroups
    .map((g) => ({ ...g, items: isAdminMestre ? g.items : g.items.filter((i) => !desabilitados.includes(i.to)) }))
    .filter((g) => g.items.length > 0);
  const navGroupsFinal: NavGroup[] = [
    ...groupsFiltradas,
    ...(adminGroupItems.length > 0 ? [{ label: "Administração", items: adminGroupItems }] : []),
  ];
  const nav: NavItem[] = navGroupsFinal.flatMap((g) => g.items);
  const navigate = useNavigate();
  const location = useLocation();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("nav:collapsedGroups") || "{}"); } catch { return {}; }
  });
  const [compactSidebar, setCompactSidebar] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("nav:compactSidebar") === "1"; } catch { return false; }
  });
  const toggleCompact = () => {
    setCompactSidebar((prev) => {
      const next = !prev;
      try { localStorage.setItem("nav:compactSidebar", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };
  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem("nav:collapsedGroups", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Pré-aquece em background os chunks de TODAS as rotas do menu na 1ª montagem.
  // Assim, qualquer clique posterior é instantâneo (chunk + dados já em cache).
  useEffect(() => {
    const idle = (cb: () => void) =>
      typeof (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback === "function"
        ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
        : setTimeout(cb, 200);
    idle(() => {
      nav.forEach((n) => {
        router.preloadRoute({ to: n.to }).catch(() => {});
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <FloatingNotesProvider>
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      {isAdminMestre ? (
        <aside className="hidden md:flex w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <div className="px-4 py-3 border-b border-sidebar-border flex items-center gap-2">
            <Crown className="h-4 w-4 text-sidebar-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-none truncate">Painel Mestre</p>
              <p className="text-[11px] text-sidebar-foreground/60 mt-0.5">GestãoRHPRO</p>
            </div>
            <ThemeToggle className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0" />
          </div>

          {/* Empresas — foco principal */}
          <div className="px-3 py-3 border-b border-sidebar-border">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60 font-medium">
                Empresas ({empresas.length})
              </p>
              <Link
                to="/mestre"
                preload="intent"
                title="Painel Mestre (SaaS)"
                className="text-[11px] text-sidebar-foreground/70 hover:text-sidebar-foreground inline-flex items-center gap-1"
              >
                <Settings className="h-3 w-3" /> Gerenciar
              </Link>
            </div>
            <div className="max-h-[55vh] overflow-y-auto space-y-1 pr-1">
              {empresas.map((e) => {
                const active = empresaAtual?.id === e.id;
                return (
                  <button
                    key={e.id}
                    onClick={() => setEmpresaId(e.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    {e.logo_url ? (
                      <img src={e.logo_url} alt={e.nome} className="h-7 w-7 rounded-md object-cover bg-sidebar-accent shrink-0" />
                    ) : (
                      <div className="h-7 w-7 rounded-md bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
                        {(e.nome || "—").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{e.nome}</p>
                      <p className={cn("text-[10px] truncate", active ? "text-sidebar-primary-foreground/80" : "text-sidebar-foreground/50")}>
                        /e/{e.slug}
                      </p>
                    </div>
                  </button>
                );
              })}
              {empresas.length === 0 && (
                <p className="text-xs text-sidebar-foreground/50 px-2 py-3 text-center">Nenhuma empresa</p>
              )}
            </div>
          </div>

          {/* Abas minimizadas — apenas ícones */}
          <nav className="flex-1 px-2 py-3 overflow-y-auto">
            <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 font-medium px-2 mb-2">
              Atalhos
            </p>
            <div className="grid grid-cols-5 gap-1">
              {nav.map((n) => {
                const active = location.pathname.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    preload="intent"
                    title={n.label}
                    className={cn(
                      "flex items-center justify-center h-9 w-full rounded-md transition-colors",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <n.icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <div className="px-2 pb-2">
              {!isMobile && <OnlineUsersWidget />}
            </div>
            <div className="px-2 pb-2">
              <p className="text-[10px] text-sidebar-foreground/60">Conectado como</p>
              <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>
      ) : (
        <aside
          className={cn(
            "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out group/sidebar relative z-30",
            compactSidebar ? "w-[60px] hover:w-72" : "w-72"
          )}
        >
          {/* Topo: Logo + nome */}
          <div className={cn("border-b border-sidebar-border", compactSidebar ? "px-2 py-3" : "px-4 py-4")}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => isGestorEmpresa && setLogoEditorOpen(true)}
                disabled={!isGestorEmpresa || uploadingLogo}
                title={isGestorEmpresa ? "Clique para editar a logo" : "Logo da empresa"}
                className={cn(
                  "relative h-10 w-10 rounded-xl overflow-hidden shrink-0 group bg-sidebar-accent flex items-center justify-center",
                  isGestorEmpresa && "cursor-pointer"
                )}
              >
                {empresaAtual?.logo_url ? (
                  <img src={empresaAtual.logo_url} alt={empresaAtual.nome} className="h-10 w-10 object-contain" />
                ) : (
                  <span className="text-sidebar-foreground/80 font-bold text-xs">
                    {(empresaAtual?.nome || "—").slice(0, 2).toUpperCase()}
                  </span>
                )}
                {isGestorEmpresa && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                )}
              </button>
              <div className={cn("min-w-0 flex-1 whitespace-nowrap overflow-hidden", compactSidebar && "opacity-0 group-hover/sidebar:opacity-100 transition-opacity")}>
                <p className="text-base font-bold leading-tight text-sidebar-primary truncate">{empresaAtual?.nome?.split(" ")[0] || "Empresa"}</p>
                <p className="text-[11px] text-sidebar-foreground/60 truncate">{empresaAtual?.nome || "GestãoRHPRO"}</p>
              </div>
              <button
                type="button"
                onClick={toggleCompact}
                title={compactSidebar ? "Expandir menu" : "Recolher menu"}
                className={cn(
                  "shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  compactSidebar && "opacity-0 group-hover/sidebar:opacity-100 transition-opacity"
                )}
              >
                {compactSidebar ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Card "Empresa selecionada" */}
          {!compactSidebar && (
            <div className="px-3 pt-3">
              {empresas.length > 1 ? (
                <Select value={empresaAtual?.id || ""} onValueChange={setEmpresaId}>
                  <SelectTrigger className="h-auto py-2 px-3 bg-sidebar-accent/50 border-sidebar-border rounded-xl hover:bg-sidebar-accent">
                    <div className="flex items-center gap-2 flex-1 min-w-0 text-left">
                      <div className="h-8 w-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-sidebar-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-sidebar-foreground/60 leading-none">Empresa selecionada</p>
                        <p className="text-sm font-semibold text-sidebar-primary truncate mt-0.5">{empresaAtual?.nome || "Selecione"}</p>
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="py-2 px-3 bg-sidebar-accent/50 border border-sidebar-border rounded-xl flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-sidebar-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-sidebar-foreground/60 leading-none">Empresa selecionada</p>
                    <p className="text-sm font-semibold text-sidebar-primary truncate mt-0.5">{empresaAtual?.nome || "—"}</p>
                  </div>
                </div>
              )}
              {empresaAtual && (
                <a href={`/e/${empresaAtual.slug}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-[10px] text-sidebar-foreground/50 hover:text-sidebar-foreground mt-2 px-1">
                  <ExternalLink className="h-3 w-3" /> /e/{empresaAtual.slug}
                </a>
              )}
            </div>
          )}

          {/* Busca rápida lateral */}
          {!compactSidebar && (
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/40 hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground border border-sidebar-border text-xs transition-colors"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">Buscar módulos...</span>
                <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-sidebar-border bg-sidebar px-1.5 text-[10px] font-mono">⌘K</kbd>
              </button>
            </div>
          )}

          {/* Navegação */}
          <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden", compactSidebar ? "px-1.5 py-3 space-y-3" : "px-3 py-3 space-y-4")}>
            {navGroupsFinal.map((g) => {
              const collapsed = !!collapsedGroups[g.label];
              return (
                <div key={g.label} className="space-y-0.5">
                  {compactSidebar ? (
                    <div className="px-1 mb-1 h-3 hidden group-hover/sidebar:block">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-foreground/40">{g.label}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.label)}
                      className="w-full flex items-center justify-between px-3 mb-1.5 mt-1 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                    >
                      <span className="text-[10px] uppercase tracking-wider font-semibold">{g.label}</span>
                      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                  {(compactSidebar || !collapsed) && g.items.map((n) => {
                    const active = location.pathname.startsWith(n.to);
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        preload="intent"
                        title={compactSidebar ? n.label : undefined}
                        className={cn(
                          "flex items-center rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                          compactSidebar ? "gap-3 px-2.5 py-2" : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elegant)]"
                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <n.icon className="h-[18px] w-[18px] shrink-0" />
                        <span className={cn(compactSidebar && "opacity-0 group-hover/sidebar:opacity-100 transition-opacity")}>
                          {n.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Card destaque: Mensagens / Notas */}
          {!compactSidebar && (
            <div className="px-3 pb-3">
              <Link
                to="/notas"
                preload="intent"
                className="block p-3 rounded-2xl bg-sidebar-primary/10 border border-sidebar-primary/20 hover:bg-sidebar-primary/15 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-sidebar-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-sidebar-foreground truncate">Bloco de Notas</p>
                    <p className="text-[10px] text-sidebar-foreground/60 truncate">Suas anotações rápidas</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
                </div>
              </Link>
            </div>
          )}

          <div className={cn("border-t border-sidebar-border", compactSidebar ? "p-2" : "p-3")}>
            {!compactSidebar && (
              <div className="px-2 py-1 mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] text-sidebar-foreground/60">Conectado como</p>
                  <p className="text-xs font-medium truncate text-sidebar-foreground">{user?.email}</p>
                </div>
                <ThemeToggle className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0" />
              </div>
            )}
            {!compactSidebar && !isMobile && (
              <div className="px-2 pb-2"><OnlineUsersWidget /></div>
            )}
            <Button
              variant="ghost"
              size={compactSidebar ? "icon" : "default"}
              className={cn(
                "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                compactSidebar ? "w-full h-9" : "w-full justify-start"
              )}
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut className={cn("h-4 w-4", !compactSidebar && "mr-2")} />
              {!compactSidebar && "Sair"}
            </Button>
          </div>
        </aside>
      )}

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (desktop) com busca rápida */}
        <header className="hidden md:flex h-14 border-b border-border bg-background items-center gap-3 px-6 sticky top-0 z-20">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex-1 max-w-xl flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground border border-border text-sm transition-colors"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Buscar pessoas, módulos, avisos...</span>
            <kbd className="hidden lg:inline-flex h-5 items-center rounded border border-border bg-background px-1.5 text-[10px] font-mono">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate({ to: "/avisos" })} title="Avisos">
              <Bell className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                {(user?.email || "U").slice(0, 1).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden lg:inline">{isAdminMestre ? "Mestre" : isGestorEmpresa ? "Gestor" : "Usuário"}</span>
            </div>
          </div>
        </header>

        <header className="md:hidden h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
              GR
            </div>
            <span className="font-semibold text-sm">Gestão Colaboradores</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <Search className="h-5 w-5" />
            </Button>
            {isMobile && <OnlineUsersWidget />}
            <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </header>
        {open && (
          <nav className="md:hidden border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-3 py-3 space-y-3">
            {navGroupsFinal.map((g) => (
              <div key={g.label} className="space-y-1">
                <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 font-medium px-2">
                  {g.label}
                </p>
                {g.items.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    preload="intent"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                      location.pathname.startsWith(n.to)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <n.icon className="h-4 w-4" /> {n.label}
                  </Link>
                ))}
              </div>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </nav>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <OnboardingTour />
      <AniversarioPopup />
      <AvisoPopup />
      <LogoEditorDialog
        open={logoEditorOpen}
        onOpenChange={setLogoEditorOpen}
        currentUrl={empresaAtual?.logo_url}
        onSave={handleLogoSave}
      />
    </div>
    </FloatingNotesProvider>
  );
}
