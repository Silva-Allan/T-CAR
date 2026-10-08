import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Calendar, Gauge, Clock, ChevronDown, ChevronUp, Users, ExternalLink, Loader2, Layers, Check, X, CheckSquare } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Logger } from '@/utils/Logger';

interface TestWithResults {
  id: string;
  protocol_level: number;
  total_time: number;
  date: string;
  test_results: {
    id: string;
    athlete_name: string;
    pv_corrigido: number;
    completed_stages: number;
    final_distance: number;
    fc_final: number | null;
    fc_estimada: number | null;
    eliminated_by_failure: boolean;
  }[];
}

export default function History() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tests, setTests] = useState<TestWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (dateFilter) {
      loadDay(dateFilter);
    } else {
      loadTests(0, true);
    }
  }, [user, navigate, dateFilter]);

  const loadTests = async (pageToLoad: number, isInitial = false) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await SupabaseService.getTests(pageToLoad, PAGE_SIZE);

      if (isInitial) {
        setTests(data as unknown as TestWithResults[]);
      } else {
        setTests(prev => [...prev, ...(data as unknown as TestWithResults[])]);
      }

      setHasMore(data.length === PAGE_SIZE);
      setPage(pageToLoad);
    } catch (error) {
      Logger.error('Error loading tests:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Busca o dia inteiro no servidor (dia LOCAL — `date` é timestamptz),
  // para "selecionar todas do dia" não depender das páginas já carregadas
  const loadDay = async (day: string) => {
    setLoading(true);
    try {
      const [y, m, d] = day.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      const end = new Date(y, m - 1, d + 1);
      const data = await SupabaseService.getTestsInRange(start.toISOString(), end.toISOString());
      setTests(data as unknown as TestWithResults[]);
      setHasMore(false);
    } catch (error) {
      Logger.error('Error loading tests for day:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadTests(page + 1);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await SupabaseService.deleteTest(deleteId);
      setTests(tests.filter(t => t.id !== deleteId));
      setSelected(prev => prev.filter(id => id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      Logger.error('Error deleting test:', error);
    }
  };

  const toggleSelected = (id: string) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const exitSelection = () => {
    setSelecting(false);
    setSelected([]);
  };

  const allVisibleSelected = tests.length > 0 && tests.every(test => selected.includes(test.id));

  const toggleSelectAllVisible = () => {
    const visibleIds = tests.map(test => test.id);
    setSelected(prev => (
      allVisibleSelected
        ? prev.filter(id => !visibleIds.includes(id))
        : Array.from(new Set([...prev, ...visibleIds]))
    ));
  };

  const handleMerge = () => {
    navigate(`/reports/merged?tests=${selected.join(',')}`);
  };

  const formatDate = (dateString: string) => {
    // Append T12:00:00 for date-only strings to avoid UTC midnight timezone shift
    const normalized = dateString.includes('T') ? dateString : `${dateString}T12:00:00`;
    const date = new Date(normalized);
    return date.toLocaleDateString(t('dateLocale'), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <PageContainer title={t('historyTitle')} showBack backTo="/">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={t('historyTitle')}
      showBack
      backTo="/"
      action={
        selecting ? (
          <Button size="sm" variant="ghost" onClick={exitSelection}>
            <X className="w-4 h-4 mr-1" />
            {t('cancel')}
          </Button>
        ) : (
          tests.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setSelecting(true)}>
              <Layers className="w-4 h-4 mr-1" />
              {t('mergeAction')}
            </Button>
          )
        )
      }
    >
      <div className={cn('max-w-md mx-auto', selecting && 'pb-24')}>
        {/* Search Bar */}
        <div className="mb-4 relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            placeholder={t('filterDate')}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>

        {selecting && tests.length > 0 && (
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">{t('mergeSelectHint')}</p>
            <Button size="sm" variant="ghost" onClick={toggleSelectAllVisible} className="shrink-0">
              <CheckSquare className="w-4 h-4 mr-1" />
              {allVisibleSelected
                ? t('mergeUnselectAll')
                : (dateFilter ? t('mergeSelectDay') : t('mergeSelectAll'))}
            </Button>
          </div>
        )}

        {tests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t('noTestsPerformed')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test, index) => {
              const isSelected = selected.includes(test.id);
              return (
                <div
                  key={test.id}
                  className={cn(
                    "glass-card rounded-xl animate-fade-in overflow-hidden",
                    isSelected && "ring-2 ring-primary"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={selecting ? () => toggleSelected(test.id) : undefined}
                  role={selecting ? 'checkbox' : undefined}
                  aria-checked={selecting ? isSelected : undefined}
                >
                  {/* Card Header */}
                  <div className={cn("p-4", selecting && "cursor-pointer")}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        {selecting && (
                          <span className={cn(
                            'mt-0.5 w-5 h-5 shrink-0 rounded border flex items-center justify-center',
                            isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </span>
                        )}
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            {test.test_results.length} {test.test_results.length === 1 ? t('athleteSingular') : t('athletesPlural')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(test.date)}
                          </p>
                        </div>
                      </div>
                      {!selecting && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => navigate(`/test/${test.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteId(test.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Athletes preview */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {test.test_results.slice(0, 3).map(result => (
                        <span
                          key={result.id}
                          className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground"
                        >
                          {result.athlete_name}
                        </span>
                      ))}
                      {test.test_results.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground">
                          +{test.test_results.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Gauge className="w-4 h-4" />
                        <span>{t('level')} {test.protocol_level}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{CalculatorService.formatTime(Number(test.total_time))}</span>
                      </div>
                    </div>

                    {/* Expand button */}
                    {!selecting && (
                      <button
                        className="w-full mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setExpandedId(expandedId === test.id ? null : test.id)}
                      >
                        {expandedId === test.id ? (
                          <>{t('collapse')} <ChevronUp className="w-4 h-4" /></>
                        ) : (
                          <>{t('viewResults')} <ChevronDown className="w-4 h-4" /></>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded content */}
                  {!selecting && expandedId === test.id && (
                    <div className="border-t border-border/50 p-4 bg-secondary/30 space-y-2">
                      {test.test_results
                        .sort((a, b) => Number(b.pv_corrigido) - Number(a.pv_corrigido))
                        .map((result, idx) => (
                          <div
                            key={result.id}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg bg-background/50",
                              result.eliminated_by_failure && "border border-destructive/30"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-medium text-sm">{result.athlete_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {result.completed_stages} {t('stagesLabel')} • {result.final_distance}m
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-mono font-bold text-primary">
                                {Number(result.pv_corrigido).toFixed(1)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {result.fc_final ? `${result.fc_final} bpm` : (result.fc_estimada ? `~${result.fc_estimada} bpm` : 'km/h')}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && tests.length > 0 && (
              <div className="py-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-primary hover:bg-primary/10"
                >
                  {loadingMore ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ChevronDown className="w-4 h-4 mr-2" />
                  )}
                  {t('loadMoreHistory') || 'Carregar mais histórico'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de unificação */}
      {selecting && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-card/95 backdrop-blur-md border-t border-border/60">
          <div className="max-w-md mx-auto">
            <Button className="w-full" disabled={selected.length < 2} onClick={handleMerge}>
              <Layers className="w-4 h-4 mr-2" />
              {t('mergeCount', selected.length)}
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTestTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteTestDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
