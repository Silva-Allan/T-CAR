import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Gauge, Trophy, Ruler, Heart, Calendar, Loader2, FileText } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { ExportService } from '@/services/ExportService';
import { ClassificationService } from '@/services/ClassificationService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface TestWithResults {
  id: string;
  protocol_level: number;
  total_time: number;
  date: string;
  notes: string | null;
  test_results: {
    id: string;
    athlete_id: string;
    athlete_name: string;
    completed_stages: number;
    completed_reps_in_last_stage: number;
    is_last_stage_complete: boolean;
    peak_velocity: number;
    final_distance: number;
    heart_rate: number | null;
    eliminated_by_failure: boolean;
  }[];
}

export default function TestDetails() {
  const { t, lang } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<TestWithResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainerProfile, setTrainerProfile] = useState<any>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const loadTest = async () => {
      if (!id) return;
      try {
        const [testData, profileData] = await Promise.all([
          SupabaseService.getTestWithResults(id),
          SupabaseService.getProfile()
        ]);
        if (testData) {
          setTest({
            ...testData.test,
            test_results: testData.results
          } as any);
        }
        setTrainerProfile(profileData);
      } catch (error) {
        console.error('Error loading test:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [id, user, navigate]);

  const formatDate = (dateString: string) => {
    const locale = (lang as string) === 'en' ? 'en-US' : (lang as string) === 'es' ? 'es-ES' : 'pt-BR';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleExportPDF = async () => {
    if (!test) return;
    setExporting(true);
    try {
      await ExportService.exportTestResultsToPDF(
        test.protocol_level,
        test.total_time,
        test.date,
        test.test_results.map(r => ({
          athleteId: r.athlete_id,
          athleteName: r.athlete_name,
          completedStages: r.completed_stages,
          completedRepsInLastStage: r.completed_reps_in_last_stage,
          totalReps: (r as any).total_reps || (r.completed_stages * 10) + r.completed_reps_in_last_stage,
          isLastStageComplete: r.is_last_stage_complete,
          pvBruto: r.peak_velocity,
          pvCorrigido: (r as any).pv_corrigido || r.peak_velocity,
          fcFinal: r.heart_rate,
          fcEstimada: null,
          finalDistance: r.final_distance,
          eliminatedByFailure: r.eliminated_by_failure
        })),
        t,
        (lang as string),
        {
          team: trainerProfile?.club || undefined,
          temperature: (test as any).temperature
        }
      );
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
    } finally {
      setExporting(false);
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

  if (!test) {
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
          <h2 className="text-lg font-semibold">{t('protocolLabel')} {t('level')} {test.protocol_level}</h2>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <Calendar className="w-4 h-4" />
            {formatDate(test.date)}
          </p>
          <div className="mt-4 flex justify-center">
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
            value={test.protocol_level.toString()}
            icon={<Gauge className="w-4 h-4 text-primary" />}
          />
          <StatCard
            label={t('totalTime')}
            value={CalculatorService.formatTime(test.total_time)}
            icon={<Clock className="w-4 h-4 text-primary" />}
          />
        </div>

        {/* Notes */}
        {test.notes && (
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">{test.notes}</p>
          </div>
        )}

        {/* Athletes Results */}
        <div className="space-y-3">
          <h3 className="font-semibold">{t('resultsByAthlete')}</h3>

          {[...test.test_results]
            .sort((a, b) => ((b as any).peak_velocity) - ((a as any).peak_velocity))
            .map((result, index) => (
              <div
                key={result.id}
                className={cn(
                  "glass-card p-4 rounded-xl animate-fade-in",
                  result.eliminated_by_failure && "border-destructive/30"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-medium">{result.athlete_name}</p>
                      {result.eliminated_by_failure && (
                        <span className="text-xs text-destructive">{t('eliminatedByFailure')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PV-TCAR */}
                <div className="text-center bg-primary/10 rounded-lg p-3 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">PV-TCAR</p>
                  <p className="text-3xl font-mono font-black text-primary">
                    {Number(result.peak_velocity).toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">km/h</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('stagesLabel')}</p>
                      <p className="font-mono">{result.completed_stages}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('distanceLabel')}</p>
                      <p className="font-mono">{result.final_distance}m</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start justify-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${ClassificationService.getClassification(test.protocol_level as 1 | 2, (result as any).pv_corrigido || result.peak_velocity).color}20`,
                          color: ClassificationService.getClassification(test.protocol_level as 1 | 2, (result as any).pv_corrigido || result.peak_velocity).color
                        }}>
                        {t(ClassificationService.getClassification(test.protocol_level as 1 | 2, (result as any).pv_corrigido || result.peak_velocity).label as any)}
                      </span>
                      {result.heart_rate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" />
                          {result.heart_rate} bpm
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-mono font-bold text-primary">
                      {((result as any).pv_corrigido || result.peak_velocity).toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t('pvCorrected')} km/h</p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </PageContainer>
  );
}
