import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarRange, FileBarChart, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ReportFiltersBar } from '@/components/ReportFiltersBar';
import { SupabaseService } from '@/services/SupabaseService';
import { MergeService, ReportFilters, ReportTest } from '@/services/MergeService';
import { useTranslation } from '@/hooks/useTranslation';
import { describeFilters, filtersFromParams, writeFiltersToParams } from '@/lib/reportFilters';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/Logger';

const pad = (n: number) => n.toString().padStart(2, '0');
const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isDay = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

type Preset = 'today' | 'last30' | 'thisYear';

function presetRange(preset: Preset): { from: string; to: string } {
  const today = new Date();
  if (preset === 'today') return { from: toDay(today), to: toDay(today) };
  if (preset === 'thisYear') return { from: `${today.getFullYear()}-01-01`, to: toDay(today) };
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { from: toDay(start), to: toDay(today) };
}

/**
 * Gera um relatório a partir de período + filtros, sem escolher baterias à
 * mão: ex. "Futebol · Sub-15 · Feminino" de todos os testes de setembro.
 */
export default function ReportBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const initial = presetRange('last30');
  const [from, setFrom] = useState(isDay(searchParams.get('from')) ? searchParams.get('from')! : initial.from);
  const [to, setTo] = useState(isDay(searchParams.get('to')) ? searchParams.get('to')! : initial.to);
  const [filters, setFilters] = useState<ReportFilters>(() => filtersFromParams(searchParams));
  const [tests, setTests] = useState<ReportTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const invalidRange = from > to;

  // Busca os testes do período; os filtros são aplicados aqui mesmo (prévia ao vivo)
  useEffect(() => {
    if (!isDay(from) || !isDay(to) || invalidRange) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const [fy, fm, fd] = from.split('-').map(Number);
    const [ty, tm, td] = to.split('-').map(Number);
    SupabaseService.getTestsForReportInRange(
      new Date(fy, fm - 1, fd).toISOString(),
      new Date(ty, tm - 1, td + 1).toISOString()
    )
      .then(rows => { if (!cancelled) setTests(rows.map(r => MergeService.fromSupabase(r))); })
      .catch(error => {
        Logger.error('Erro ao buscar testes do período:', error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, invalidRange]);

  const options = useMemo(() => MergeService.filterOptions(tests), [tests]);
  const count = useMemo(() => MergeService.countMatches(tests, filters), [tests, filters]);
  const filtersText = describeFilters(filters, t);

  const activePreset = (['today', 'last30', 'thisYear'] as Preset[]).find(p => {
    const r = presetRange(p);
    return r.from === from && r.to === to;
  });

  const applyPreset = (preset: Preset) => {
    const r = presetRange(preset);
    setFrom(r.from);
    setTo(r.to);
  };

  const handleGenerate = () => {
    const params = writeFiltersToParams(new URLSearchParams({ from, to }), filters);
    navigate(`/reports/merged?${params.toString()}`);
  };

  return (
    <PageContainer title={t('reportBuilderTitle')} showBack backTo="/evaluations">
      <div className="max-w-md mx-auto space-y-6 pb-28">
        <p className="text-sm text-muted-foreground">{t('reportBuilderDesc')}</p>

        {/* Período */}
        <section className="glass-card p-4 rounded-xl space-y-3" aria-labelledby="period-title">
          <h2 id="period-title" className="text-sm font-semibold flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            {t('period').replace(':', '')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['today', 'last30', 'thisYear'] as Preset[]).map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                  activePreset === preset
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                )}
              >
                {t(`preset_${preset}` as any)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="builder-from" className="text-xs text-muted-foreground">{t('periodFrom')}</Label>
              <Input id="builder-from" type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1 min-w-0">
              <Label htmlFor="builder-to" className="text-xs text-muted-foreground">{t('periodTo')}</Label>
              <Input id="builder-to" type="date" value={to} min={from} onChange={e => setTo(e.target.value)} />
            </div>
          </div>
          {invalidRange && <p className="text-xs text-destructive">{t('periodInvalid')}</p>}
        </section>

        {/* Filtros */}
        <section className="glass-card p-4 rounded-xl space-y-3" aria-labelledby="filters-title">
          <h2 id="filters-title" className="text-sm font-semibold">{t('filtersLabel').replace(':', '')}</h2>
          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : loadError ? (
            <p className="text-sm text-muted-foreground flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
              {t('mergedLoadError')}
            </p>
          ) : tests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('builderNoTests')}</p>
          ) : (
            <ReportFiltersBar options={options} value={filters} onChange={setFilters} t={t} idPrefix="builder" />
          )}
        </section>
      </div>

      {/* Prévia + gerar */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-card/95 backdrop-blur-md border-t border-border/60"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-xs text-center text-muted-foreground" aria-live="polite">
            {loading || invalidRange
              ? ' '
              : t('builderCount', count.athletes, count.batteries)}
            {!loading && filtersText && <span className="text-primary font-medium"> · {filtersText}</span>}
          </p>
          <Button
            className="w-full"
            disabled={loading || invalidRange || loadError || count.athletes === 0}
            onClick={handleGenerate}
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            {t('generateReport')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
