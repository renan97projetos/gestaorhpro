import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, History, LogOut, Menu, X, LayoutGrid, UserCog, ClipboardList, UserCheck, Lightbulb, CalendarClock, Sparkles, AlertTriangle, Cake, ArrowRightLeft, MapPin, MessageSquareHeart, NotebookPen, Activity, Building2, Crown, Settings, ExternalLink, Handshake, FolderArchive, Megaphone, LifeBuoy, BookOpen, Users2, Upload, Briefcase, ShieldCheck, ChevronDown, ChevronRight, DoorOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  void logoInputRef;
  const logoInputRef = useRef<HTMLInputElement>(null);
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
            compactSidebar ? "w-[52px] hover:w-60" : "w-64"
          )}
        >
          <div className={cn("border-b border-sidebar-border", compactSidebar ? "px-2 py-3" : "px-4 py-3 space-y-2") }>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => isGestorEmpresa && setLogoEditorOpen(true)}
                disabled={!isGestorEmpresa || uploadingLogo}
                title={isGestorEmpresa ? "Clique para editar a logo" : "Logo da empresa"}
                className={cn(
                  "relative h-9 w-9 rounded-lg overflow-hidden shrink-0 group bg-sidebar-accent flex items-center justify-center",
                  isGestorEmpresa && "cursor-pointer"
                )}
              >
                {empresaAtual?.logo_url ? (
                  <img src={empresaAtual.logo_url} alt={empresaAtual.nome} className="h-9 w-9 rounded-lg object-contain" />
                ) : (
                  <span className="text-sidebar-foreground/80 font-bold text-xs">
                    {(empresaAtual?.nome || "—").slice(0, 2).toUpperCase()}
                  </span>
                )}
                {isGestorEmpresa && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                    <span className="text-[9px] text-white">...</span>
                  </div>
                )}
              </button>
              <div className={cn("min-w-0 flex-1 whitespace-nowrap overflow-hidden", compactSidebar && "opacity-0 group-hover/sidebar:opacity-100 transition-opacity")}>
                <p className="text-sm font-semibold leading-none text-sidebar-foreground truncate">{empresaAtual?.nome || "Selecione"}</p>
                <p className="text-xs text-sidebar-foreground/60 mt-0.5">GestãoRHPRO</p>
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
            {!compactSidebar && empresas.length > 1 && (
              <Select value={empresaAtual?.id || ""} onValueChange={setEmpresaId}>
                <SelectTrigger className="h-8 text-xs bg-sidebar-accent text-sidebar-foreground border-sidebar-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => <SelectItem key={e.id} value={e.id}><Building2 className="h-3 w-3 inline mr-1" />{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {!compactSidebar && empresaAtual && (
              <a href={`/e/${empresaAtual.slug}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground">
                <ExternalLink className="h-3 w-3" /> Página pública: /e/{empresaAtual.slug}
              </a>
            )}
          </div>
          {!compactSidebar && (
            <div className="px-3 pt-3 pb-2 border-b border-sidebar-border">
              <p className="text-[10px] uppercase tracking-wide text-sidebar-foreground/50 font-medium px-1 mb-2">
                Atalhos
              </p>
              <div className="grid grid-cols-5 gap-1">
                {nav.map((n) => {
                  const active = location.pathname.startsWith(n.to);
                  return (
                    <Link
                      key={`atalho-${n.to}`}
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
            </div>
          )}
          <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden", compactSidebar ? "px-1.5 py-3 space-y-3" : "px-3 py-4 space-y-4") }>
            {navGroupsFinal.map((g) => {
              const collapsed = !!collapsedGroups[g.label];
              return (
                <div key={g.label} className="space-y-1">
                  {compactSidebar ? (
                    <div className="px-1 mb-1 h-3 hidden group-hover/sidebar:block">
                      <span className="text-[10px] uppercase tracking-wide font-medium text-sidebar-foreground/50">{g.label}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.label)}
                      className="w-full flex items-center justify-between px-3 mb-1 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
                    >
                      <span className="text-[10px] uppercase tracking-wide font-medium">{g.label}</span>
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
                          "flex items-center rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                          compactSidebar
                            ? "gap-3 px-2 py-2 border-l-2 border-transparent"
                            : "gap-3 px-3 py-2",
                          active
                            ? compactSidebar
                              ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary"
                              : "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elegant)]"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <n.icon className="h-4 w-4 shrink-0" />
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
          <div className={cn("border-t border-sidebar-border", compactSidebar ? "p-2" : "p-3") }>
            {!compactSidebar && (
              <>
                <div className="px-3 py-2 mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-sidebar-foreground/60">Conectado como</p>
                    <p className="text-sm font-medium truncate text-sidebar-foreground">{user?.email}</p>
                  </div>
                  <ThemeToggle className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0" />
                </div>
                <div className="px-3 pb-2">
                  {!isMobile && <OnlineUsersWidget />}
                </div>
              </>
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
        <header className="md:hidden h-14 border-b border-sidebar-border bg-sidebar text-sidebar-foreground flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold">
              GR
            </div>
            <span className="font-semibold text-sm">Gestão Colaboradores</span>
          </div>
          <div className="flex items-center gap-1">
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
  );
}
