import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Check,
  Download,
  History as HistoryIcon,
  RotateCcw,
  Share2,
  Gauge,
  Clock,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Heart,
  Activity,
  Trophy, Home, Save, Loader2, FileText, ChevronUp, BarChart3, Thermometer
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/test/StatCard';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { SyncService } from '@/services/SyncService';
import { ExportService } from '@/services/ExportService';
import { ClassificationService } from '@/services/ClassificationService';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/useTranslation';
import { AthleteResult } from '@/models/types';
import { cn } from '@/lib/utils';
import { Logger } from '@/utils/Logger';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { selectedAthletes } = useApp();
  const { toast } = useToast();
  const multiResult = location.state?.multiResult;

  const [heartRates, setHeartRates] = useState<Record<string, string>>({});
  const [temperature, setTemperature] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      SupabaseService.getProfile().then(setTrainerProfile);
    }
  }, [user]);

  if (!multiResult) {
    return (
      <PageContainer title={t('testResults')}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('noResultsAvailable')}</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            {t('backToHome')}
          </Button>
        </div>
      </PageContainer>
    );
  }

  const handleHeartRateChange = (athleteId: string, value: string) => {
    if (value !== '') {
      const num = parseInt(value);
      if (isNaN(num) || num < 30 || num > 300) return;
    }
    setHeartRates(prev => ({ ...prev, [athleteId]: value }));
  };

  // Calcular resultados com FC
  const enrichedResults: AthleteResult[] = useMemo(() => {
    return (multiResult.athleteResults as AthleteResult[]).map(ar => {
      const athlete = selectedAthletes.find(a => a.id === ar.athleteId);
      const fcFinalInput = heartRates[ar.athleteId] ? parseInt(heartRates[ar.athleteId]) : null;

      // Suportar tanto birthDate quanto birth_date
      const bDate = athlete?.birthDate || (athlete as any)?.birth_date;

      const fc = CalculatorService.calculateFC(
        fcFinalInput,
        bDate || undefined
      );

      return {
        ...ar,
        fcFinal: fc.fcFinal,
        fcEstimada: fc.fcEstimada,
      };
    });
  }, [multiResult.athleteResults, heartRates, selectedAthletes]);

  const handleSaveToHistory = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('loginRequired'),
        description: t('loginToSaveDesc')
      });
      navigate('/auth');
      return;
    }

    const tempValue = temperature ? parseFloat(temperature) : null;
    if (tempValue !== null && (isNaN(tempValue) || tempValue < -10 || tempValue > 60)) {
      toast({ variant: 'destructive', title: t('ambientTemperature'), description: '-10 ~ 60 °C' });
      return;
    }

    setSaving(true);
    try {
      // ── TIMESTAMP: usa a hora real do fim do teste, não a hora do clique em Salvar
      // Isso garante data/hora correta mesmo em modo offline ou salvamento tardio.
      const testDate = multiResult.completedAt || new Date().toISOString();
      Logger.log(`[Results] Salvando teste. Data/hora: ${testDate} | Online: ${navigator.onLine}`);

      const testData = {
        protocol_level: multiResult.protocol.level,
        total_time: Math.round(multiResult.totalTime),
        temperature: tempValue,
        date: testDate,
      };

      const resultsData = enrichedResults.map(ar => ({
        athlete_id: ar.athleteId,
        athlete_name: ar.athleteName,
        completed_stages: ar.completedStages,
        completed_reps_in_last_stage: ar.completedRepsInLastStage,
        total_reps: ar.totalReps,
        is_last_stage_complete: ar.isLastStageComplete,
        peak_velocity: ar.pvBruto,
        pv_bruto: ar.pvBruto,
        pv_corrigido: ar.pvCorrigido,
        fc_final: ar.fcFinal,
        fc_estimada: ar.fcEstimada,
        heart_rate: ar.fcFinal,
        final_distance: ar.finalDistance,
        eliminated_by_failure: ar.eliminatedByFailure,
      }));

      if (navigator.onLine) {
        await SupabaseService.createTest(testData, resultsData);
      } else {
        // Offline: salvar para sincronização posterior
        const testId = crypto.randomUUID();
        await SyncService.saveForLaterSync(testId, testData, resultsData);
      }

      setSaved(true);
      toast({
        title: t('testSaved'),
        description: navigator.onLine
          ? t('testSavedDesc')
          : t('offlineSyncDesc')
      });
    } catch (error: any) {
      const errMsg = error?.message || '';
      Logger.warn('[Results] Falha ao salvar online:', errMsg);

      // Real auth error — user not logged in, redirect
      if (errMsg === 'AUTH_ERROR') {
        toast({
          variant: 'destructive',
          title: t('sessionExpired'),
          description: t('reLoginToSave'),
        });
        navigate('/auth');
        setSaving(false);
        return;
      }

      // Network error or any other failure — save offline
      try {
        Logger.log('[Results] Salvando offline após falha de rede...');
        const testId = crypto.randomUUID();
        await SyncService.saveForLaterSync(
          testId,
          {
            protocol_level: multiResult.protocol.level,
            total_time: Math.round(multiResult.totalTime),
            date: multiResult.completedAt || new Date().toISOString(),
          } as any,
          enrichedResults.map(ar => ({
            athlete_id: ar.athleteId,
            athlete_name: ar.athleteName,
            completed_stages: ar.completedStages,
            completed_reps_in_last_stage: ar.completedRepsInLastStage,
            total_reps: ar.totalReps,
            is_last_stage_complete: ar.isLastStageComplete,
            peak_velocity: ar.pvBruto,
            pv_bruto: ar.pvBruto,
            pv_corrigido: ar.pvCorrigido,
            fc_final: ar.fcFinal,
            fc_estimada: ar.fcEstimada,
            heart_rate: ar.fcFinal,
            final_distance: ar.finalDistance,
            eliminated_by_failure: ar.eliminatedByFailure,
          }))
        );
        setSaved(true);
        toast({
          title: `📦 ${t('savedOffline')}`,
          description: t('offlineSavedWaitSync'),
        });
      } catch {
        toast({
          variant: 'destructive',
          title: t('criticalSaveError'),
          description: t('criticalSaveErrorDesc'),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    const csv = ExportService.exportTestResultsToCSV(
      multiResult.protocol.level,
      multiResult.totalTime,
      new Date().toISOString(),
      enrichedResults,
      t,
      lang
    );
    ExportService.downloadCSV(csv, `tcar_teste_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportPDF = async () => {
    try {
      await ExportService.exportTestResultsToPDF(
        multiResult.protocol.level,
        multiResult.totalTime,
        new Date().toISOString(),
        enrichedResults,
        t,
        lang,
        {
          team: trainerProfile?.club || undefined,
          temperature: temperature ? parseFloat(temperature) : null
        }
      );
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('pdfExportError'),
        description: t('pdfLibraryMissing')
      });
    }
  };

  // Sort by PV corrigido (ranking)
  const sortedResults = [...enrichedResults].sort((a, b) => b.pvCorrigido - a.pvCorrigido);

  return (
    <PageContainer title={t('testResults')}>
      <div className="max-w-lg mx-auto space-y-6 pb-24">
        {/* Success header */}
        <div className="text-center py-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-1">{t('testCompleted')}</h2>
          <p className="text-muted-foreground">
            {multiResult.athleteResults.length} {multiResult.athleteResults.length !== 1 ? t('athletes') : t('athlete')}
          </p>
        </div>

        {/* Test summary */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">{t('summaryLabel')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('level')}</p>
              <p className="text-xl font-mono font-black">{multiResult.protocol.level}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-xl">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">{t('totalTime')}</p>
              <p className="text-xl font-mono font-black">{CalculatorService.formatTime(multiResult.totalTime)}</p>
            </div>
          </div>
        </div>

        {/* Post-test data entry */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {t('environmentalData')}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0 text-left">{t('temperature')}:</span>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="25"
                className="w-20 h-9 text-center"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                disabled={saved}
              />
              <span className="text-sm text-muted-foreground">°C</span>
            </div>
          </div>
        </div>

        {/* Individual results — ranked */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">{t('rankingResults')}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{t('rankingByPVCorrigido')}</p>

          {sortedResults.map((ar, index) => {
            const classification = ClassificationService.getClassification(
              multiResult.protocol.level,
              ar.pvCorrigido,
              selectedAthletes.find(a => a.id === ar.athleteId)
            );
            const isExpanded = expandedAthlete === ar.athleteId;

            return (
              <div
                key={ar.athleteId}
                className={cn(
                  "glass-card rounded-xl overflow-hidden animate-slide-up",
                  ar.eliminatedByFailure && "border-destructive/30"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Main row */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedAthlete(isExpanded ? null : ar.athleteId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: classification.color }}>
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-medium">{ar.athleteName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${classification.color}20`,
                              color: classification.color
                            }}>
                            {t(classification.label as any)}
                          </span>
                          {ar.eliminatedByFailure && (
                            <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                              {t('twoFailures')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xl font-mono font-black text-primary">{ar.pvCorrigido.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">{t('correctedPVUnit')}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> :
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">{t('rawPV')}</p>
                        <p className="font-mono font-bold">{ar.pvBruto.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">{t('totalReps')}</p>
                        <p className="font-mono font-bold">{ar.totalReps}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">{t('distance')}</p>
                        <p className="font-mono font-bold">{ar.finalDistance}m</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">{t('stages')}</p>
                        <p className="font-mono font-bold">{ar.completedStages}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold" style={{ color: classification.color }}>
                          P{classification.percentile}
                        </p>
                      </div>
                    </div>

                    {/* Heart rate input */}
                    <div className="flex items-center gap-2 bg-background/50 p-2 rounded-lg">
                      <Heart className="w-4 h-4 text-destructive shrink-0" />
                      <span className="text-sm text-muted-foreground shrink-0">{t('finalHR')}:</span>
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          type="number"
                          placeholder="bpm"
                          className="w-20 h-8 text-center"
                          value={heartRates[ar.athleteId] || ''}
                          onChange={(e) => handleHeartRateChange(ar.athleteId, e.target.value)}
                          disabled={saved}
                        />
                        <div className="flex flex-col">
                          {heartRates[ar.athleteId] ? (
                            <span className="text-[10px] text-primary font-bold leading-none">{t('measuredHR')}</span>
                          ) : ar.fcEstimada != null ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-amber-600 font-bold leading-none">{t('estimatedHR')}</span>
                              <span className="text-[10px] text-muted-foreground">{t('estimatedHRFormula', ar.fcEstimada)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">{t('hrNotProvided')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Save to history button */}
        {user && !saved && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSaveToHistory}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {t('saveToHistory')}
              </>
            )}
          </Button>
        )}

        {saved && (
          <div className="text-center text-success flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            {t('testSavedSuccessfully')}
          </div>
        )}

        {/* Export buttons */}
        {saved && (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/select-athletes')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('newTest')}
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            {t('home')}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
