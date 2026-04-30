// Helpers compartilhados para Dashboard e Lista
export type ColabFull = {
  id: string;
  matricula: string;
  colaborador: string;
  status: "Ativo" | "Demitido" | "Afastado" | "Ferias";
  cargo: string | null;
  setor: string | null;
  subsetor: string | null;
  lideranca: string | null;
  turno: string | null;
  sabado_trabalho: string | null;
  sabado_horario: string | null;
  horario_almoco: string | null;
  horario_cafe: string | null;
  admissao: string | null;
  sexo: "Masculino" | "Feminino" | null;
  data_demissao: string | null;
  tipo_demissao: string | null;
  data_nascimento: string | null;
  cidade: string | null;
  bairro: string | null;
};

export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function aggregate<T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T,
  top = 50
) {
  const map = new Map<string, number>();
  arr.forEach((c) => {
    const v = (c[key] as string) || "—";
    map.set(v, (map.get(v) ?? 0) + 1);
  });
  return Array.from(map, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top);
}

export function contratacoesPorMes(colabs: ColabFull[], ano: number) {
  const counts = Array(12).fill(0);
  colabs.forEach((c) => {
    if (!c.admissao) return;
    const d = new Date(c.admissao);
    if (d.getFullYear() === ano) counts[d.getMonth()]++;
  });
  return MESES.map((m, i) => ({ mes: m, contratacoes: counts[i] }));
}

export function demissoesPorMes(colabs: ColabFull[], ano: number) {
  const counts = Array(12).fill(0);
  colabs.forEach((c) => {
    if (!c.data_demissao) return;
    const d = new Date(c.data_demissao);
    if (d.getFullYear() === ano) counts[d.getMonth()]++;
  });
  return counts;
}

export function turnoverDoAno(colabs: ColabFull[], ano: number) {
  // Admissões e demissões dentro do ano
  const admissoes = colabs.filter((c) => {
    if (!c.admissao) return false;
    return new Date(c.admissao).getFullYear() === ano;
  }).length;

  const demissoes = colabs.filter((c) => {
    if (!c.data_demissao) return false;
    return new Date(c.data_demissao).getFullYear() === ano;
  }).length;

  // Estimativa de média de colaboradores no ano (início + fim) / 2
  const fimAno = new Date(ano, 11, 31);
  const inicioAno = new Date(ano, 0, 1);
  const ativosFim = colabs.filter((c) => {
    if (!c.admissao || new Date(c.admissao) > fimAno) return false;
    if (c.data_demissao && new Date(c.data_demissao) <= fimAno) return false;
    return true;
  }).length;
  const ativosInicio = colabs.filter((c) => {
    if (!c.admissao || new Date(c.admissao) >= inicioAno) return false;
    if (c.data_demissao && new Date(c.data_demissao) < inicioAno) return false;
    return true;
  }).length;
  const media = (ativosInicio + ativosFim) / 2 || 1;
  const taxa = (demissoes / media) * 100;
  return {
    admissoes,
    demissoes,
    saldo: admissoes - demissoes,
    taxa: Math.round(taxa * 10) / 10,
    ativosInicio,
    ativosFim,
  };
}

export function anosDisponiveis(colabs: ColabFull[]): number[] {
  const set = new Set<number>();
  colabs.forEach((c) => {
    if (c.admissao) set.add(new Date(c.admissao).getFullYear());
    if (c.data_demissao) set.add(new Date(c.data_demissao).getFullYear());
  });
  if (set.size === 0) set.add(new Date().getFullYear());
  return Array.from(set).sort((a, b) => b - a);
}

export function tempoDeEmpresa(admissao: string | null): string {
  if (!admissao) return "—";
  const ini = new Date(admissao);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - ini.getFullYear()) * 12 + (hoje.getMonth() - ini.getMonth());
  if (hoje.getDate() < ini.getDate()) meses -= 1;
  if (meses < 1) return "menos de 1 mês";
  if (meses < 12) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  const anos = Math.floor(meses / 12);
  const restoMeses = meses % 12;
  const partAnos = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (restoMeses === 0) return partAnos;
  return `${partAnos} e ${restoMeses} ${restoMeses === 1 ? "mês" : "meses"}`;
}

