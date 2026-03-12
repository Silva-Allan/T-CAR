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

  const totalAccumulatedReps = Math.max(0, (state.currentStage - 1) * selectedProtocol.repsPerStage + state.currentRep);

  const phaseProgress = state.currentPhase === 'going'
    ? (state.repElapsedTime / 6) * 100
    : state.currentPhase === 'returning'
      ? ((state.repElapsedTime - 6) / 6) * 100
      : state.currentPhase === 'recovery'
        ? ((state.repElapsedTime - 12) / 6) * 100
        : state.currentPhase === 'idle' && state.isStarted && state.elapsedTime < 0
          ? ((7.4 + state.elapsedTime) / 7.4) * 100
          : 0;

  // DIAGNOSTIC: Sync Flash logic
  const [flash, setFlash] = useState(false);
  const lastPhaseRef = useRef(state.currentPhase);
  const lastRepRef = useRef(state.currentRep);

  useEffect(() => {
    if (state.currentPhase !== lastPhaseRef.current || state.currentRep !== lastRepRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 100);
      lastPhaseRef.current = state.currentPhase;
      lastRepRef.current = state.currentRep;
      return () => clearTimeout(timer);
    }
  }, [state.currentPhase, state.currentRep]);

  const PhaseSegment = ({ phase, isActive, isDone, progress, color }: {
    phase: string;
    isActive: boolean;
    isDone: boolean;
    progress: number;
    color: string;
  }) => (
    <div className="flex-1 space-y-2">
      <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", color)}
          style={{ width: `${isDone ? 100 : (isActive ? progress : 0)}%` }}
        />
        {isActive && (
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        )}
      </div>
      <span className={cn(
        "block text-[9px] font-black uppercase tracking-widest text-center transition-opacity",
        isActive ? "text-white opacity-100" : "text-white/30"
      )}>
        {phase}
      </span>
    </div>
  );

  return (
    <PageContainer title="Execução do Teste" hideHeader={state.isStarted}>
      {/* DIAGNOSTIC: Sync Flash Indicator */}
      {state.isStarted && (
        <div
          className={cn(
            "fixed top-4 right-4 w-6 h-6 rounded-full border-2 transition-colors duration-75 z-[60]",
            flash ? "bg-green-500 border-green-400 scale-125" : "bg-transparent border-white/20"
          )}
          title="Sync Visual Indicator"
        />
      )}
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
          {/* Main Info Display (Replaces Timer) */}
          {state.isStarted && state.elapsedTime < 0 ? (
            <div className="py-8 space-y-4">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-white/40">Iniciando em...</span>
              <p className="font-mono font-black text-7xl text-primary animate-pulse">
                {Math.abs(state.elapsedTime).toFixed(1)}s
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-4 mb-3 w-full max-w-sm mx-auto">
              {/* Distância */}
              <div className={cn(
                "flex flex-col items-center justify-center py-6 px-2 rounded-3xl sm:rounded-[2rem] transition-colors relative",
                state.isStarted ? "bg-white/5" : "bg-muted/50"
              )}>
                <span className={cn(
                  "text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-1",
                  state.isStarted ? "text-white/40" : "text-muted-foreground"
                )}>Distância</span>
                <div className="flex items-baseline gap-1">
                  <span className={cn(
                    "font-mono font-black tracking-tighter leading-none",
                    state.isStarted ? "text-6xl sm:text-7xl" : "text-5xl sm:text-6xl"
                  )}>{state.currentDistance}</span>
                  <span className={cn(
                    "font-bold text-xl sm:text-2xl",
                    state.isStarted ? "text-white/40" : "text-muted-foreground/50"
                  )}>m</span>
                </div>
              </div>

              {/* Repetição */}
              <div className={cn(
                "flex flex-col items-center justify-center py-6 px-2 rounded-3xl sm:rounded-[2rem] transition-colors",
                state.isStarted ? "bg-primary/20" : "bg-primary/10"
              )}>
                <span className={cn(
                  "text-[10px] sm:text-xs uppercase tracking-[0.2em] font-bold mb-1",
                  state.isStarted ? "text-primary/70" : "text-primary/70"
                )}>Repetição</span>
                <div className="flex flex-col items-center text-primary leading-none">
                  <span className={cn(
                    "font-mono font-black tracking-tighter",
                    state.isStarted ? "text-6xl sm:text-7xl" : "text-5xl sm:text-6xl"
                  )}>{totalAccumulatedReps}</span>
                  <p className="font-bold text-xs sm:text-sm mt-1 opacity-60">
                    rep. {state.currentRep}/{selectedProtocol.repsPerStage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Phase Segments Timeline */}
          {state.isStarted && (
            <div className="mt-6 mb-4 flex gap-2 w-full max-w-sm mx-auto">
              {state.elapsedTime < 0 ? (
                <div className="w-full space-y-2">
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${phaseProgress}%` }}
                    />
                  </div>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-primary animate-pulse">
                    Preparar
                  </span>
                </div>
              ) : (
                <>
                  <PhaseSegment
                    phase="Ida"
                    isActive={state.currentPhase === 'going'}
                    isDone={['returning', 'recovery'].includes(state.currentPhase)}
                    progress={phaseProgress}
                    color="bg-primary"
                  />
                  <PhaseSegment
                    phase="Volta"
                    isActive={state.currentPhase === 'returning'}
                    isDone={['recovery'].includes(state.currentPhase)}
                    progress={phaseProgress}
                    color="bg-blue-500"
                  />
                  <PhaseSegment
                    phase="Recup."
                    isActive={state.currentPhase === 'recovery'}
                    isDone={false}
                    progress={phaseProgress}
                    color="bg-amber-500"
                  />
                </>
              )}
            </div>
          )}

          {/* Stage & PV Info */}
          <div className="flex justify-between items-end mt-4 px-2 border-t border-white/5 pt-4">
            <div className="text-left">
              <p className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-bold",
                state.isStarted ? "text-white/30" : "text-muted-foreground"
              )}>Estágio</p>
              <p className="text-xl font-mono font-black text-white">{state.currentStage}</p>
            </div>

            <div className="text-right">
              <p className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-bold",
                state.isStarted ? "text-white/30" : "text-muted-foreground"
              )}>Velocidade</p>
              <p className="text-xl font-mono font-black text-primary">
                {state.currentSpeed.toFixed(1)} <span className="text-xs font-bold opacity-50">km/h</span>
              </p>
            </div>
          </div>
        </div>

        {/* Speed & PV */}
        <div className="mt-4 space-y-1">
          <div className={cn(
            "flex justify-center gap-4 text-xs font-medium",
            state.isStarted ? "text-black/50" : "text-muted-foreground"
          )}>
            <span>Velocidade atual: {state.currentSpeed.toFixed(1)} km/h</span>
          </div>

          {state.isRunning && (
            <div className="pt-2 text-center">
              <p className={cn(
                "text-[10px] uppercase tracking-[0.15em] font-bold",
                state.isStarted ? "text-black/80" : "text-muted-foreground"
              )}>PV-TCAR Corrigido</p>
              <p className="text-3xl font-mono font-black text-primary mt-0.5">
                {PVTableService.getCorrectedPV(
                  selectedProtocol.level,
                  PVTableService.calculateTotalReps(state.currentStage - 1, state.currentRep, false)
                ).toFixed(1)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CONTROLS — large field-friendly buttons                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex gap-3 mt-6">
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
      {/* ATHLETE LIST — large touch targets                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {state.isStarted && (
        <div className="space-y-4 pt-6">
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
                  <span className="shrink-0 text-[10px] font-bold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-md uppercase tracking-widest">
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
        <div className="space-y-2 opacity-60 mt-6">
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
        <div className="glass-card p-6 rounded-2xl text-center border-destructive/30 space-y-3 mt-6">
          <p className="font-bold text-destructive text-lg">Todos eliminados!</p>
          <button onClick={handleEnd} className="field-button-primary w-full flex items-center justify-center gap-2 h-12">
            Ver Resultados
          </button>
        </div>
      )}
    </PageContainer>
  );
}
