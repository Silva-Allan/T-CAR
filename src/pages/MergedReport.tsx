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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SupabaseService, EvaluationWithTests } from '@/services/SupabaseService';
import { MergeService, ReportGroupInput, ReportTest } from '@/services/MergeService';
import { ExcelExportService } from '@/services/ExcelExportService';
import { ExportService } from '@/services/ExportService';
import { CalculatorService } from '@/services/CalculatorService';
import { useTranslation } from '@/hooks/useTranslation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/Logger';

const ALL = '__all__';

/** Nome de arquivo seguro: sem acentos, espaços ou caracteres especiais */
function fileSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .substring(0, 60) || 'avaliacao';
}

export default function MergedReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang } = useTranslation();
  const { toast } = useToast();

  const testIdsParam = searchParams.get('tests');
  const evaluationIdsParam = searchParams.get('evaluations');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tests, setTests] = useState<ReportTest[]>([]);
  const [groupInputs, setGroupInputs] = useState<ReportGroupInput[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationWithTests[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);

  const [teamFilter, setTeamFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);
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
          setGroupInputs(evals.map(e => ({
            key: e.id,
            label: e.name,
            testIds: e.evaluation_tests.map(et => et.test_id),
          })));
          setMissingCount(ids.length - evals.length);
        } else if (testIdsParam) {
          const ids = testIdsParam.split(',').filter(Boolean);
          const rows = await SupabaseService.getTestsForReport(ids);
          const normalized = rows.map(r => MergeService.fromSupabase(r));
          setEvaluations([]);
          setTests(normalized);
          setGroupInputs(MergeService.groupByDay(normalized, formatDay));
          setMissingCount(ids.length - normalized.length);
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
  }, [testIdsParam, evaluationIdsParam, lang]);

  const filterOptions = useMemo(() => MergeService.filterOptions(tests), [tests]);

  const report = useMemo(() => {
    const filtered = MergeService.applyFilters(tests, {
      team: teamFilter === ALL ? null : teamFilter,
      category: categoryFilter === ALL ? null : categoryFilter,
    });
    return MergeService.merge(filtered, groupInputs);
  }, [tests, groupInputs, teamFilter, categoryFilter]);

  const title = singleEvaluation?.name ?? null;

  const fileBase = () => {
    const parts = [title ? fileSlug(title) : 'avaliacao'];
    if (report.period) {
      parts.push(report.period.start === report.period.end
        ? report.period.start
        : `${report.period.start}_a_${report.period.end}`);
    }
    if (teamFilter !== ALL) parts.push(fileSlug(teamFilter));
    if (categoryFilter !== ALL) parts.push(fileSlug(categoryFilter));
    return `tcar_${parts.join('_')}`;
  };

  const handleExportExcel = async () => {
    setExporting('xlsx');
    try {
      await ExcelExportService.exportReport(report, t, `${fileBase()}.xlsx`);
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
        title,
        team: trainerProfile?.club || null,
        fileName: `${fileBase()}.pdf`,
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
    setFormName(`${t('evaluationDefaultName')} ${period}`.trim());
    setFormNotes('');
    setSaveOpen(true);
  };

  const handleSaveEvaluation = async () => {
    const name = formName.trim();
    if (!name) return;
    setSavingEvaluation(true);
    try {
      const evaluation = await SupabaseService.createEvaluation(name, formNotes.trim() || null, tests.map(t => t.id));
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

  const backTo = evaluationIdsParam ? '/evaluations' : '/history';

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
            {title ?? (multiGroup ? t('mergedComparisonOf', report.groups.length) : t('mergedSingleDay'))}
          </h2>
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
        {(filterOptions.teams.length > 1 || filterOptions.categories.length > 1) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('team')}</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('mergedAll')}</SelectItem>
                  {filterOptions.teams.map(team => (
                    <SelectItem key={team} value={team}>{team}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('xlsCategory')}</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('mergedAll')}</SelectItem>
                  {filterOptions.categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

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
                <div key={section.level} className="space-y-2">
                  {report.mixedLevels && (
                    <h3 className="font-semibold text-sm">{t('level')} {section.level}</h3>
                  )}
                  {section.ranking.map(entry => (
                    <div
                      key={entry.row.athleteId}
                      className={cn(
                        'flex items-center justify-between gap-3 p-3 rounded-lg glass-card',
                        entry.row.eliminatedByFailure && 'border border-destructive/30'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-7 h-7 shrink-0 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
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
                        <p className="text-xs text-muted-foreground">km/h</p>
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
                  <div key={section.level} className="space-y-2">
                    {report.mixedLevels && (
                      <h3 className="font-semibold text-sm">{t('level')} {section.level}</h3>
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
