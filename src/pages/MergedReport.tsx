import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, BookmarkPlus, Calendar, FileSpreadsheet, FileText, Gauge, Layers,
  Loader2, Pencil, Trash2, TrendingDown, TrendingUp, Trophy, Users, Minus
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatCard } from '@/components/test/StatCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReportFiltersBar } from '@/components/ReportFiltersBar';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SupabaseService, EvaluationWithTests } from '@/services/SupabaseService';
import { MergeService, ReportFilters, ReportGroupInput, ReportSection, ReportTest } from '@/services/MergeService';
import { ExcelExportService } from '@/services/ExcelExportService';
import { ExportService } from '@/services/ExportService';
import { CalculatorService } from '@/services/CalculatorService';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import { cn, fileSlug, ordinal } from '@/lib/utils';
import {
  describeFilters, filtersFromJson, filtersFromParams, filtersToJson, writeFiltersToParams,
} from '@/lib/reportFilters';
import { Logger } from '@/utils/Logger';

export default function MergedReport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang } = useTranslation();
  const { toast } = useToast();

  const testIdsParam = searchParams.get('tests');
  const evaluationIdsParam = searchParams.get('evaluations');
  // Relatório gerado por período + filtros (tela "Gerar relatório")
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  // O recorte vive na URL: voltar ou recarregar mantém os filtros
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams]);
  const setFilters = (next: ReportFilters) =>
    setSearchParams(writeFiltersToParams(searchParams, next), { replace: true });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tests, setTests] = useState<ReportTest[]>([]);
  const [groupInputs, setGroupInputs] = useState<ReportGroupInput[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationWithTests[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);

  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  const locale = lang === 'en' ? 'en-US' : (lang as string) === 'es' ? 'es-ES' : 'pt-BR';
  const formatDay = (day: string) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Avaliação salva aberta sozinha → permite renomear/excluir
  const singleEvaluation = evaluations.length === 1 ? evaluations[0] : null;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        SupabaseService.getProfile().then(setTrainerProfile).catch(() => {});

        if (evaluationIdsParam) {
          const ids = evaluationIdsParam.split(',').filter(Boolean);
          const evals = await SupabaseService.getEvaluationsByIds(ids);
          // Mantém a ordem pedida na URL
          evals.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
          const testIds = Array.from(new Set(evals.flatMap(e => e.evaluation_tests.map(et => et.test_id))));
          const rows = await SupabaseService.getTestsForReport(testIds);
          setEvaluations(evals);
          setTests(rows.map(r => MergeService.fromSupabase(r)));
          // Avaliação aberta sozinha: o recorte salvo vira o filtro da tela (pode ser trocado).
          // Comparando várias: cada uma mantém o próprio recorte.
          const single = evals.length === 1;
          setGroupInputs(evals.map(e => ({
            key: e.id,
            label: e.name,
            testIds: e.evaluation_tests.map(et => et.test_id),
            filters: single ? null : filtersFromJson(e.filters),
          })));
          const saved = single ? filtersFromJson(evals[0].filters) : null;
          if (saved && !MergeService.hasFilters(filtersFromParams(searchParams))) {
            setSearchParams(writeFiltersToParams(searchParams, saved), { replace: true });
          }
          setMissingCount(ids.length - evals.length);
        } else if (testIdsParam) {
          const ids = testIdsParam.split(',').filter(Boolean);
          const rows = await SupabaseService.getTestsForReport(ids);
          const normalized = rows.map(r => MergeService.fromSupabase(r));
          setEvaluations([]);
          setTests(normalized);
          setGroupInputs(MergeService.groupByDay(normalized, formatDay));
          setMissingCount(ids.length - normalized.length);
        } else if (fromParam && toParam) {
          // Período em dias locais: [from 00:00, to + 1 dia 00:00)
          const [fy, fm, fd] = fromParam.split('-').map(Number);
          const [ty, tm, td] = toParam.split('-').map(Number);
          const rows = await SupabaseService.getTestsForReportInRange(
            new Date(fy, fm - 1, fd).toISOString(),
            new Date(ty, tm - 1, td + 1).toISOString()
          );
          const normalized = rows.map(r => MergeService.fromSupabase(r));
          setEvaluations([]);
          setTests(normalized);
          setGroupInputs(MergeService.groupByDay(normalized, formatDay));
          setMissingCount(0);
        }
      } catch (error) {
        Logger.error('Erro ao carregar relatório unificado:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    // formatDay depende só do idioma
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testIdsParam, evaluationIdsParam, fromParam, toParam, lang]);

  const filterOptions = useMemo(() => MergeService.filterOptions(tests), [tests]);

  const report = useMemo(
    () => MergeService.merge(MergeService.applyFilters(tests, filters), groupInputs),
    [tests, groupInputs, filters]
  );

  const filtersText = describeFilters(filters, t);
  const title = singleEvaluation?.name ?? null;
  // Título dos documentos: nome da avaliação ou, sem ele, o próprio recorte
  const docTitle = title ?? filtersText;

  // Recorte da tela diferente do salvo na avaliação → oferece salvar
  const savedFilters = singleEvaluation ? filtersFromJson(singleEvaluation.filters) : null;
  const filtersChanged = !!singleEvaluation &&
    JSON.stringify(filtersToJson(filters)) !== JSON.stringify(savedFilters ? filtersToJson(savedFilters) : null);

  const fileBase = () => {
    const parts = [(title && fileSlug(title)) || 'avaliacao'];
    if (report.period) {
      parts.push(report.period.start === report.period.end
        ? report.period.start
        : `${report.period.start}_a_${report.period.end}`);
    }
    if (filtersText) parts.push(fileSlug(filtersText));
    return `tcar_${parts.join('_')}`;
  };

  const handleExportExcel = async () => {
    setExporting('xlsx');
    try {
      await ExcelExportService.exportReport(report, t, `${fileBase()}.xlsx`, { title: docTitle, kind: 'merged', filtersText });
    } catch {
      toast({ variant: 'destructive', title: t('excelExportError') });
    } finally {
      setExporting(null);
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      await ExportService.exportMergedReportToPDF(report, t, lang, {
        title: docTitle,
        team: trainerProfile?.club || null,
        fileName: `${fileBase()}.pdf`,
        filtersText,
      });
    } catch {
      toast({ variant: 'destructive', title: t('pdfExportError') });
    } finally {
      setExporting(null);
    }
  };

  // ── Avaliações salvas ──────────────────────────────────────────────

  const openSaveDialog = () => {
    const period = report.period
      ? (report.period.start === report.period.end
        ? formatDay(report.period.start)
        : `${formatDay(report.period.start)} - ${formatDay(report.period.end)}`)
      : '';
    setFormName([filtersText ?? t('evaluationDefaultName'), period].filter(Boolean).join(' · '));
    setFormNotes('');
    setSaveOpen(true);
  };

  const handleSaveEvaluation = async () => {
    const name = formName.trim();
    if (!name) return;
    setSavingEvaluation(true);
    try {
      // Só as baterias com algum atleta do recorte; o recorte vai junto
      const testIds = report.batteries.map(b => b.testId);
      const evaluation = await SupabaseService.createEvaluation(name, formNotes.trim() || null, testIds, filtersToJson(filters));
      setSaveOpen(false);
      toast({ title: t('evaluationSaved') });
      navigate(`/reports/merged?evaluations=${evaluation.id}`, { replace: true });
    } catch {
      toast({ variant: 'destructive', title: t('evaluationSaveError') });
    } finally {
      setSavingEvaluation(false);
    }
  };

  const openRenameDialog = () => {
    if (!singleEvaluation) return;
    setFormName(singleEvaluation.name);
    setFormNotes(singleEvaluation.notes || '');
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!singleEvaluation) return;
    const name = formName.trim();
    if (!name) return;
    setSavingEvaluation(true);
    try {
      const notes = formNotes.trim() || null;
      await SupabaseService.updateEvaluation(singleEvaluation.id, { name, notes });
      setEvaluations([{ ...singleEvaluation, name, notes }]);
      setGroupInputs(prev => prev.map(g => (g.key === singleEvaluation.id ? { ...g, label: name } : g)));
      setRenameOpen(false);
    } catch {
      toast({ variant: 'destructive', title: t('evaluationSaveError') });
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleSaveFilters = async () => {
    if (!singleEvaluation) return;
    setSavingEvaluation(true);
    try {
      const json = filtersToJson(filters);
      await SupabaseService.updateEvaluation(singleEvaluation.id, { filters: json });
      setEvaluations([{ ...singleEvaluation, filters: json }]);
      toast({ title: t('filtersSaved') });
    } catch {
      toast({ variant: 'destructive', title: t('evaluationSaveError') });
    } finally {
      setSavingEvaluation(false);
    }
  };

  const handleDelete = async () => {
    if (!singleEvaluation) return;
    try {
      await SupabaseService.deleteEvaluation(singleEvaluation.id);
      toast({ title: t('evaluationDeleted') });
      navigate('/evaluations', { replace: true });
    } catch {
      toast({ variant: 'destructive', title: t('evaluationDeleteError') });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────

  const backTo = evaluationIdsParam
    ? '/evaluations'
    : fromParam
      ? `/reports/new?${searchParams.toString()}`
      : '/history';

  if (loading) {
    return (
      <PageContainer title={t('mergedReportTitle')} showBack backTo={backTo}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (loadError || tests.length === 0) {
    return (
      <PageContainer title={t('mergedReportTitle')} showBack backTo={backTo}>
        <div className="text-center py-12 max-w-md mx-auto">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            {loadError ? t('mergedLoadError') : t('mergedNoTests')}
          </p>
          <Button onClick={() => navigate(backTo)} className="mt-4">
            {t('backToHistory')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  const multiGroup = report.groups.length > 1;
  const sectionTitle = (section: ReportSection) => [
    report.mixedGroups ? t(`group_${section.group}` as any) : null,
    report.mixedLevels ? `${t('level')} ${section.level}` : null,
  ].filter(Boolean).join(' - ');
  const periodText = report.period
    ? (report.period.start === report.period.end
      ? formatDay(report.period.start)
      : `${formatDay(report.period.start)} - ${formatDay(report.period.end)}`)
    : '-';

  return (
    <PageContainer title={t('mergedReportTitle')} showBack backTo={backTo}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center pt-2 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
            <Layers className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold break-words">
            {title ?? filtersText ?? (multiGroup ? t('mergedComparisonOf', report.groups.length) : t('mergedSingleDay'))}
          </h2>
          {title && filtersText && (
            <p className="text-sm text-primary font-medium mt-1">{filtersText}</p>
          )}
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            {periodText}
          </p>
          {singleEvaluation?.notes && (
            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{singleEvaluation.notes}</p>
          )}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!!exporting} className="gap-2">
              {exporting === 'xlsx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {t('exportExcel')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={!!exporting} className="gap-2">
              {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {t('exportPDF')}
            </Button>
            {!evaluationIdsParam && (
              <Button size="sm" onClick={openSaveDialog} className="gap-2">
                <BookmarkPlus className="w-4 h-4" />
                {t('saveEvaluation')}
              </Button>
            )}
            {filtersChanged && (
              <Button size="sm" onClick={handleSaveFilters} disabled={savingEvaluation} className="gap-2">
                <BookmarkPlus className="w-4 h-4" />
                {t('saveFilters')}
              </Button>
            )}
            {singleEvaluation && (
              <>
                <Button variant="ghost" size="sm" onClick={openRenameDialog} className="gap-2">
                  <Pencil className="w-4 h-4" />
                  {t('edit')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  {t('delete')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Avisos */}
        {missingCount > 0 && (
          <div className="glass-card p-3 rounded-xl flex gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>{t('mergedMissingTests', missingCount)}</span>
          </div>
        )}
        {report.mixedLevels && (
          <div className="glass-card p-3 rounded-xl flex gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <span>{t('mergedMixedLevels')}</span>
          </div>
        )}

        {/* Filtros */}
        <ReportFiltersBar options={filterOptions} value={filters} onChange={setFilters} t={t} idPrefix="merged" />

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t('totalAthletes')} value={report.stats.athletes} icon={<Users className="w-4 h-4 text-primary" />} />
          <StatCard label={t('mergedBatteriesLabel')} value={report.stats.batteries} icon={<Layers className="w-4 h-4 text-primary" />} />
          <StatCard label={t('bestPV')} value={report.stats.bestPV.toFixed(1)} unit="km/h" icon={<Trophy className="w-4 h-4 text-primary" />} />
          <StatCard label={t('avgPV')} value={report.stats.avgPV.toFixed(1)} unit="km/h" icon={<Gauge className="w-4 h-4 text-primary" />} />
        </div>

        {report.rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">{t('mergedNoResultsForFilter')}</p>
        ) : (
          <Tabs defaultValue="ranking">
            <TabsList className="w-full">
              <TabsTrigger value="ranking" className="flex-1">{t('xlsSheetRanking')}</TabsTrigger>
              {multiGroup && <TabsTrigger value="comparison" className="flex-1">{t('xlsSheetComparison')}</TabsTrigger>}
              <TabsTrigger value="batteries" className="flex-1">{t('xlsSheetBatteries')}</TabsTrigger>
            </TabsList>

            {/* Ranking */}
            <TabsContent value="ranking" className="space-y-4">
              {report.sections.map(section => (
                <div key={`${section.group}-${section.level}`} className="space-y-2">
                  {sectionTitle(section) && (
                    <h3 className="font-semibold text-sm">{sectionTitle(section)}</h3>
                  )}
                  {section.ranking.map(entry => (
                    <div
                      key={entry.row.athleteId}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg glass-card"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-7 h-7 shrink-0 rounded-full text-white text-xs flex items-center justify-center font-bold"
                          style={{ backgroundColor: entry.classification?.color ?? 'hsl(var(--primary))' }}
                        >
                          {entry.position}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{entry.row.athleteName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[entry.row.team, entry.row.category].filter(Boolean).join(' • ') || '-'}
                            {' • '}
                            {multiGroup ? `${report.groups[entry.row.groupIndex].label} • ` : ''}
                            {t('xlsBattery')} {entry.row.batteryNumber}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-primary">
                          {entry.row.pvCorrigido.toFixed(1)}{entry.repeated && '*'}
                        </p>
                        {entry.classification ? (
                          <p className="text-xs font-medium" style={{ color: entry.classification.color }}>
                            {t(entry.classification.label as any)}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{ordinal(entry.position, lang as string)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {report.sections.some(s => s.ranking.some(e => e.repeated)) && (
                <p className="text-xs text-muted-foreground italic">* {t('mergedRepeatedNote')}</p>
              )}
            </TabsContent>

            {/* Comparativo */}
            {multiGroup && (
              <TabsContent value="comparison" className="space-y-4">
                {report.sections.map(section => (
                  <div key={`${section.group}-${section.level}`} className="space-y-2">
                    {sectionTitle(section) && (
                      <h3 className="font-semibold text-sm">{sectionTitle(section)}</h3>
                    )}
                    <div className="glass-card rounded-xl overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-xs text-muted-foreground">
                            <th className="text-left p-2 sticky left-0 bg-card">{t('xlsAthlete')}</th>
                            {report.groups.map((g, i) => (
                              <th key={g.key} className="p-2 text-right whitespace-nowrap" title={g.label}>
                                A{i + 1}
                              </th>
                            ))}
                            <th className="p-2 text-right whitespace-nowrap">{t('evolution').replace(':', '')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {section.comparison.map(c => (
                            <tr key={c.athleteId} className="border-b border-border/30 last:border-0">
                              <td className="p-2 sticky left-0 bg-card max-w-[140px] truncate">{c.athleteName}</td>
                              {c.values.map((v, i) => (
                                <td key={i} className="p-2 text-right font-mono">{v != null ? v.toFixed(1) : '-'}</td>
                              ))}
                              <td className={cn(
                                'p-2 text-right font-mono font-semibold whitespace-nowrap',
                                c.evolution != null && c.evolution > 0 && 'text-success',
                                c.evolution != null && c.evolution < 0 && 'text-destructive'
                              )}>
                                {c.evolution == null ? '-' : (
                                  <span className="inline-flex items-center gap-1">
                                    {c.evolution > 0 ? <TrendingUp className="w-3 h-3" /> : c.evolution < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                    {c.evolution > 0 ? '+' : ''}{c.evolution.toFixed(1)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-muted-foreground space-y-0.5">
                  {report.groups.map((g, i) => (
                    <p key={g.key}>A{i + 1} = {g.label} ({g.batteryCount} {t('mergedBatteriesShort')}, {g.athleteCount} {t('athletesPlural')})</p>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* Baterias */}
            <TabsContent value="batteries" className="space-y-2">
              {report.batteries.map(b => (
                <button
                  key={b.testId}
                  onClick={() => navigate(`/test/${b.testId}`)}
                  className="w-full glass-card p-3 rounded-lg flex items-center justify-between gap-3 text-left hover:shadow-md transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm">
                      {t('xlsBattery')} {b.number}
                      {multiGroup && <span className="text-muted-foreground font-normal"> • {report.groups.find(g => g.key === b.groupKey)?.label}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDay(b.day)}{b.time ? ` ${b.time}` : ''} • {t('level')} {b.protocolLevel} • {CalculatorService.formatTime(b.totalTime)}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary text-muted-foreground shrink-0">
                    {b.athleteCount} {b.athleteCount === 1 ? t('athleteSingular') : t('athletesPlural')}
                  </span>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Salvar avaliação */}
      <Dialog open={saveOpen || renameOpen} onOpenChange={open => { if (!open) { setSaveOpen(false); setRenameOpen(false); } }}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle>{renameOpen ? t('editEvaluation') : t('saveEvaluation')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {saveOpen && <p className="text-sm text-muted-foreground">{t('saveEvaluationDesc')}</p>}
            {saveOpen && multiGroup && (
              <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {t('saveEvaluationMultiDayHint')}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="evaluation-name">{t('name')}</Label>
              <Input
                id="evaluation-name"
                value={formName}
                maxLength={120}
                onChange={e => setFormName(e.target.value)}
                placeholder={t('evaluationNamePlaceholder')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="evaluation-notes">{t('xlsNotes')} {t('optional')}</Label>
              <Textarea
                id="evaluation-notes"
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setSaveOpen(false); setRenameOpen(false); }}>
              {t('cancel')}
            </Button>
            <Button onClick={renameOpen ? handleRename : handleSaveEvaluation} disabled={!formName.trim() || savingEvaluation}>
              {savingEvaluation && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir avaliação */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteEvaluationTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteEvaluationDesc')}</AlertDialogDescription>
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
