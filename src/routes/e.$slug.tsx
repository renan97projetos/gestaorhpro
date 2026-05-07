import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase } from "lucide-react";

export const Route = createFileRoute("/e/$slug")({
  component: Page,
});

type Empresa = { id: string; nome: string; slug: string; logo_url: string | null; capa_url: string | null; sobre: string | null; cor_primaria: string | null };
type Vaga = { id: string; cargo: string | null; setor: string | null; descricao: string | null; link_token: string | null };

function Page() {
  const { slug } = Route.useParams();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: emp } = await supabase.from("empresas_publicas" as never).select("*").eq("slug", slug).maybeSingle();
      if (emp) {
        const e = emp as Empresa;
        setEmpresa(e);
        const { data: vs } = await supabase
          .from("admissoes_movimentacao")
          .select("id,cargo,setor,descricao,link_token")
          .eq("empresa_id", e.id)
          .eq("status", "aberta")
          .eq("publicada", true);
        setVagas((vs as Vaga[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!empresa) return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><h1 className="text-2xl font-bold">Empresa não encontrada</h1><Link to="/" className="text-primary underline">Voltar</Link></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/20 to-primary/40 overflow-hidden">
        {empresa.capa_url && <img src={empresa.capa_url} alt={empresa.nome} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-w-5xl mx-auto h-full flex items-end p-6">
          <div className="flex items-center gap-4">
            {empresa.logo_url ? (
              <img src={empresa.logo_url} alt="logo" className="h-24 w-24 rounded-2xl object-cover bg-white border-4 border-white shadow-xl" />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-white text-primary flex items-center justify-center font-bold text-3xl border-4 border-white shadow-xl">
                {empresa.nome.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-white">
              <h1 className="text-3xl md:text-5xl font-bold drop-shadow">{empresa.nome}</h1>
              {empresa.sobre && <p className="text-sm md:text-base opacity-90 mt-1 max-w-2xl">{empresa.sobre}</p>}
            </div>
          </div>
          <div className="ml-auto">
            <Link to="/e/$slug/login" params={{ slug }}>
              <Button size="sm" variant="secondary">Acessar painel</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Building2 className="h-4 w-4" /> Sobre</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{empresa.sobre || "—"}</p>
        </Card>

        <div>
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2"><Briefcase className="h-5 w-5" /> Vagas abertas <Badge variant="secondary">{vagas.length}</Badge></h2>
          {vagas.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">Nenhuma vaga publicada no momento.</Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {vagas.map((v) => (
                <Card key={v.id} className="p-4 hover:shadow-lg transition-shadow">
                  <p className="font-semibold">{v.cargo || "Vaga"}</p>
                  <p className="text-sm text-muted-foreground">{v.setor || "—"}</p>
                  {v.descricao && <p className="text-sm mt-2 line-clamp-3">{v.descricao}</p>}
                  {v.link_token && (
                    <Link to="/vaga/$token" params={{ token: v.link_token }}>
                      <Button size="sm" className="mt-3">Quero me candidatar</Button>
                    </Link>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-6">© {empresa.nome} · Powered by SaaS</p>
      </div>
    </div>
  );
}
