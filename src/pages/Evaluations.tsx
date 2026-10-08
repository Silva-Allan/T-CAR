import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Calendar, Check, ChevronRight, GitCompare, Layers, Loader2, X } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { SupabaseService, EvaluationWithTests } from '@/services/SupabaseService';
import { MergeService } from '@/services/MergeService';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/Logger';

export default function Evaluations() {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const [evaluations, setEvaluations] = useState<EvaluationWithTests[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const locale = lang === 'en' ? 'en-US' : (lang as string) === 'es' ? 'es-ES' : 'pt-BR';
  const formatDay = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  useEffect(() => {
    SupabaseService.getEvaluations()
      .then(setEvaluations)
      .catch(error => {
        Logger.error('Erro ao carregar avaliações:', error);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const periodOf = (evaluation: EvaluationWithTests) => {
    const days = evaluation.evaluation_tests
      .map(et => et.tests?.date)
      .filter((d): d is string => !!d)
      .map(d => MergeService.localDayAndTime(d).day)
      .sort();
    if (!days.length) return '-';
    const start = days[0];
    const end = days[days.length - 1];
    return start === end ? formatDay(start) : `${formatDay(start)} - ${formatDay(end)}`;
  };

  const toggle = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const exitSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const openComparison = () => {
    // Ordem cronológica pela primeira bateria de cada avaliação
    const firstDay = (e: EvaluationWithTests) =>
      e.evaluation_tests.map(et => et.tests?.date || '').filter(Boolean).sort()[0] || '';
    const ordered = evaluations
      .filter(e => selected.includes(e.id))
      .sort((a, b) => firstDay(a).localeCompare(firstDay(b)))
      .map(e => e.id);
    navigate(`/reports/merged?evaluations=${ordered.join(',')}`);
  };

  return (
    <PageContainer
      title={t('evaluationsTitle')}
      showBack
      backTo="/"
      action={
        evaluations.length > 1 && (
          selecting ? (
            <Button size="sm" variant="ghost" onClick={exitSelection}>
              <X className="w-4 h-4 mr-1" />
              {t('cancel')}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setSelecting(true)}>
              <GitCompare className="w-4 h-4 mr-1" />
              {t('compare')}
            </Button>
          )
        )
      }
    >
      <div className={cn('max-w-md mx-auto', selecting && 'pb-24')}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : loadError ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">{t('evaluationsLoadError')}</p>
          </div>
        ) : evaluations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Layers className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-medium">{t('noEvaluations')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('noEvaluationsDesc')}</p>
            <Button onClick={() => navigate('/history')} className="mt-4">
              {t('historyTitle')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {selecting && (
              <p className="text-sm text-muted-foreground">{t('compareSelectHint')}</p>
            )}
            {evaluations.map((evaluation, index) => {
              const isSelected = selected.includes(evaluation.id);
              const batteryCount = evaluation.evaluation_tests.length;
              return (
                <button
                  key={evaluation.id}
                  onClick={() => (selecting ? toggle(evaluation.id) : navigate(`/reports/merged?evaluations=${evaluation.id}`))}
                  className={cn(
                    'w-full glass-card rounded-xl p-4 flex items-center gap-3 text-left animate-fade-in hover:shadow-md transition-all',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {selecting && (
                    <span className={cn(
                      'w-5 h-5 shrink-0 rounded border flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{evaluation.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {periodOf(evaluation)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {batteryCount} {batteryCount === 1 ? t('mergedBatterySingular') : t('mergedBatteriesShort')}
                    </p>
                  </div>
                  {!selecting && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selecting && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-card/95 backdrop-blur-md border-t border-border/60">
          <div className="max-w-md mx-auto">
            <Button className="w-full" disabled={selected.length < 2} onClick={openComparison}>
              <GitCompare className="w-4 h-4 mr-2" />
              {t('compareCount', selected.length)}
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
