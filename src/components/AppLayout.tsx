import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutDashboard, Users, History, LogOut, Menu, X, LayoutGrid, UserCog, ClipboardList, UserCheck, Lightbulb, CalendarClock, Sparkles, AlertTriangle, Cake, ArrowRightLeft, MapPin, MessageSquareHeart, NotebookPen, Activity, Building2, Crown, Settings, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingTour } from "@/components/OnboardingTour";
import { AniversarioPopup } from "@/components/AniversarioPopup";
import { OnlineUsersWidget } from "@/components/OnlineUsersWidget";
import { useIsMobile } from "@/hooks/use-mobile";

const baseNav = [
  { to: "/inicio", label: "Menu", icon: LayoutGrid },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cadastro", label: "Colaboradores", icon: Users },
  { to: "/chamada", label: "Chamada", icon: UserCheck },
  { to: "/analise-faltas", label: "Análise de Faltas", icon: AlertTriangle },
  { to: "/experiencia", label: "Experiência (90 dias)", icon: CalendarClock },
  { to: "/solicitacao-movimentacao", label: "Movimentações", icon: History },
  { to: "/movimentacoes-admissoes", label: "Gestão de Vagas", icon: ArrowRightLeft },
  { to: "/historico-admissoes", label: "Histórico Admissões", icon: History },
  { to: "/mapa-alocacao", label: "Mapa de Alocação", icon: MapPin },
  { to: "/feedbacks", label: "Feedbacks", icon: MessageSquareHeart },
  { to: "/notas", label: "Bloco de Notas", icon: NotebookPen },
  { to: "/pesquisas", label: "Pesquisas", icon: ClipboardList },
  { to: "/ideias", label: "Ideias", icon: Lightbulb },
  { to: "/geracoes", label: "Gerações", icon: Sparkles },
  { to: "/aniversariantes", label: "Aniversariantes", icon: Cake },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const { empresas, empresaAtual, setEmpresaId, isAdminMestre, isAdminEmpresa, isGestorEmpresa } = useEmpresa();
  const desabilitados = (empresaAtual?.modulos_desabilitados || []) as string[];
  const baseFiltrada = isAdminMestre ? baseNav : baseNav.filter((n) => !desabilitados.includes(n.to));
  const nav = [
    ...baseFiltrada,
    ...(isGestorEmpresa ? [
      { to: "/empresa-config", label: "Configurações da Empresa", icon: Settings },
    ] : []),
    ...(isAdminEmpresa ? [
      { to: "/empresa-membros", label: "Usuários da Empresa", icon: UserCog },
    ] : []),
    ...(isAdmin ? [
      { to: "/auditoria", label: "Histórico de Uso", icon: Activity },
      { to: "/usuarios", label: "Usuários (legado)", icon: UserCog },
    ] : []),
    ...(isAdminMestre ? [
      { to: "/mestre", label: "Painel Mestre (SaaS)", icon: Crown },
    ] : []),
  ];
  const navigate = useNavigate();
  const location = useLocation();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

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
      {/* Sidebar desktop — dark */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
          <div className="flex items-center gap-2">
            {empresaAtual?.logo_url ? (
              <img src={empresaAtual.logo_url} alt={empresaAtual.nome} className="h-9 w-9 rounded-lg object-cover bg-sidebar-primary" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xs">
                {(empresaAtual?.nome || "—").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-none text-sidebar-foreground truncate">{empresaAtual?.nome || "Selecione"}</p>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">Gestão SaaS</p>
            </div>
          </div>
          {empresas.length > 1 && (
            <Select value={empresaAtual?.id || ""} onValueChange={setEmpresaId}>
              <SelectTrigger className="h-8 text-xs bg-sidebar-accent text-sidebar-foreground border-sidebar-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {empresas.map((e) => <SelectItem key={e.id} value={e.id}><Building2 className="h-3 w-3 inline mr-1" />{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {empresaAtual && (
            <a href={`/e/${empresaAtual.slug}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <ExternalLink className="h-3 w-3" /> Página pública: /e/{empresaAtual.slug}
            </a>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                preload="intent"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
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
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

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
          <nav className="md:hidden border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-3 py-3 space-y-1">
            {nav.map((n) => (
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
    </div>
  );
}
