// ======================================================================
// T-CAR 2.1 — Filtros dos relatórios
// ======================================================================
// Modalidade, Categoria, Sexo e Equipe. Usado no relatório unificado, no
// relatório de uma bateria e na tela "Gerar relatório".
// ======================================================================

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { genderLabel } from '@/lib/reportFilters';
import type { Sport } from '@/models/types';
import type { Gender, ReportFilters } from '@/services/MergeService';

const ALL = '__all__';

interface ReportFiltersBarProps {
  options: { sports: readonly string[]; categories: readonly string[]; genders: readonly string[]; teams: readonly string[] };
  value: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  t: (key: any, ...args: (string | number)[]) => string;
  idPrefix?: string;
}

export function ReportFiltersBar({ options, value, onChange, t, idPrefix = 'report' }: ReportFiltersBarProps) {
  const fields: {
    key: keyof ReportFilters;
    label: string;
    items: readonly string[];
    itemLabel: (v: string) => string;
  }[] = [
    { key: 'sport', label: t('sport'), items: options.sports, itemLabel: v => t(`sport_${v}`) },
    { key: 'category', label: t('xlsCategory'), items: options.categories, itemLabel: v => v },
    { key: 'gender', label: t('gender'), items: options.genders, itemLabel: v => genderLabel(v, t) },
    { key: 'team', label: t('team'), items: options.teams, itemLabel: v => v },
  ];

  // Só faz sentido filtrar por um campo com mais de uma opção (ou já filtrado)
  const visible = fields.filter(f => f.items.length > 1 || value[f.key]);
  if (visible.length === 0) return null;

  const set = (key: keyof ReportFilters, v: string) => {
    const next = v === ALL ? null : v;
    onChange({
      ...value,
      [key]: key === 'sport' ? (next as Sport | null) : key === 'gender' ? (next as Gender | null) : next,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {visible.map(field => {
        const current = value[field.key] ?? ALL;
        // Mantém visível um valor vindo da URL/avaliação mesmo que não esteja nos dados
        const items = current !== ALL && !field.items.includes(current) ? [...field.items, current] : field.items;
        const id = `${idPrefix}-filter-${field.key}`;
        return (
          <div key={field.key} className="space-y-1 min-w-0">
            <Label htmlFor={id} className="text-xs text-muted-foreground">{field.label}</Label>
            <Select value={current} onValueChange={v => set(field.key, v)}>
              <SelectTrigger id={id}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('mergedAll')}</SelectItem>
                {items.map(item => (
                  <SelectItem key={item} value={item}>{field.itemLabel(item)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
