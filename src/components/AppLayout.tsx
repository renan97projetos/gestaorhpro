import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, History, LogOut, Menu, X, LayoutGrid, UserCog } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const baseNav = [
  { to: "/inicio", label: "Menu", icon: LayoutGrid },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cadastro", label: "Colaboradores", icon: Users },
  { to: "/solicitacao-movimentacao", label: "Movimentações", icon: History },
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
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground font-bold">
              GR
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Grupo Real</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gestão de Colaboradores</p>
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
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-elegant)]"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-muted-foreground">Conectado como</p>
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground text-xs font-bold">
              GR
            </div>
            <span className="font-semibold text-sm">Gestão Colaboradores</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        {open && (
          <nav className="md:hidden border-b bg-card px-3 py-3 space-y-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium",
                  location.pathname.startsWith(n.to)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                )}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </nav>
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
