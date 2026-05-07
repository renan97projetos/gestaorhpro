import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AppLayout } from "@/components/AppLayout";
import { useEmpresa } from "@/lib/empresa-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Upload } from "lucide-react";
import { autoFitImage } from "@/lib/image-fit";

export const Route = createFileRoute("/empresa-config")({
  component: () => (<RequireAuth><AppLayout><Page /></AppLayout></RequireAuth>),
});

function Page() {
  const { empresaAtual, isGestorEmpresa, refresh } = useEmpresa();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (empresaAtual) {
      setForm({
        nome: empresaAtual.nome || "",
        sobre: empresaAtual.sobre || "",
        endereco: empresaAtual.endereco || "",
        telefone: empresaAtual.telefone || "",
        cnpj: empresaAtual.cnpj || "",
        email_contato: empresaAtual.email_contato || "",
        logo_url: empresaAtual.logo_url || "",
        capa_url: empresaAtual.capa_url || "",
        cor_primaria: empresaAtual.cor_primaria || "",
      });
    }
  }, [empresaAtual]);

  if (!empresaAtual) return <div className="p-8"><Card className="p-6">Selecione uma empresa.</Card></div>;
  if (!isGestorEmpresa) return <div className="p-8"><Card className="p-6">Apenas administradores ou gestores da empresa podem editar.</Card></div>;

  const upload = async (field: "logo_url" | "capa_url", file: File) => {
    // Logo => quadrado 512 com padding; capa => banner 1600x500 sem cortar conteúdo
    const fitted = field === "logo_url"
      ? await autoFitImage(file, { size: 512, padding: 0.1 })
      : await autoFitImage(file, { size: 1200, padding: 0.04, format: "image/jpeg", background: "#ffffff" });
    const path = `${empresaAtual.id}/${field}-${Date.now()}-${fitted.name}`;
    const { error } = await supabase.storage.from("empresa-assets").upload(path, fitted, { upsert: true, contentType: fitted.type });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("empresa-assets").getPublicUrl(path);
    // Persistir imediatamente para evitar perda se o usuário não clicar em Salvar
    const { data: updated, error: updErr } = await supabase
      .from("empresas")
      .update({ [field]: data.publicUrl } as never)
      .eq("id", empresaAtual.id)
      .select("id")
      .maybeSingle();
    if (updErr) return toast.error(updErr.message);
    if (!updated) return toast.error("Sem permissão para atualizar esta empresa.");
    setForm((f) => ({ ...f, [field]: data.publicUrl }));
    toast.success("Imagem salva");
    refresh();
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("empresas").update(form as never).eq("id", empresaAtual.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    refresh();
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações da Empresa</h1>
        <p className="text-sm text-muted-foreground">Estes dados aparecem na landing page pública: <code>/e/{empresaAtual.slug}</code></p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><Label>E-mail de contato</Label><Input value={form.email_contato} onChange={(e) => setForm({ ...form, email_contato: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Sobre a empresa</Label><Textarea rows={4} value={form.sobre} onChange={(e) => setForm({ ...form, sobre: e.target.value })} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Logo</Label>
            {form.logo_url && <img src={form.logo_url} alt="logo" className="h-24 w-24 object-contain rounded mb-2 border" />}
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload("logo_url", e.target.files[0])} />
          </div>
          <div>
            <Label>Capa (banner grande)</Label>
            {form.capa_url && <img src={form.capa_url} alt="capa" className="h-24 w-full object-cover rounded mb-2 border" />}
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload("capa_url", e.target.files[0])} />
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full"><Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}</Button>
      </Card>
    </div>
  );
}
