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
