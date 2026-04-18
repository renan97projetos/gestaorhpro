import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, ShieldCheck, ShieldOff, UserCog, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  component: () => (
    <RequireAuth>
      <AppLayout>
        <UsuariosPage />
      </AppLayout>
    </RequireAuth>
  ),
});

type Role = "admin" | "gestor" | "usuario";
type UserRow = {
  id: string;
  nome: string | null;
  email: string | null;
  created_at: string;
  roles: Role[];
};

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  usuario: "Visualizador",
};
const ROLE_TONE: Record<Role, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  gestor: "bg-blue-100 text-blue-700 border-blue-200",
  usuario: "bg-slate-100 text-slate-700 border-slate-200",
};

function UsuariosPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito ao administrador");
      navigate({ to: "/inicio" });
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
      supabase.from("profiles").select("id, nome, email, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pe || re) {
      toast.error("Erro ao carregar usuários");
      setLoading(false);
      return;
    }
    const map = new Map<string, Role[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = map.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      map.set(r.user_id, arr);
    });
    setList(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        nome: p.nome,
        email: p.email,
        created_at: p.created_at,
        roles: map.get(p.id) ?? ["usuario"],
      })),
    );
    setLoading(false);
  }

  function highestRole(roles: Role[]): Role {
    if (roles.includes("admin")) return "admin";
    if (roles.includes("gestor")) return "gestor";
    return "usuario";
  }

  async function changeRole(target: UserRow, newRole: Role) {
    if (target.id === user?.id && newRole !== "admin") {
      toast.error("Você não pode remover seu próprio acesso de administrador");
      return;
    }
    // Remove roles atuais e insere a nova
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", target.id);
    if (delErr) {
      toast.error("Erro ao atualizar permissão");
      return;
    }
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: target.id, role: newRole });
    if (insErr) {
      toast.error("Erro ao atribuir nova permissão");
      return;
    }
    toast.success(`${target.nome ?? target.email} agora é ${ROLE_LABEL[newRole]}`);
    load();
  }

  async function removeUser(target: UserRow) {
    if (target.id === user?.id) {
      toast.error("Você não pode remover a si mesmo");
      return;
    }
    // Apenas remove roles -> usuário perde acesso ao app
    const { error } = await supabase.from("user_roles").delete().eq("user_id", target.id);
    if (error) {
      toast.error("Erro ao remover acesso");
      return;
    }
    toast.success("Acesso revogado");
    setConfirmDelete(null);
    load();
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = list.filter(
    (u) =>
      !q ||
      u.nome?.toLowerCase().includes(q.toLowerCase()) ||
      u.email?.toLowerCase().includes(q.toLowerCase()),
  );

  const totalAdmins = list.filter((u) => u.roles.includes("admin")).length;
  const totalGestores = list.filter((u) => u.roles.includes("gestor") && !u.roles.includes("admin")).length;
  const totalView = list.filter((u) => !u.roles.includes("admin") && !u.roles.includes("gestor")).length;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground">
          <UserCog className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Defina quem pode editar, demitir ou apenas visualizar os colaboradores
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-xs font-semibold">ADMINS</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-1">{totalAdmins}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-blue-600">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-semibold">GESTORES</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-1">{totalGestores}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldOff className="h-4 w-4" />
            <span className="text-xs font-semibold">VISUALIZADORES</span>
          </div>
          <p className="text-2xl md:text-3xl font-bold mt-1">{totalView}</p>
        </Card>
      </div>

      {/* Legenda */}
      <Card className="p-4 bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground mb-2">PERMISSÕES</p>
        <div className="grid md:grid-cols-3 gap-2 text-xs">
          <div><Badge className={ROLE_TONE.admin}>Administrador</Badge> <span className="text-muted-foreground ml-1">edita tudo + gerencia usuários</span></div>
          <div><Badge className={ROLE_TONE.gestor}>Gestor</Badge> <span className="text-muted-foreground ml-1">edita, cadastra e demite colaboradores</span></div>
          <div><Badge className={ROLE_TONE.usuario}>Visualizador</Badge> <span className="text-muted-foreground ml-1">apenas consulta dados e dashboards</span></div>
        </div>
      </Card>

      {/* Busca */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Lista */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Nenhum usuário encontrado</div>
        ) : (
          <div className="divide-y">
            {filtered.map((u) => {
              const role = highestRole(u.roles);
              const isMe = u.id === user?.id;
              return (
                <div key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{u.nome || "(sem nome)"}</p>
                      {isMe && <Badge variant="outline" className="text-[10px]">você</Badge>}
                      <Badge className={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Select
                      value={role}
                      onValueChange={(v) => changeRole(u, v as Role)}
                      disabled={isMe && role === "admin"}
                    >
                      <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="usuario">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={isMe}
                      onClick={() => setConfirmDelete(u)}
                      title="Revogar acesso"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar acesso?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.nome ?? confirmDelete?.email}</strong> não poderá mais acessar o sistema.
              A conta de login não é apagada — você pode restaurar o acesso atribuindo uma permissão novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && removeUser(confirmDelete)}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
