import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: AuthPage,
});

function AuthPage() {
  const { user, loading, signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/inicio" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[image:var(--gradient-soft)] relative overflow-hidden">
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl" />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="outline" />
      </div>
      <Card className="relative w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
        <div className="flex flex-col items-center mb-6">
          <div className="h-20 w-20 rounded-full bg-card border-4 border-background shadow-[var(--shadow-card)] flex items-center justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-[image:var(--gradient-primary)] flex items-center justify-center text-primary-foreground text-xl font-bold">
              GR
            </div>
          </div>
          <h1 className="text-2xl font-bold bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
            Gestão de Colaboradores
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Sistema Inteligente de Gestão de Colaboradores
          </p>
        </div>

        <div className="mt-6">
          <LoginForm onSubmit={signIn} onForgot={resetPassword} />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            O cadastro de novos usuários é feito apenas pela Central Master.
          </p>
        </div>
      </Card>
    </div>
  );
}

function LoginForm({
  onSubmit,
  onForgot,
}: {
  onSubmit: (email: string, password: string) => Promise<{ error: string | null }>;
  onForgot: (email: string) => Promise<{ error: string | null }>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await onSubmit(email, password);
    setLoading(false);
    if (error) {
      const friendly = /invalid login credentials/i.test(error)
        ? "Email ou senha incorretos."
        : /email not confirmed/i.test(error)
        ? "Email ainda não confirmado. Verifique sua caixa de entrada ou cadastre-se novamente."
        : error;
      toast.error("Falha no login", { description: friendly });
    }
  };

  const forgot = async () => {
    if (!email) return toast.error("Digite o email primeiro");
    const { error } = await onForgot(email);
    if (error) toast.error(error);
    else toast.success("Email de recuperação enviado");
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Senha</Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            placeholder="Sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full bg-[image:var(--gradient-primary)] hover:opacity-90" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
      </Button>
      <button
        type="button"
        onClick={forgot}
        className="block w-full text-sm text-muted-foreground hover:text-primary text-center"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

