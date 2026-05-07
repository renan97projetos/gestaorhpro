import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/gestaorhpro-logo.png";

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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="ghost" />
      </div>

      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: brand panel */}
        <div className="hidden lg:flex relative items-center justify-center bg-primary text-primary-foreground p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-90 bg-[image:var(--gradient-primary)]" />
          <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center">
            <img
              src={logo}
              alt="GestãoRHPRO"
              className="h-28 w-28 mb-8 drop-shadow-xl"
            />
            <h2 className="text-4xl font-bold tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="mt-3 text-base text-primary-foreground/80">
              Continue gerindo sua equipe com simplicidade e inteligência.
            </p>
          </div>
        </div>

        {/* Right: form */}
        <div className="flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex flex-col items-center mb-8">
              <img src={logo} alt="GestãoRHPRO" className="h-16 w-16 mb-3" />
            </div>

            <h1 className="text-3xl font-semibold tracking-tight">Entrar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Acesse sua conta GestãoRHPRO.
            </p>

            <div className="mt-8">
              <LoginForm onSubmit={signIn} onForgot={resetPassword} />
            </div>

            <p className="mt-10 text-center text-xs text-muted-foreground">
              O cadastro de novos usuários é feito apenas pela Central Master.
            </p>
          </div>
        </div>
      </div>
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
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Senha
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={forgot}
            className="text-xs text-primary hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
      <Button
        type="submit"
        className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Entrar <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
