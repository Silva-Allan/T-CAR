// ======================================================================
// T-CAR 2.0 — Barra de Filtros Reutilizável
// ======================================================================
// Filtros por Posição, Categoria e Sexo para listas de atletas.
// Usado em SelectAthletes.tsx e Athletes.tsx.
// ======================================================================

import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VALID_POSITIONS } from '@/models/types';

export interface AthleteFilters {
  position: string;
  category: string;
  gender: string;
}

export const EMPTY_FILTERS: AthleteFilters = {
  position: '',
  category: '',
  gender: '',
};

const CATEGORIES = ['Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Profissional'];
const GENDERS = ['M', 'F'];

interface AthleteFilterBarProps {
  filters: AthleteFilters;
  onChange: (filters: AthleteFilters) => void;
  t: (key: string) => string;
}

export function AthleteFilterBar({ filters, onChange, t }: AthleteFilterBarProps) {
  const hasActiveFilters = filters.position || filters.category || filters.gender;

  const update = (key: keyof AthleteFilters, value: string) => {
    onChange({ ...filters, [key]: filters[key] === value ? '' : value });
  };

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          {t('filters') || 'Filtros'}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 transition-colors font-medium"
          >
            <X className="w-3 h-3" />
            {t('clearFilters') || 'Limpar'}
          </button>
        )}
      </div>

      {/* Position chips */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium px-1">{t('position')}</p>
        <div className="flex flex-wrap gap-1.5">
          {VALID_POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => update('position', pos)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                filters.position === pos
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {t(pos)}
            </button>
          ))}
        </div>
      </div>

      {/* Category chips */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium px-1">{t('category')}</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => update('category', cat)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                filters.category === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Gender chips */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-medium px-1">{t('gender') || 'Sexo'}</p>
        <div className="flex flex-wrap gap-1.5">
          {GENDERS.map(g => (
            <button
              key={g}
              onClick={() => update('gender', g)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                filters.gender === g
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {g === 'M' ? t('genderM') : t('genderF')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Aplica os filtros a uma lista de atletas.
 * Trabalha com o tipo genérico para suportar tanto AthleteRow do Supabase
 * quanto o Athlete local.
 */
export function applyAthleteFilters<T extends {
  position?: string | null;
  birth_date?: string | null;
  birthDate?: string;
  gender?: string | null;
}>(athletes: T[], filters: AthleteFilters): T[] {
  return athletes.filter(a => {
    // Filtro por posição
    if (filters.position && a.position !== filters.position) return false;

    // Filtro por categoria (calculada a partir da data de nascimento)
    if (filters.category) {
      const bd = a.birth_date || a.birthDate;
      if (!bd) return false;
      const age = calculateAgeFromDate(bd);
      const cat = categoryFromAge(age);
      if (cat !== filters.category) return false;
    }

    // Filtro por sexo
    if (filters.gender && a.gender !== filters.gender) return false;

    return true;
  });
}

function calculateAgeFromDate(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function categoryFromAge(age: number): string {
  if (age <= 11) return 'Sub-11';
  if (age <= 13) return 'Sub-13';
  if (age <= 15) return 'Sub-15';
  if (age <= 17) return 'Sub-17';
  if (age <= 20) return 'Sub-20';
  return 'Profissional';
}
