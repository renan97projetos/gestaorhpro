import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/e/$slug/login")({
  component: Page,
});

type Empresa = { id: string; nome: string; slug: string; logo_url: string | null; capa_url: string | null };

function Page() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("empresas").select("id,nome,slug,logo_url,capa_url").eq("slug", slug).maybeSingle();
      setEmpresa((data as Empresa) || null);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (user && empresa) {
      // marca empresa atual e segue
      try { localStorage.setItem("empresa_atual_id", empresa.id); } catch { /* ignore */ }
      navigate({ to: "/inicio" });
    }
  }, [user, empresa, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, senha);
      if (empresa) localStorage.setItem("empresa_atual_id", empresa.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!empresa) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <h1 className="text-2xl font-bold">Empresa não encontrada</h1>
      <Link to="/" className="text-primary underline">Ir para login geral</Link>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[image:var(--gradient-soft)] relative overflow-hidden">
      {empresa.capa_url && <img src={empresa.capa_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
      <Card className="relative w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
        <div className="flex flex-col items-center mb-6">
          {empresa.logo_url ? (
            <img src={empresa.logo_url} alt={empresa.nome} className="h-20 w-20 rounded-2xl object-cover border" />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-2xl">
              {empresa.nome.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-bold mt-3">{empresa.nome}</h1>
          <p className="text-xs text-muted-foreground">Acesso ao painel</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>
          <div className="flex justify-between text-xs">
            <Link to="/e/$slug" params={{ slug }} className="text-muted-foreground hover:underline">Ver vagas</Link>
            <Link to="/" className="text-muted-foreground hover:underline">Login geral</Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
