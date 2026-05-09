import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "documentos-admissao";
const SIGNED_URL_TTL = 60 * 10; // 10 min

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

async function loadCandidate(token: string) {
  const { data, error } = await supabaseAdmin
    .from("vaga_candidatos")
    .select("id, nome, cpf, data_nascimento, cargo_oferecido, data_inicio, vaga_id, etapa, doc_token")
    .eq("doc_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link inválido");
  return data;
}

function checkIdentity(
  cand: { cpf: string | null; data_nascimento: string | null },
  cpf: string,
  dob: string
) {
  // Both CPF and DOB must be set on the candidate record AND match the request.
  // First-use registration goes through a separate function.
  if (!cand.cpf || !cand.data_nascimento) {
    throw new Error("Cadastro ainda não inicializado. Solicite ao RH.");
  }
  const cpfOk = onlyDigits(cand.cpf) === onlyDigits(cpf);
  const dobOk = cand.data_nascimento === dob;
  if (!cpfOk || !dobOk) throw new Error("CPF ou data de nascimento incorretos");
}

// Candidate first-time registration of CPF + DOB (only allowed when both are blank)
export const initCandidateIdentity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(8).max(128),
      cpf: z.string().min(11).max(20),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data }) => {
    const cand = await loadCandidate(data.token);
    if (cand.cpf || cand.data_nascimento) {
      throw new Error("Identidade já registrada. Informe seus dados de validação.");
    }
    const cpfDigits = onlyDigits(data.cpf);
    if (cpfDigits.length !== 11) throw new Error("CPF inválido");
    const { error } = await supabaseAdmin
      .from("vaga_candidatos")
      .update({ cpf: cpfDigits, data_nascimento: data.dob })
      .eq("id", cand.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Validate identity and return candidate basic info (no PII like full CPF)
export const validateCandidateAccess = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(8).max(128),
      cpf: z.string().min(11).max(20),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data }) => {
    const cand = await loadCandidate(data.token);
    checkIdentity(cand, data.cpf, data.dob);
    return {
      id: cand.id,
      nome: cand.nome,
      cargo_oferecido: cand.cargo_oferecido,
      data_inicio: cand.data_inicio,
      vaga_id: cand.vaga_id,
      hasIdentity: true,
    };
  });

// Returns candidate identity status (does CPF/DOB exist?) without leaking values
export const getCandidatePublicInfo = createServerFn({ method: "POST" })
  .inputValidator(z.object({ token: z.string().min(8).max(128) }))
  .handler(async ({ data }) => {
    const cand = await loadCandidate(data.token);
    return {
      nome: cand.nome,
      cargo_oferecido: cand.cargo_oferecido,
      data_inicio: cand.data_inicio,
      hasIdentity: !!(cand.cpf && cand.data_nascimento),
    };
  });

// List docs + signed URLs for a candidate after identity check
export const listCandidateDocs = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(8).max(128),
      cpf: z.string().min(11).max(20),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
  )
  .handler(async ({ data }) => {
    const cand = await loadCandidate(data.token);
    checkIdentity(cand, data.cpf, data.dob);
    const { data: docs, error } = await supabaseAdmin
      .from("admissao_documentos")
      .select("id, tipo, nome_arquivo, storage_path, uploaded_at")
      .eq("candidato_id", cand.id)
      .order("uploaded_at", { ascending: false });
    if (error) throw new Error(error.message);
    const out: Array<{ id: string; tipo: string; nome_arquivo: string | null; uploaded_at: string; url: string | null }> = [];
    for (const d of docs || []) {
      let url: string | null = null;
      if (d.storage_path) {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(d.storage_path, SIGNED_URL_TTL);
        url = signed?.signedUrl ?? null;
      }
      out.push({ id: d.id, tipo: d.tipo, nome_arquivo: d.nome_arquivo, uploaded_at: d.uploaded_at, url });
    }
    return { docs: out };
  });

// Upload a document for the candidate (after identity check)
export const uploadCandidateDoc = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      token: z.string().min(8).max(128),
      cpf: z.string().min(11).max(20),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      tipo: z.string().min(1).max(60),
      filename: z.string().min(1).max(255),
      contentType: z.string().min(1).max(120),
      fileBase64: z.string().min(4).max(20_000_000), // ~15MB binary
    })
  )
  .handler(async ({ data }) => {
    const cand = await loadCandidate(data.token);
    checkIdentity(cand, data.cpf, data.dob);

    const ext = (data.filename.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "");
    const path = `${cand.id}/${data.tipo}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(data.fileBase64, "base64");
    if (buffer.byteLength > 15 * 1024 * 1024) throw new Error("Arquivo maior que 15MB");

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    // Ensure etapa = admissao so HR sees it in the list
    await supabaseAdmin.from("vaga_candidatos").update({ etapa: "admissao" }).eq("id", cand.id);

    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    const { error } = await supabaseAdmin.from("admissao_documentos").insert({
      candidato_id: cand.id,
      tipo: data.tipo,
      nome_arquivo: data.filename,
      url: signed?.signedUrl ?? "",
      storage_path: path,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// HR (authenticated) gets a signed URL for a stored document. Auth + RLS enforced.
export const getDocSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ docId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    // Use the user-scoped client to enforce RLS on admissao_documentos
    const { supabase } = context;
    const { data: doc, error } = await supabase
      .from("admissao_documentos")
      .select("storage_path")
      .eq("id", data.docId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!doc?.storage_path) throw new Error("Documento não encontrado");
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl };
  });
