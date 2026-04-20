import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, Home, Users, UserPlus, UserCog, FileText, LogOut, User, ShieldCheck, ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/inicio")({
  component: () => (
    <RequireAuth>
      <InicioPage />
    </RequireAuth>
  ),
});

const baseItems = [
  { to: "/dashboard", label: "Início", sub: "Dashboard e indicadores", icon: Home, tone: "from-blue-500 to-blue-600" },
  { to: "/cadastro", label: "Lista de Colaboradores", sub: "Visualizar e gerenciar", icon: Users, tone: "from-emerald-500 to-emerald-600" },
  { to: "/cadastro", label: "Cadastro", sub: "Cadastrar colaboradores", icon: UserPlus, tone: "from-violet-500 to-violet-600" },
  { to: "/solicitacao-movimentacao", label: "Solicitações", sub: "Movimentações", icon: FileText, tone: "from-amber-500 to-orange-500" },
  { to: "/pesquisas", label: "Pesquisas", sub: "Clima e eNPS", icon: ClipboardList, tone: "from-pink-500 to-pink-600" },
];

function InicioPage() {
  const { user, signOut, isAdmin } = useAuth();
  const items = isAdmin
    ? [
        ...baseItems,
        { to: "/usuarios", label: "Usuários", sub: "Permissões e acessos", icon: ShieldCheck, tone: "from-rose-500 to-rose-600" },
      ]
    : baseItems;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-soft)]">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold leading-tight">Gestão de Colaboradores</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Gerência</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs md:text-sm truncate max-w-[180px]">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8">
        <section>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground mb-4">GESTÃO</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((it) => (
              <Link key={it.label} to={it.to.split("?")[0]} className="group">
                <Card className="p-4 md:p-6 h-full hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1">
                  <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br ${it.tone} flex items-center justify-center mb-3 md:mb-4 shadow-md`}>
                    <it.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
                  <h3 className="font-bold text-sm md:text-base">{it.label}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{it.sub}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
