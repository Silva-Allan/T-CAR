import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, Square, AlertTriangle, ChevronLeft, RotateCcw, Shield, ShieldOff,
  Wifi, WifiOff, Volume2, XCircle
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useApp } from '@/store/AppContext';
import { useMultiAthleteTestEngine } from '@/hooks/useMultiAthleteTestEngine';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { CalculatorService } from '@/services/CalculatorService';
import { ScreenLockService } from '@/services/ScreenLockService';
import { PVTableService } from '@/services/PVTableService';
import { AudioService } from '@/services/AudioService';
import { cn } from '@/lib/utils';

export default function TestExecution() {
  const navigate = useNavigate();
  const { selectedAthletes, selectedProtocol, isAudioReady, initializeAudio } = useApp();
  const isOnline = useOnlineStatus();
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [interruptionDetected, setInterruptionDetected] = useState(false);
  const visibilityCleanupRef = useRef<(() => void) | null>(null);

  const {
    state,
    startTest,
    pauseTest,
    resumeTest,
    recordFailure,
    resetFailures,
    endTest,
    resetTest,
  } = useMultiAthleteTestEngine(selectedProtocol, selectedAthletes);

  // Redirect if no athletes selected
  useEffect(() => {
    if (selectedAthletes.length === 0) {
      navigate('/select-athletes');
    }
  }, [selectedAthletes, navigate]);

  // Screen lock + visibility change detection
  useEffect(() => {
    if (state.isRunning) {
      ScreenLockService.activateForTest();

      visibilityCleanupRef.current = ScreenLockService.onVisibilityChange((isVisible) => {
        if (!isVisible && state.isRunning && !state.isPaused) {
          pauseTest();
          setInterruptionDetected(true);
        }
      });
    }

    return () => {
      if (visibilityCleanupRef.current) {
        visibilityCleanupRef.current();
        visibilityCleanupRef.current = null;
      }
    };
  }, [state.isRunning]);

  useEffect(() => {
    return () => {
      ScreenLockService.release();
    };
  }, []);

  const handleStart = async () => {
    if (!isAudioReady) {
      setShowAudioModal(true);
      return;
    }
    await AudioService.loadInstructionAudio(selectedProtocol.level);
    await AudioService.playInstruction();
    startTest();
  };

  const handleAudioPermission = async () => {
    const success = await initializeAudio();
    setShowAudioModal(false);
    if (success) {
      await AudioService.loadInstructionAudio(selectedProtocol.level);
      await AudioService.playInstruction();
      startTest();
    }
  };

  const handleEnd = () => {
    const completedAt = new Date().toISOString(); // Capture exact test end time
    const result = endTest();
    ScreenLockService.release();
    if (result) {
      navigate('/results', {
        state: {
          multiResult: {
            ...result,
            protocol: selectedProtocol,
            completedAt, // Timestamp do fim real do teste
          },
        },
      });
    }
  };

  const handleResumeFromInterruption = () => {
    setInterruptionDetected(false);
    resumeTest();
  };

  const activeAthletes = state.athleteStates.filter(a => !a.isEliminated);
  const eliminatedAthletes = state.athleteStates.filter(a => a.isEliminated);

  const phaseConfig = {
    idle: { label: 'Aguardando', color: 'bg-muted text-muted-foreground', bg: '' },
    going: { label: '→ IDA', color: 'bg-primary/15 text-primary', bg: 'border-l-4 border-l-primary' },
    returning: { label: '← VOLTA', color: 'bg-blue-500/15 text-blue-600', bg: 'border-l-4 border-l-blue-500' },
    recovery: { label: '⏸ RECUPERAÇÃO', color: 'bg-amber-500/15 text-amber-600', bg: 'border-l-4 border-l-amber-500' },
  }[state.currentPhase];

  const phaseProgress = state.currentPhase === 'going'
    ? (state.repElapsedTime / 6) * 100
    : state.currentPhase === 'returning'
      ? ((state.repElapsedTime - 6) / 6) * 100
      : state.currentPhase === 'recovery'
        ? ((state.repElapsedTime - 12) / 6) * 100
        : 0;

  return (
    <PageContainer title="Execução do Teste" hideHeader={state.isStarted}>
      {/* Audio Permission Modal */}
      {showAudioModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Permissão de Áudio</h3>
            <p className="text-sm text-muted-foreground">
              O T-CAR precisa reproduzir os BIPs do teste. Toque para ativar.
            </p>
            <Button onClick={handleAudioPermission} className="w-full field-button-primary" size="lg">
              Ativar Áudio e Iniciar
            </Button>
            <Button variant="ghost" onClick={() => setShowAudioModal(false)} className="w-full">
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Interruption Modal */}
      {interruptionDetected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
            <h3 className="text-lg font-bold">Teste Pausado</h3>
            <p className="text-sm text-muted-foreground">
              Pausado automaticamente — tela saiu de foco.
            </p>
            <Button onClick={handleResumeFromInterruption} className="w-full field-button-primary" size="lg">
              Retomar Teste
            </Button>
            <Button variant="destructive" onClick={handleEnd} className="w-full min-h-[3rem]">
              Finalizar Teste
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4 max-w-lg mx-auto">
        {/* Pre-start info strip */}
        {!state.isStarted && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="badge-udesc">Nível {selectedProtocol.level}</span>
              <span>{selectedAthletes.length} atleta{selectedAthletes.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-success" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MAIN DISPLAY — optimized for outdoor readability          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className={cn(
          "rounded-2xl text-center overflow-hidden transition-all",
          state.isStarted
            ? "bg-foreground text-background p-6"
            : "glass-card p-6"
        )}>
          {/* Timer — extra large for field visibility */}
          <p className={cn(
            "font-mono font-black tracking-tight leading-none",
            state.isStarted ? "text-6xl md:text-8xl" : "text-5xl"
          )}>
            {(() => {
              const t = state.elapsedTime;
              const mins = Math.floor(t / 60);
              const secs = Math.floor(t % 60);
              const tenth = Math.floor((t % 1) * 10);
              return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenth}`;
            })()}
          </p>

          {/* Stage / Rep */}
          <div className="flex justify-center gap-8 mt-4">
            <div>
              <p className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-semibold",
                state.isStarted ? "text-white/40" : "text-muted-foreground"
              )}>Estágio</p>
              <p className={cn(
                "text-2xl font-mono font-bold",
                state.isStarted ? "text-primary" : "text-primary"
              )}>{state.currentStage}</p>
            </div>
            <div className={cn(
              "w-px",
              state.isStarted ? "bg-white/10" : "bg-border"
            )} />
            <div>
              <p className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-semibold",
                state.isStarted ? "text-white/40" : "text-muted-foreground"
              )}>Repetição</p>
              <p className={cn(
                "text-2xl font-mono font-bold",
                state.isStarted ? "text-white" : ""
              )}>{state.currentRep}<span className={cn(
                "text-lg",
                state.isStarted ? "text-white/40" : "text-muted-foreground"
              )}>/{selectedProtocol.repsPerStage}</span></p>
            </div>
          </div>

          {/* Phase Badge + Progress */}
          {state.isStarted && (
            <div className="mt-4 space-y-2">
              <span className={cn(
                "inline-block text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider",
                phaseConfig.color,
              )}>
                {phaseConfig.label}
              </span>
              <Progress value={phaseProgress} className="h-1.5 bg-white/10" />
            </div>
          )}

          {/* Speed & Distance + PV */}
          <div className="mt-4 space-y-1">
            <div className={cn(
              "flex justify-center gap-4 text-xs font-medium",
              state.isStarted ? "text-white/50" : "text-muted-foreground"
            )}>
              <span>{state.currentSpeed.toFixed(1)} km/h</span>
              <span>•</span>
              <span>{state.currentDistance}m</span>
            </div>

            {state.isRunning && (
              <div className="pt-2">
                <p className={cn(
                  "text-[10px] uppercase tracking-[0.15em] font-semibold",
                  state.isStarted ? "text-white/30" : "text-muted-foreground"
                )}>PV-TCAR Corrigido</p>
                <p className="text-3xl font-mono font-black text-primary mt-0.5">
                  {PVTableService.getCorrectedPV(
                    selectedProtocol.level,
                    PVTableService.calculateTotalReps(state.currentStage - 1, state.currentRep, false)
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONTROLS — large field-friendly buttons                   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="flex gap-3">
          {!state.isStarted ? (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="min-h-[3.5rem] flex-shrink-0 px-6"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Voltar
              </Button>
              <button
                onClick={handleStart}
                className="flex-1 field-button-primary flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Teste
              </button>
            </>
          ) : (
            <>
              {state.isPaused ? (
                <button
                  onClick={resumeTest}
                  className="flex-1 field-button-primary flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Retomar
                </button>
              ) : (
                <Button
                  onClick={pauseTest}
                  variant="secondary"
                  className="flex-1 min-h-[3.5rem] text-base font-semibold"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pausar
                </Button>
              )}
              <Button
                onClick={handleEnd}
                variant="destructive"
                className="flex-1 min-h-[3.5rem] text-base font-semibold"
              >
                <Square className="w-5 h-5 mr-2" />
                Finalizar
              </Button>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ATHLETE LIST — large touch targets for failure tracking   */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {state.isStarted && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Atletas Ativos ({activeAthletes.length})
            </h3>
            {activeAthletes.map(as => (
              <div
                key={as.athleteId}
                className="glass-card p-3 rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-semibold text-sm truncate">{as.athleteName}</span>
                  {as.consecutiveFailures > 0 && (
                    <span className="shrink-0 text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-md">
                      {as.consecutiveFailures}x FALHA
                    </span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 ml-2">
                  {as.consecutiveFailures > 0 && (
                    <button
                      onClick={() => resetFailures(as.athleteId)}
                      className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 active:scale-95 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => recordFailure(as.athleteId)}
                    className="h-10 px-4 rounded-xl bg-destructive/10 text-destructive font-bold text-xs flex items-center gap-1.5 hover:bg-destructive/20 active:scale-95 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Falha
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Eliminated */}
        {eliminatedAthletes.length > 0 && (
          <div className="space-y-2 opacity-60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Eliminados ({eliminatedAthletes.length})
            </h3>
            {eliminatedAthletes.map(as => (
              <div
                key={as.athleteId}
                className="glass-card p-3 rounded-xl flex items-center justify-between"
              >
                <span className="text-sm line-through">{as.athleteName}</span>
                <span className="text-[10px] text-destructive font-semibold">
                  Est. {as.eliminatedAtStage} / Rep {as.eliminatedAtRep}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* All eliminated notice */}
        {state.allEliminated && (
          <div className="glass-card p-6 rounded-2xl text-center border-destructive/30 space-y-3">
            <p className="font-bold text-destructive text-lg">Todos eliminados!</p>
            <button onClick={handleEnd} className="field-button-primary w-full flex items-center justify-center gap-2">
              Ver Resultados
            </button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