export function tempoExperiencia(admissao: string | null): { label: string; tone: "novo" | "experiente" | "veterano" } {
  if (!admissao) return { label: "—", tone: "novo" };
  const ini = new Date(admissao);
  const hoje = new Date();
  const meses = (hoje.getFullYear() - ini.getFullYear()) * 12 + (hoje.getMonth() - ini.getMonth());
  if (meses < 6) return { label: "Novo", tone: "novo" };
  if (meses < 24) return { label: "Em adaptação", tone: "novo" };
  return { label: "Experiente", tone: "experiente" };
}

/**
 * Calcula o tempo médio de permanência (em meses) dos colaboradores.
 * @param colabs Lista de colaboradores
 * @param scope "ativos" considera apenas ativos+afastados (admissão até hoje);
 *              "demitidos" considera apenas desligados (admissão até demissão);
 *              "todos" combina ambos
 */
export function tempoMedioPermanencia(
  colabs: ColabFull[],
  scope: "ativos" | "demitidos" | "todos" = "todos"
): { mediaMeses: number; mediaTexto: string; amostra: number } {
  const hoje = new Date();
  const valores: number[] = [];
  for (const c of colabs) {
    if (!c.admissao) continue;
    const ini = new Date(c.admissao);
    let fim: Date;
    if (c.status === "Demitido") {
      if (scope === "ativos") continue;
      if (!c.data_demissao) continue;
      fim = new Date(c.data_demissao);
    } else {
      if (scope === "demitidos") continue;
      fim = hoje;
    }
    const meses =
      (fim.getFullYear() - ini.getFullYear()) * 12 +
      (fim.getMonth() - ini.getMonth()) -
      (fim.getDate() < ini.getDate() ? 1 : 0);
    if (meses >= 0) valores.push(meses);
  }
  const amostra = valores.length;
  if (amostra === 0) return { mediaMeses: 0, mediaTexto: "—", amostra: 0 };
  const media = valores.reduce((a, b) => a + b, 0) / amostra;
  const anos = Math.floor(media / 12);
  const restoMeses = Math.round(media % 12);
  let texto = "";
  if (anos > 0) texto += `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (restoMeses > 0) texto += `${anos > 0 ? " e " : ""}${restoMeses} ${restoMeses === 1 ? "mês" : "meses"}`;
  if (!texto) texto = "menos de 1 mês";
  return { mediaMeses: Math.round(media * 10) / 10, mediaTexto: texto, amostra };
}

/**
 * Turnover agrupado por uma chave (setor ou liderança/gestor) no ano informado.
 * Considera o headcount médio do grupo (início + fim do ano) / 2.
 */
export function turnoverPorAgrupamento(
  colabs: ColabFull[],
  ano: number,
  key: "setor" | "lideranca"
): { name: string; admissoes: number; demissoes: number; headcount: number; taxa: number }[] {
  const inicioAno = new Date(ano, 0, 1);
  const fimAno = new Date(ano, 11, 31);
  const grupos = new Map<string, ColabFull[]>();
  for (const c of colabs) {
    const k = (c[key] as string) || "—";
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(c);
  }
  const result: { name: string; admissoes: number; demissoes: number; headcount: number; taxa: number }[] = [];
  for (const [name, arr] of grupos) {
    const admissoes = arr.filter((c) => c.admissao && new Date(c.admissao).getFullYear() === ano).length;
    const demissoes = arr.filter((c) => c.data_demissao && new Date(c.data_demissao).getFullYear() === ano).length;
    const ativosFim = arr.filter((c) => {
      if (!c.admissao || new Date(c.admissao) > fimAno) return false;
      if (c.data_demissao && new Date(c.data_demissao) <= fimAno) return false;
      return true;
    }).length;
    const ativosInicio = arr.filter((c) => {
      if (!c.admissao || new Date(c.admissao) >= inicioAno) return false;
      if (c.data_demissao && new Date(c.data_demissao) < inicioAno) return false;
      return true;
    }).length;
    const headcount = (ativosInicio + ativosFim) / 2;
    const taxa = headcount > 0 ? Math.round((demissoes / headcount) * 1000) / 10 : 0;
    if (admissoes === 0 && demissoes === 0 && headcount === 0) continue;
    result.push({ name, admissoes, demissoes, headcount: Math.round(headcount * 10) / 10, taxa });
  }
  return result.sort((a, b) => b.taxa - a.taxa || b.demissoes - a.demissoes);
}
