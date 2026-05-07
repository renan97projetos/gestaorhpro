import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { useEmpresa } from "@/lib/empresa-context";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import {
  Home, Users, UserPlus, FileText, ShieldCheck, ClipboardList, UserCheck, Lightbulb, CalendarClock, Sparkles, AlertTriangle, Cake, ArrowRightLeft, MapPin, MessageSquareHeart, NotebookPen, History, Activity, Settings, UserCog, Crown, Handshake,
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
  { to: "/chamada", label: "Chamada", sub: "Controle de presença diária", icon: UserCheck, tone: "from-cyan-500 to-cyan-600" },
  { to: "/chamada-terceiros", label: "Chamada Terceiros", sub: "Prestadores e pagamentos PIX", icon: Handshake, tone: "from-lime-500 to-green-600" },
  { to: "/analise-faltas", label: "Análise de Faltas", sub: "Padrões e custo oculto", icon: AlertTriangle, tone: "from-red-500 to-red-600" },
  { to: "/aniversariantes", label: "Aniversariantes", sub: "Aniversários do mês", icon: Cake, tone: "from-pink-400 to-rose-500" },
  { to: "/experiencia", label: "Experiência 90 dias", sub: "Avaliação dos novos", icon: CalendarClock, tone: "from-teal-500 to-teal-600" },
  { to: "/solicitacao-movimentacao", label: "Solicitações", sub: "Movimentações", icon: FileText, tone: "from-amber-500 to-orange-500" },
  { to: "/movimentacoes-admissoes", label: "Gestão de Vagas", sub: "Quem entrou no lugar de quem", icon: ArrowRightLeft, tone: "from-indigo-500 to-indigo-600" },
  { to: "/historico-admissoes", label: "Histórico Admissões", sub: "Tudo que rolou nas vagas", icon: History, tone: "from-slate-500 to-slate-700" },
  { to: "/mapa-alocacao", label: "Mapa de Alocação", sub: "HC por setor / déficit", icon: MapPin, tone: "from-emerald-500 to-teal-600" },
  { to: "/feedbacks", label: "Feedbacks", sub: "Pulsos com a equipe", icon: MessageSquareHeart, tone: "from-rose-500 to-pink-600" },
  { to: "/notas", label: "Bloco de Notas", sub: "Suas anotações privadas", icon: NotebookPen, tone: "from-yellow-500 to-amber-600" },
  { to: "/pesquisas", label: "Pesquisas", sub: "Clima e eNPS", icon: ClipboardList, tone: "from-pink-500 to-pink-600" },
  { to: "/ideias", label: "Diretório de Ideias", sub: "Caixinha de sugestões", icon: Lightbulb, tone: "from-yellow-400 to-orange-500" },
  { to: "/geracoes", label: "Gerações", sub: "Perfil etário da equipe", icon: Sparkles, tone: "from-fuchsia-500 to-purple-600" },
];

function InicioPage() {
  const { isAdmin } = useAuth();
  const { isAdminEmpresa, isAdminMestre, empresaAtual } = useEmpresa();
  const desabilitados = (empresaAtual?.modulos_desabilitados || []) as string[];
  const baseFiltrada = isAdminMestre ? baseItems : baseItems.filter((b) => !desabilitados.includes(b.to));
  const items = [
    ...baseFiltrada,
    ...(isAdminEmpresa ? [
      { to: "/empresa-config", label: "Configurações da Empresa", sub: "Logo, capa e dados públicos", icon: Settings, tone: "from-sky-500 to-sky-600" },
      { to: "/empresa-membros", label: "Usuários da Empresa", sub: "Permissões dos membros", icon: UserCog, tone: "from-purple-500 to-purple-600" },
    ] : []),
    ...(isAdmin ? [
      { to: "/auditoria", label: "Histórico de Uso", sub: "Ações de cada usuário", icon: Activity, tone: "from-zinc-500 to-zinc-700" },
      { to: "/usuarios", label: "Usuários (legado)", sub: "Permissões e acessos", icon: ShieldCheck, tone: "from-rose-500 to-rose-600" },
    ] : []),
    ...(isAdminMestre ? [
      { to: "/mestre", label: "Central Master", sub: "Painel SaaS de todas as empresas", icon: Crown, tone: "from-amber-500 to-orange-600" },
    ] : []),
  ];

  return (
    <AppLayout>
      <main className="min-h-full bg-[image:var(--gradient-soft)] px-4 md:px-6 py-6 md:py-10 space-y-8">
        <div className="max-w-6xl mx-auto">
        <section>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground mb-4">GESTÃO</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {items.map((it) => (
              <Link key={it.label} to={it.to.split("?")[0]} className="group">
                <Card className="p-4 md:p-6 h-full hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-1">
                  <div className={`h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gradient-to-br ${it.tone} flex items-center justify-center mb-3 md:mb-4 shadow-md`}>
                    <it.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                  </div>
              <h3 className="font-bold text-sm md:text-base" translate="no">{it.label}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-0.5" translate="no">{it.sub}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
        </div>
      </main>
    </AppLayout>
  );
}
