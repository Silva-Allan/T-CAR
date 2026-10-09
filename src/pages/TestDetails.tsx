import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Gauge, Trophy, Ruler, Heart, Calendar, Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { ExportService } from '@/services/ExportService';
import { ExcelExportService } from '@/services/ExcelExportService';
import { MergeService, MergedReport, ReportTest } from '@/services/MergeService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { ordinal } from '@/lib/utils';
import { Logger } from '@/utils/Logger';

export default function TestDetails() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<ReportTest | null>(null);
  const [report, setReport] = useState<MergedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  const locale = (lang as string) === 'en' ? 'en-US' : (lang as string) === 'es' ? 'es-ES' : 'pt-BR';
  const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(locale);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadTest = async () => {
      if (!id) return;
      try {
        // Traz o atleta junto (categoria, posição, modalidade, sexo) para a classificação
        const [rows, profileData] = await Promise.all([
          SupabaseService.getTestsForReport([id]),
          SupabaseService.getProfile()
        ]);
        if (rows[0]) {
          const reportTest = MergeService.fromSupabase(rows[0]);
          setTest(reportTest);
          setReport(MergeService.merge([reportTest], [{
            key: reportTest.day,
            label: formatDay(reportTest.day),
            testIds: [reportTest.id],
          }]));
        }
        setTrainerProfile(profileData);
      } catch (error) {
        Logger.error('Error loading test:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user, navigate]);

  const handleExportPDF = async () => {
    if (!test || !report) return;
    setExporting(true);
    try {
      await ExportService.exportMergedReportToPDF(report, t, lang as string, {
        kind: 'battery',
        team: trainerProfile?.club || null,
        fileName: `tcar_teste_${test.day}.pdf`,
      });
    } catch (error) {
      Logger.error('Erro ao exportar PDF:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!test || !report) return;
    setExportingExcel(true);
    try {
      await ExcelExportService.exportReport(report, t, `tcar_teste_${test.day}.xlsx`);
    } catch (error) {
      Logger.error('Erro ao exportar Excel:', error);
    } finally {
      setExportingExcel(false);
    }
  };

  if (loading) {
    return (
      <PageContainer title={t('testDetailsTitle')} showBack backTo="/history">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!test || !report) {
    return (
      <PageContainer title={t('testDetailsTitle')} showBack backTo="/history">
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('testNotFound')}</p>
          <Button onClick={() => navigate('/history')} className="mt-4">
            {t('backToHistory')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={t('testDetailsTitle')} showBack backTo="/history">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">{t('protocolLabel')} {t('level')} {test.protocolLevel}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            {formatDay(test.day)}{test.time ? ` ${test.time}` : ''}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="gap-2"
            >
              {exportingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {t('exportExcel')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {t('exportPDF')}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t('level')}
            value={test.protocolLevel.toString()}
            icon={<Gauge className="w-4 h-4 text-primary" />}
          />
          <StatCard
            label={t('totalTime')}
            value={CalculatorService.formatTime(test.totalTime)}
            icon={<Clock className="w-4 h-4 text-primary" />}
          />
        </div>

        {/* Notes */}
        {test.notes && (
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">{test.notes}</p>
          </div>
        )}

        {/* Athletes Results — um ranking por modalidade */}
        <div className="space-y-3">
          <h3 className="font-semibold">{t('resultsByAthlete')}</h3>

          {report.sections.map(section => (
            <div key={`${section.group}-${section.level}`} className="space-y-3">
              {report.mixedGroups && (
                <h4 className="text-sm font-semibold text-muted-foreground pt-1">{t(`group_${section.group}` as any)}</h4>
              )}
              {section.ranking.map((entry, index) => {
                const r = entry.row;
                const fc = r.fcFinal ?? r.fcEstimada;
                return (
                  <div
                    key={r.athleteId}
                    className="glass-card p-4 rounded-xl animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: entry.classification?.color ?? 'hsl(var(--primary))' }}
                        >
                          {entry.position}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{r.athleteName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {entry.classification ? (
                              <span className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: `${entry.classification.color}20`,
                                  color: entry.classification.color
                                }}>
                                {t(entry.classification.label as any)}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {t('placeLabel', ordinal(entry.position, lang as string))}
                              </span>
                            )}
                            {fc != null && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Heart className="w-3 h-3 text-rose-500" />
                                {r.fcFinal != null ? fc : `~${fc}`} bpm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-mono font-black text-primary">{r.pvCorrigido.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">{t('correctedPVUnit')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t('stagesLabel')}</p>
                          <p className="font-mono">{r.completedStages}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ruler className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t('distanceLabel')}</p>
                          <p className="font-mono">{r.finalDistance}m</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
