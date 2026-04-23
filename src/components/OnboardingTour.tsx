import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  description: string;
  emoji?: string;
};

const STEPS: Step[] = [
  {
    title: "Bem-vindo ao Sistema!",
    emoji: "👋",
    description:
      "Este tour vai guiar você pelas principais funcionalidades do sistema de Gestão de Colaboradores. Clique em 'Próximo' para continuar.",
  },
  {
    title: "Menu",
    emoji: "🧭",
    description:
      "Página inicial com atalhos rápidos para todas as áreas do sistema. Use-a para navegar de forma visual entre os módulos.",
  },
  {
    title: "Dashboard",
    emoji: "📊",
    description:
      "Visualize indicadores em tempo real: total de colaboradores ativos, afastados, demitidos, distribuição por setor, turno, cargo e gênero.",
  },
  {
    title: "Colaboradores",
    emoji: "👥",
    description:
      "Liste, cadastre e gerencie todos os colaboradores. Edite informações como cargo, setor, turno, horários e status.",
  },
  {
    title: "Chamada",
    emoji: "✅",
    description:
      "Registre a presença diária dos colaboradores: presente, falta, atestado, férias, folga, afastamento ou licença.",
  },
  {
    title: "Movimentações",
    emoji: "🔄",
    description:
      "Crie e acompanhe solicitações de mudanças: transferência de setor, mudança de turno, cargo, liderança ou desligamento.",
  },
  {
    title: "Pesquisas",
    emoji: "📋",
    description:
      "Crie pesquisas de clima, eNPS, liderança ou pulse. Gere links para distribuir aos colaboradores e acompanhe os resultados.",
  },
  {
    title: "Diretório de Ideias",
    emoji: "💡",
    description:
      "Caixinha de sugestões! Qualquer colaborador pode enviar ideias. Gestores e administradores visualizam todas, demais usuários veem apenas as próprias.",
  },
  {
    title: "Usuários (Admin)",
    emoji: "🛡️",
    description:
      "Disponível apenas para administradores. Gerencie permissões, defina funções (admin, gestor, usuário) e controle quem acessa o sistema.",
  },
  {
    title: "Tema Claro/Escuro",
    emoji: "🌓",
    description:
      "Alterne entre o modo claro e escuro a qualquer momento usando o botão no canto da tela. O sistema lembra sua preferência.",
  },
  {
    title: "Permissões",
    emoji: "🔐",
    description:
      "Visualizadores podem apenas consultar dados. Gestores e administradores podem editar colaboradores, aprovar movimentações e excluir registros.",
  },
  {
    title: "Sair com Segurança",
    emoji: "🚪",
    description:
      "Ao terminar, use o botão 'Sair' no menu lateral para encerrar sua sessão com segurança.",
  },
  {
    title: "Tudo pronto!",
    emoji: "🎉",
    description:
      "Você concluiu o tour. Explore o sistema à vontade e, se precisar, este tour estará sempre disponível para novos usuários.",
  },
];

const STORAGE_PREFIX = "onboarding-tour-completed:";

export function OnboardingTour() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    if (typeof window === "undefined") return;
    try {
      const key = STORAGE_PREFIX + user.id;
      const done = localStorage.getItem(key);
      if (!done) {
        // pequeno delay para a UI carregar
        const t = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(t);
      }
    } catch {
      // ignora
    }
  }, [user, loading]);

  const finish = () => {
    if (user) {
      try {
        localStorage.setItem(STORAGE_PREFIX + user.id, "1");
      } catch {
        // ignora
      }
    }
    setOpen(false);
    setStep(0);
  };

  if (!open) return null;

  const total = STEPS.length;
  const current = STEPS[step];
  const progress = ((step + 1) / total) * 100;
  const isLast = step === total - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-6 md:p-7 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {step + 1} / {total}
          </div>
          <button
            onClick={finish}
            aria-label="Fechar tour"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-xl md:text-2xl font-bold mb-2 leading-tight">
          {current.title} {current.emoji && <span className="ml-1">{current.emoji}</span>}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5">
          {current.description}
        </p>

        {/* Barra de progresso */}
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-5">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className={cn(isFirst && "opacity-50")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
          {isLast ? (
            <Button onClick={finish}>Concluir 🎉</Button>
          ) : (
            <Button onClick={() => setStep((s) => Math.min(total - 1, s + 1))}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
