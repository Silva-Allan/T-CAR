// ======================================================================
// T-CAR 2.1 — Recorte dos relatórios (categoria, modalidade, sexo, equipe)
// ======================================================================
// Texto do recorte para títulos e documentos, e ida/volta pela URL para o
// relatório não perder os filtros ao voltar ou recarregar a página.
// ======================================================================

import { CATEGORIES, SPORTS, type Sport } from '@/models/types';
import { GENDERS, type Gender, type ReportFilters } from '@/services/MergeService';

type T = (key: any, ...args: (string | number)[]) => string;

const FILTER_KEYS = ['sport', 'category', 'gender', 'team'] as const;

export function genderLabel(gender: string, t: T): string {
  return gender === 'M' ? t('genderM') : gender === 'F' ? t('genderF') : t('genderOther');
}

/** "Futebol · Sub-15 · Feminino · Equipe A", ou null sem filtros */
export function describeFilters(filters: ReportFilters | null | undefined, t: T): string | null {
  if (!filters) return null;
  const parts = [
    filters.sport ? t(`sport_${filters.sport}`) : null,
    filters.category,
    filters.gender ? genderLabel(filters.gender, t) : null,
    filters.team,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}

/** Lê os filtros da URL, ignorando valores inválidos */
export function filtersFromParams(params: URLSearchParams): ReportFilters {
  const sport = params.get('sport');
  const category = params.get('category');
  const gender = params.get('gender');
  return {
    sport: SPORTS.includes(sport as Sport) ? (sport as Sport) : null,
    category: (CATEGORIES as readonly string[]).includes(category ?? '') ? category : null,
    gender: GENDERS.includes(gender as Gender) ? (gender as Gender) : null,
    team: params.get('team') || null,
  };
}

/** Grava os filtros na URL (remove os vazios) */
export function writeFiltersToParams(params: URLSearchParams, filters: ReportFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

/** Converte o JSON salvo na avaliação em filtros válidos */
export function filtersFromJson(json: unknown): ReportFilters | null {
  if (!json || typeof json !== 'object') return null;
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = (json as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) params.set(key, value);
  }
  const filters = filtersFromParams(params);
  return Object.values(filters).some(Boolean) ? filters : null;
}

/** Só os filtros preenchidos, para salvar na avaliação */
export function filtersToJson(filters: ReportFilters): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}
