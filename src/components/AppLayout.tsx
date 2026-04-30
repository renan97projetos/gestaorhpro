import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, History, LogOut, Menu, X, LayoutGrid, UserCog, ClipboardList, UserCheck, Lightbulb, CalendarClock, Sparkles, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingTour } from "@/components/OnboardingTour";

const baseNav = [
  { to: "/inicio", label: "Menu", icon: LayoutGrid },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cadastro", label: "Colaboradores", icon: Users },
  { to: "/chamada", label: "Chamada", icon: UserCheck },
  { to: "/analise-faltas", label: "Análise de Faltas", icon: AlertTriangle },
  { to: "/experiencia", label: "Experiência (90 dias)", icon: CalendarClock },
  { to: "/solicitacao-movimentacao", label: "Movimentações", icon: History },
  { to: "/pesquisas", label: "Pesquisas", icon: ClipboardList },
  { to: "/ideias", label: "Ideias", icon: Lightbulb },
  { to: "/geracoes", label: "Gerações", icon: Sparkles },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, isAdmin } = useAuth();
  const nav = isAdmin
    ? [...baseNav, { to: "/usuarios", label: "Usuários", icon: UserCog }]
    : baseNav;
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop — dark */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
              GR
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-sidebar-foreground">Grupo Real</p>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">Gestão de Colaboradores</p>
            </div>
          </div>
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
    </div>
  );
}
