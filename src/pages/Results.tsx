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
  Trophy, Home, Save, Loader2, FileText, ChevronUp
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
import { AthleteResult } from '@/models/types';
import { cn } from '@/lib/utils';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
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
      <PageContainer title="Resultados">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum resultado disponível</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Voltar ao início
          </Button>
        </div>
      </PageContainer>
    );
  }

  const handleHeartRateChange = (athleteId: string, value: string) => {
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
        title: 'Login necessário',
        description: 'Faça login para salvar testes no histórico.'
      });
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      // ── TIMESTAMP: usa a hora real do fim do teste, não a hora do clique em Salvar
      // Isso garante data/hora correta mesmo em modo offline ou salvamento tardio.
      const testDate = multiResult.completedAt || new Date().toISOString();
      console.log(`[Results] Salvando teste. Data/hora do teste: ${testDate} | Online: ${navigator.onLine}`);

      const testData = {
        protocol_level: multiResult.protocol.level,
        total_time: Math.round(multiResult.totalTime),
        temperature: temperature ? parseFloat(temperature) : null,
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
        toast({
          title: 'Salvo offline',
          description: 'O teste será sincronizado quando houver conexão.'
        });
      }

      setSaved(true);
      toast({
        title: 'Teste salvo!',
        description: navigator.onLine
          ? 'O teste foi salvo no histórico.'
          : 'O teste será sincronizado quando online.'
      });
    } catch (error: any) {
      const errMsg = error?.message || '';
      console.warn('[Results] Falha ao salvar online:', errMsg);

      // Real auth error — user not logged in, redirect
      if (errMsg === 'AUTH_ERROR') {
        toast({
          variant: 'destructive',
          title: 'Sessão expirada',
          description: 'Faça login novamente para salvar.',
        });
        navigate('/auth');
        setSaving(false);
        return;
      }

      // Network error or any other failure — save offline
      try {
        console.log('[Results] Salvando offline após falha de rede...');
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
          title: '📦 Salvo offline',
          description: 'Sem conexão com o servidor. O teste será sincronizado automaticamente ao reconectar.',
        });
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro crítico ao salvar',
          description: 'Não foi possível salvar o teste nem localmente.',
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
      enrichedResults
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
        {
          team: trainerProfile?.club || undefined,
          temperature: temperature ? parseFloat(temperature) : null
        }
      );
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description: 'Verifique se o pacote jsPDF está instalado.'
      });
    }
  };

  // Sort by PV corrigido (ranking)
  const sortedResults = [...enrichedResults].sort((a, b) => b.pvCorrigido - a.pvCorrigido);

  return (
    <PageContainer title="Resultados">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success header */}
        <div className="text-center py-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Teste Concluído!</h2>
          <p className="text-muted-foreground">
            {multiResult.athleteResults.length} atleta{multiResult.athleteResults.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Test summary */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Tempo Total"
            value={CalculatorService.formatTime(multiResult.totalTime)}
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            label="Protocolo"
            value={`Nível ${multiResult.protocol.level}`}
            icon={<Gauge className="w-4 h-4" />}
          />
        </div>

        {/* Post-test data entry */}
        <div className="glass-card p-4 rounded-xl space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Dados Ambientais
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground shrink-0 text-left">Temperatura:</span>
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
          <h3 className="font-semibold">Ranking</h3>

          {sortedResults.map((ar, index) => {
            const classification = ClassificationService.getClassification(
              multiResult.protocol.level,
              ar.pvCorrigido
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
                            {classification.label}
                          </span>
                          {ar.eliminatedByFailure && (
                            <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                              2 falhas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-xl font-mono font-black text-primary">{ar.pvCorrigido.toFixed(1)}</p>
                        <p className="text-[10px] text-muted-foreground">PV corrigido km/h</p>
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
                        <p className="text-muted-foreground text-xs">PV Bruto</p>
                        <p className="font-mono font-bold">{ar.pvBruto.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Total Reps</p>
                        <p className="font-mono font-bold">{ar.totalReps}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Distância</p>
                        <p className="font-mono font-bold">{ar.finalDistance}m</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center">
                        <p className="text-muted-foreground text-xs">Estágios</p>
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
                      <span className="text-sm text-muted-foreground shrink-0">FC final:</span>
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
                            <span className="text-[10px] text-primary font-bold leading-none">FC Medida</span>
                          ) : ar.fcEstimada != null ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-amber-600 font-bold leading-none">FC Estimada</span>
                              <span className="text-[10px] text-muted-foreground">~{ar.fcEstimada} bpm (220-idade)</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">FC não informada</span>
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
                Salvar no Histórico
              </>
            )}
          </Button>
        )}

        {saved && (
          <div className="text-center text-success flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            Teste salvo com sucesso!
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
            Novo Teste
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Início
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
