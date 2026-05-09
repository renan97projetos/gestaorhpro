import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen, Search, Sparkles, Users, UserCheck, AlertTriangle, CalendarClock,
  History, ArrowRightLeft, FolderArchive, MapPin, MessageSquareHeart, ClipboardList,
  Lightbulb, DoorOpen, NotebookPen, Cake, Megaphone, LifeBuoy, ShieldCheck,
  LayoutDashboard, LayoutGrid, Crown, Handshake, Settings, UserCog, Activity,
  Briefcase, Building2, Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/documentacao-produto")({
  head: () => ({
    meta: [
      { title: "Documentação do Produto — GestãoRHPro" },
      { name: "description", content: "Documentação completa de todas as funcionalidades do GestãoRHPro para administradores Mestre." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppLayout>
        <Page />
      </AppLayout>
    </RequireAuth>
  ),
});

type Modulo = {
  id: string;
  nome: string;
  rota: string;
  categoria: string;
  icon: React.ComponentType<{ className?: string }>;
  resumo: string;
  comoUsar: string[];
  ondeUtilizar: string;
  perfis: string[];
  tags: string[];
  novidade?: string; // data ou versão
};

const MODULOS: Modulo[] = [
  // INÍCIO
  {
    id: "inicio",
    nome: "Menu Inicial",
    rota: "/inicio",
    categoria: "Início",
    icon: LayoutGrid,
    resumo: "Tela de boas-vindas com acesso rápido aos módulos da empresa, exibindo o nome e benefícios do GestãoRHPro de forma minimalista.",
    comoUsar: [
      "Acesse após o login para ter visão geral dos módulos disponíveis.",
      "Clique em qualquer card para abrir o módulo correspondente.",
      "O loop de frases destaca benefícios da plataforma — atualize-o conforme novas vantagens forem implementadas.",
    ],
    ondeUtilizar: "Primeira tela após login para qualquer usuário com empresa ativa.",
    perfis: ["Todos"],
    tags: ["home", "menu", "boas-vindas"],
  },
  {
    id: "dashboard",
    nome: "Dashboard",
    rota: "/dashboard",
    categoria: "Início",
    icon: LayoutDashboard,
    resumo: "Painel com indicadores consolidados: headcount, faltas, admissões, desligamentos e demais métricas críticas de RH.",
    comoUsar: [
      "Selecione o período/filtros desejados.",
      "Acompanhe KPIs e gráficos atualizados em tempo real.",
      "Use para apresentar resultados em reuniões de comitê de gente.",
    ],
    ondeUtilizar: "Visão executiva — diretoria, gerência e RH estratégico.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["bi", "indicadores", "kpi"],
  },
  {
    id: "avisos",
    nome: "Avisos",
    rota: "/avisos",
    categoria: "Início",
    icon: Megaphone,
    resumo: "Comunicados internos com popup automático para colaboradores no primeiro acesso após publicação.",
    comoUsar: [
      "Crie um aviso definindo título, mensagem e período de exibição.",
      "Defina público-alvo (toda empresa ou setores específicos).",
      "O aviso aparece como popup obrigatório até ser visualizado.",
    ],
    ondeUtilizar: "Comunicação institucional, mudanças de processo, alertas urgentes.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["comunicação", "popup"],
  },

  // PESSOAS
  {
    id: "colaboradores",
    nome: "Colaboradores",
    rota: "/cadastro",
    categoria: "Pessoas",
    icon: Users,
    resumo: "Cadastro central de colaboradores com dados pessoais, profissionais, foto e documentos.",
    comoUsar: [
      "Cadastre colaborador preenchendo dados obrigatórios (nome, CPF, cargo, setor, regime).",
      "Atualize status (ativo, afastado, demitido) conforme movimentações.",
      "Importação em massa via planilha disponível para Admin Empresa.",
    ],
    ondeUtilizar: "Base de toda a operação de RH — alimenta os demais módulos.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["cadastro", "headcount", "pessoas"],
  },
  {
    id: "aniversariantes",
    nome: "Aniversariantes",
    rota: "/aniversariantes",
    categoria: "Pessoas",
    icon: Cake,
    resumo: "Lista de aniversariantes do mês com popup automático no dia do aniversário do colaborador.",
    comoUsar: [
      "Acesse para visualizar aniversariantes do mês corrente.",
      "Popup automático aparece para todos os usuários no dia do aniversário.",
      "Usado para ações de reconhecimento e clima.",
    ],
    ondeUtilizar: "Engajamento, comunicação interna, ações de cultura.",
    perfis: ["Todos"],
    tags: ["clima", "engajamento"],
  },
  {
    id: "mapa-alocacao",
    nome: "Mapa de Alocação",
    rota: "/mapa-alocacao",
    categoria: "Pessoas",
    icon: MapPin,
    resumo: "Visualização da distribuição de colaboradores por unidade, setor ou cliente.",
    comoUsar: [
      "Filtre por unidade, setor ou cliente.",
      "Identifique vagas abertas, sobras e gaps de alocação.",
      "Reorganize colaboradores arrastando entre posições (quando habilitado).",
    ],
    ondeUtilizar: "Planejamento de pessoal e operações com múltiplas frentes.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["alocação", "operações"],
  },

  // FREQUÊNCIA
  {
    id: "chamada",
    nome: "Chamada",
    rota: "/chamada",
    categoria: "Frequência",
    icon: UserCheck,
    resumo: "Registro diário de presença, falta, atestado e folga por colaborador.",
    comoUsar: [
      "Selecione a data e o setor.",
      "Marque cada colaborador como presente, falta, atestado, folga ou justificada.",
      "Salve para alimentar Análise de Faltas e relatórios.",
    ],
    ondeUtilizar: "Operações com controle diário (terceirização, indústria, varejo).",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["frequência", "presença"],
  },
  {
    id: "chamada-terceiros",
    nome: "Chamada Terceiros",
    rota: "/chamada-terceiros",
    categoria: "Frequência",
    icon: Handshake,
    resumo: "Controle de presença para prestadores e terceiros sem vínculo formal.",
    comoUsar: [
      "Cadastre o terceiro com cliente/contrato vinculado.",
      "Faça a chamada diária separadamente dos colaboradores próprios.",
      "Use para faturamento e comprovação contratual.",
    ],
    ondeUtilizar: "Empresas que prestam serviço com mão de obra terceirizada.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["terceiros", "frequência"],
  },
  {
    id: "analise-faltas",
    nome: "Análise de Faltas",
    rota: "/analise-faltas",
    categoria: "Frequência",
    icon: AlertTriangle,
    resumo: "Relatórios de faltas, atestados e absenteísmo por colaborador, setor ou período.",
    comoUsar: [
      "Filtre por período, setor ou colaborador.",
      "Identifique padrões de falta e reincidências.",
      "Exporte para apoiar advertências e processos disciplinares.",
    ],
    ondeUtilizar: "Gestão disciplinar e indicadores de absenteísmo.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["absenteísmo", "indicadores"],
  },

  // MOVIMENTAÇÕES & ADMISSÕES
  {
    id: "experiencia",
    nome: "Experiência (90 dias)",
    rota: "/experiencia",
    categoria: "Movimentações & Admissões",
    icon: CalendarClock,
    resumo: "Acompanhamento dos contratos em período de experiência (45 e 90 dias) com alertas automáticos.",
    comoUsar: [
      "Visualize colaboradores próximos do fechamento de experiência.",
      "Registre avaliação do gestor e decisão (efetivar/encerrar).",
      "Receba alertas antes do vencimento para ação tempestiva.",
    ],
    ondeUtilizar: "Gestão de novos contratados e redução de turnover precoce.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["contrato", "experiência"],
  },
  {
    id: "movimentacoes",
    nome: "Movimentações",
    rota: "/solicitacao-movimentacao",
    categoria: "Movimentações & Admissões",
    icon: History,
    resumo: "Solicitações de promoção, transferência, alteração salarial e demais movimentações com fluxo de aprovação.",
    comoUsar: [
      "Crie a solicitação informando colaborador, tipo e justificativa.",
      "Acompanhe o status (pendente, aprovado, recusado).",
      "Histórico permanente para auditoria.",
    ],
    ondeUtilizar: "Fluxo formal de RH com aprovações.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["movimentação", "aprovação"],
  },
  {
    id: "vagas",
    nome: "Gestão de Vagas",
    rota: "/movimentacoes-admissoes",
    categoria: "Movimentações & Admissões",
    icon: ArrowRightLeft,
    resumo: "Gestão completa de vagas em aberto, candidatos e funil de seleção (estilo Gupy).",
    comoUsar: [
      "Cadastre a vaga com descrição, requisitos e localização.",
      "Compartilhe via WhatsApp ou link público — candidatos se inscrevem direto.",
      "Veja candidatos por etapa do funil (triagem, entrevista, teste, aprovação, admissão).",
      "Mova candidatos entre etapas e dispare contato via WhatsApp pelo botão direto.",
    ],
    ondeUtilizar: "Time de Recrutamento & Seleção.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["recrutamento", "vagas", "candidatos", "funil"],
  },
  {
    id: "historico-admissoes",
    nome: "Histórico de Admissões",
    rota: "/historico-admissoes",
    categoria: "Movimentações & Admissões",
    icon: History,
    resumo: "Registro de todas as admissões realizadas com filtros por período, setor e status.",
    comoUsar: [
      "Filtre por período e setor.",
      "Use para auditoria, relatórios mensais e acompanhamento da operação de R&S.",
    ],
    ondeUtilizar: "Auditoria e indicadores de admissão.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["admissão", "histórico"],
  },
  {
    id: "documentos-admissao",
    nome: "Documentos de Admissão",
    rota: "/documentos-admissao",
    categoria: "Movimentações & Admissões",
    icon: FolderArchive,
    resumo: "Repositório dos documentos enviados pelo candidato no processo de admissão.",
    comoUsar: [
      "Configure os documentos exigidos por tipo de contrato.",
      "Candidato faz upload via link público durante a admissão.",
      "Valide documentos antes da efetivação.",
    ],
    ondeUtilizar: "Departamento Pessoal e admissão digital.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["dp", "documentos", "admissão"],
  },

  // ENGAJAMENTO
  {
    id: "feedbacks",
    nome: "Feedbacks",
    rota: "/feedbacks",
    categoria: "Engajamento",
    icon: MessageSquareHeart,
    resumo: "Registro de feedbacks 1:1 entre gestor e colaborador, com histórico estruturado.",
    comoUsar: [
      "Crie um feedback selecionando colaborador, tipo (positivo, melhoria, reconhecimento) e mensagem.",
      "Acompanhe o histórico por colaborador.",
      "Use em ciclos formais de avaliação.",
    ],
    ondeUtilizar: "Cultura de feedback contínuo.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["feedback", "1:1"],
  },
  {
    id: "pesquisas",
    nome: "Pesquisas",
    rota: "/pesquisas",
    categoria: "Engajamento",
    icon: ClipboardList,
    resumo: "Pesquisas de clima, eNPS e qualquer questionário customizado, com link público para resposta anônima.",
    comoUsar: [
      "Monte o questionário com perguntas (texto, escala, sim/não, múltipla escolha).",
      "Compartilhe o link com os colaboradores.",
      "Acompanhe respostas e exporte resultados.",
    ],
    ondeUtilizar: "Clima organizacional, eNPS, pulse surveys.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["clima", "enps", "pesquisa"],
  },
  {
    id: "ideias",
    nome: "Ideias",
    rota: "/ideias",
    categoria: "Engajamento",
    icon: Lightbulb,
    resumo: "Banco de ideias dos colaboradores com votação e acompanhamento de implementação.",
    comoUsar: [
      "Colaboradores submetem ideias.",
      "Comunidade vota e RH classifica em status (em análise, aprovada, implementada).",
      "Reconheça autores das ideias implementadas.",
    ],
    ondeUtilizar: "Programas de inovação e cultura participativa.",
    perfis: ["Todos"],
    tags: ["inovação", "ideias"],
  },
  {
    id: "entrevistas-desligamento",
    nome: "Entrevista de Desligamento",
    rota: "/entrevistas-desligamento",
    categoria: "Engajamento",
    icon: DoorOpen,
    resumo: "Questionários personalizáveis enviados a colaboradores demitidos via link público.",
    comoUsar: [
      "Crie um modelo na aba Modelos com perguntas personalizadas (texto, escala 0-10, sim/não, múltipla escolha).",
      "Inicie uma entrevista para um colaborador desligado — gera token único.",
      "Compartilhe o link com o ex-colaborador. Ele responde sem precisar de login.",
      "Analise respostas para identificar causas de turnover.",
    ],
    ondeUtilizar: "Redução de turnover e melhoria de clima.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["desligamento", "turnover", "pesquisa"],
  },
  {
    id: "geracoes",
    nome: "Gerações",
    rota: "/geracoes",
    categoria: "Engajamento",
    icon: Sparkles,
    resumo: "Análise da composição de gerações (Boomers, X, Y, Z) na empresa.",
    comoUsar: [
      "Visualize automaticamente a distribuição por geração com base na data de nascimento.",
      "Use para personalizar comunicação e benefícios.",
    ],
    ondeUtilizar: "Diversidade e estratégia de comunicação.",
    perfis: ["Admin Empresa", "Gestor"],
    tags: ["diversidade", "gerações"],
  },
  {
    id: "notas",
    nome: "Bloco de Notas",
    rota: "/notas",
    categoria: "Engajamento",
    icon: NotebookPen,
    resumo: "Notas privadas do usuário sobre colaboradores ou processos.",
    comoUsar: [
      "Crie notas livres com título e conteúdo.",
      "Visíveis apenas para quem criou.",
    ],
    ondeUtilizar: "Apoio operacional individual.",
    perfis: ["Todos"],
    tags: ["notas", "produtividade"],
  },

  // SUPORTE & COMUNIDADE
  {
    id: "chamados",
    nome: "Chamados",
    rota: "/chamados",
    categoria: "Suporte & Comunidade",
    icon: LifeBuoy,
    resumo: "Abertura de chamados internos do colaborador para o RH.",
    comoUsar: [
      "Colaborador abre chamado por categoria (folha, benefícios, dúvida geral).",
      "RH responde dentro do sistema, mantendo histórico.",
    ],
    ondeUtilizar: "Atendimento interno de RH.",
    perfis: ["Todos"],
    tags: ["suporte", "tickets"],
  },
  {
    id: "base-conhecimento",
    nome: "Base de Conhecimento",
    rota: "/base-conhecimento",
    categoria: "Suporte & Comunidade",
    icon: BookOpen,
    resumo: "Wiki interna com políticas, procedimentos e FAQs para os colaboradores.",
    comoUsar: [
      "RH cria artigos por categoria.",
      "Colaboradores consultam para autoatendimento.",
    ],
    ondeUtilizar: "Reduzir chamados repetitivos e padronizar respostas.",
    perfis: ["Todos"],
    tags: ["wiki", "conhecimento"],
  },
  {
    id: "canal-etica",
    nome: "Canal de Ética",
    rota: "/canal-etica",
    categoria: "Suporte & Comunidade",
    icon: ShieldCheck,
    resumo: "Canal anônimo para denúncias e reportes de assédio, fraude e violações de conduta.",
    comoUsar: [
      "Denunciante registra ocorrência (anônimo opcional).",
      "Comitê de ética acompanha apuração com sigilo.",
    ],
    ondeUtilizar: "Compliance, LGPD, política de integridade.",
    perfis: ["Todos"],
    tags: ["compliance", "ética", "denúncia"],
  },

  // ADMINISTRAÇÃO
  {
    id: "empresa-config",
    nome: "Configurações da Empresa",
    rota: "/empresa-config",
    categoria: "Administração",
    icon: Settings,
    resumo: "Configurações gerais da empresa: dados cadastrais, branding, módulos habilitados.",
    comoUsar: [
      "Gestor da empresa edita logo, nome e dados.",
      "Habilita/desabilita módulos visíveis para os usuários.",
    ],
    ondeUtilizar: "Setup inicial e ajustes da conta.",
    perfis: ["Gestor"],
    tags: ["configuração", "branding"],
  },
  {
    id: "empresa-membros",
    nome: "Usuários da Empresa",
    rota: "/empresa-membros",
    categoria: "Administração",
    icon: UserCog,
    resumo: "Gestão de usuários da empresa: convites, papéis (admin, gestor, colaborador) e bloqueio.",
    comoUsar: [
      "Convide novo usuário por e-mail.",
      "Defina papel e setores que enxergará.",
      "Bloqueie/desbloqueie acessos quando necessário.",
    ],
    ondeUtilizar: "Controle de acesso da empresa.",
    perfis: ["Admin Empresa"],
    tags: ["usuários", "papéis"],
  },
  {
    id: "auditoria",
    nome: "Histórico de Uso",
    rota: "/auditoria",
    categoria: "Administração",
    icon: Activity,
    resumo: "Log de auditoria de ações realizadas no sistema.",
    comoUsar: [
      "Filtre por usuário, ação e período.",
      "Use para investigações de segurança e auditoria.",
    ],
    ondeUtilizar: "Compliance e segurança.",
    perfis: ["Admin"],
    tags: ["log", "auditoria"],
  },
  {
    id: "mestre",
    nome: "Painel Mestre (SaaS)",
    rota: "/mestre",
    categoria: "Mestre",
    icon: Crown,
    resumo: "Painel exclusivo do Admin Mestre para administrar todas as empresas, usuários e configurações da plataforma SaaS.",
    comoUsar: [
      "Crie/edite empresas (multi-tenant).",
      "Crie usuários e admins de empresa.",
      "Habilite/desabilite módulos por empresa.",
      "Faça reset de senha e bloqueio de usuários.",
      "Promova ou remova outros Admins Mestre.",
    ],
    ondeUtilizar: "Operação SaaS — onboarding de novos clientes e suporte.",
    perfis: ["Admin Mestre"],
    tags: ["saas", "multi-tenant", "mestre"],
  },
  {
    id: "crm",
    nome: "CRM Vendas",
    rota: "/crm",
    categoria: "Mestre",
    icon: Handshake,
    resumo: "CRM interno para gestão de leads, oportunidades e pipeline comercial do GestãoRHPro.",
    comoUsar: [
      "Cadastre lead com origem e interesse.",
      "Mova pelo funil (prospect, qualificação, proposta, fechamento).",
      "Acompanhe negociações e conversões.",
    ],
    ondeUtilizar: "Time comercial do GestãoRHPro.",
    perfis: ["Admin Mestre"],
    tags: ["vendas", "crm"],
  },
  {
    id: "documentacao-produto",
    nome: "Documentação do Produto",
    rota: "/documentacao-produto",
    categoria: "Mestre",
    icon: BookOpen,
    resumo: "Esta documentação. Centraliza descrição, fluxo de uso e casos de aplicação de todos os módulos do sistema.",
    comoUsar: [
      "Use a busca para localizar funcionalidades por nome ou tag.",
      "Filtre por categoria na lateral.",
      "Sempre que um módulo for adicionado ou alterado, atualize este arquivo: src/routes/documentacao-produto.tsx.",
    ],
    ondeUtilizar: "Treinamento de novos Admins Mestre, suporte e onboarding comercial.",
    perfis: ["Admin Mestre"],
    tags: ["documentação", "produto", "treinamento"],
  },
];

const CATEGORIAS = [
  "Início",
  "Pessoas",
  "Frequência",
  "Movimentações & Admissões",
  "Engajamento",
  "Suporte & Comunidade",
  "Administração",
  "Mestre",
];

function Page() {
  const { isAdminMestre } = useEmpresa();
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("Todas");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return MODULOS.filter((m) => {
      const okCat = categoria === "Todas" || m.categoria === categoria;
      if (!okCat) return false;
      if (!termo) return true;
      const blob = [m.nome, m.resumo, m.rota, m.categoria, ...(m.tags || []), ...(m.comoUsar || [])]
        .join(" ")
        .toLowerCase();
      return blob.includes(termo);
    });
  }, [busca, categoria]);

  if (!isAdminMestre) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="p-6 text-center">
          <Crown className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-lg font-semibold mb-1">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Esta documentação é exclusiva para administradores Mestre do GestãoRHPro.
          </p>
        </Card>
      </div>
    );
  }

  const porCategoria = CATEGORIAS.map((c) => ({
    nome: c,
    total: MODULOS.filter((m) => m.categoria === c).length,
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Documentação do Produto</h1>
            <Badge variant="secondary" className="gap-1"><Crown className="h-3 w-3" /> Mestre</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Conheça em detalhes cada módulo do GestãoRHPro: o que faz, como usar e onde aplicar.
            Mantenha-se atualizado com tudo que evolui na plataforma para apresentar ao mercado e dar suporte com excelência.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold leading-none">{MODULOS.length}</p>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide">módulos documentados</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por funcionalidade, tag ou descrição (ex: vagas, clima, chamada...)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4">
        {/* Sidebar de categorias */}
        <Card className="p-3 h-fit md:sticky md:top-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-2 mb-2">
            Categorias
          </p>
          <button
            onClick={() => setCategoria("Todas")}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between hover:bg-muted/50",
              categoria === "Todas" && "bg-muted font-medium"
            )}
          >
            <span>Todas</span>
            <Badge variant="secondary" className="text-[10px]">{MODULOS.length}</Badge>
          </button>
          {porCategoria.map((c) => (
            <button
              key={c.nome}
              onClick={() => setCategoria(c.nome)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between hover:bg-muted/50",
                categoria === c.nome && "bg-muted font-medium"
              )}
            >
              <span className="truncate">{c.nome}</span>
              <Badge variant="secondary" className="text-[10px]">{c.total}</Badge>
            </button>
          ))}
        </Card>

        {/* Lista de módulos */}
        <ScrollArea className="md:max-h-[calc(100vh-220px)]">
          <div className="space-y-3 pr-2">
            {filtrados.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Nenhum módulo encontrado para esses filtros.
              </Card>
            )}
            {filtrados.map((m) => {
              const Icon = m.icon;
              return (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold">{m.nome}</h2>
                        <Badge variant="outline" className="text-[10px]">{m.categoria}</Badge>
                        <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{m.rota}</code>
                        {m.novidade && (
                          <Badge className="text-[10px] gap-1"><Sparkles className="h-3 w-3" /> {m.novidade}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{m.resumo}</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">Como usar</p>
                          <ul className="text-sm space-y-1 list-disc pl-4">
                            {m.comoUsar.map((p, i) => <li key={i}>{p}</li>)}
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">Onde utilizar</p>
                            <p className="text-sm">{m.ondeUtilizar}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-1">Perfis</p>
                            <div className="flex flex-wrap gap-1">
                              {m.perfis.map((p) => (
                                <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {m.tags?.length > 0 && (
                        <div className="flex items-center gap-1 mt-3 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {m.tags.map((t) => (
                            <span key={t} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Mantenha esta documentação viva</p>
            <p className="text-muted-foreground">
              Sempre que um módulo for criado, alterado ou aprimorado, atualize o array <code className="bg-background px-1 rounded">MODULOS</code> em
              <code className="bg-background px-1 rounded ml-1">src/routes/documentacao-produto.tsx</code>.
              Inclua nome, resumo, como usar, onde utilizar e tags. Se for novidade do mês, defina o campo <code className="bg-background px-1 rounded">novidade</code>.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
