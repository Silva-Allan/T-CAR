import { useState, useCallback, useRef, useEffect } from 'react';
import { TestProtocol, AthleteTestState, AthleteResult, Athlete } from '@/models/types';
import { AudioService } from '@/services/AudioService';
import { CalculatorService } from '@/services/CalculatorService';
import { Logger } from '@/utils/Logger';
import { AUDIO_INTRO_OFFSET } from '@/constants/audio';

interface MultiAthleteTestState {
  isRunning: boolean;
  isPaused: boolean;
  isStarted: boolean;
  currentStage: number;
  currentRep: number;
  currentPhase: 'idle' | 'going' | 'returning' | 'recovery';
  elapsedTime: number;
  repElapsedTime: number;
  currentSpeed: number;
  currentDistance: number;
  athleteStates: AthleteTestState[];
  allEliminated: boolean;
}

const INITIAL_STATE: MultiAthleteTestState = {
  isRunning: false,
  isPaused: false,
  isStarted: false,
  currentStage: 1,
  currentRep: 0,
  currentPhase: 'idle',
  elapsedTime: 0,
  repElapsedTime: 0,
  currentSpeed: 0,
  currentDistance: 0,
  athleteStates: [],
  allEliminated: false,
};

export { AUDIO_INTRO_OFFSET };

export function useMultiAthleteTestEngine(protocol: TestProtocol, athletes: Athlete[]) {
  const [state, setState] = useState<MultiAthleteTestState>(() => ({
    ...INITIAL_STATE,
    currentSpeed: protocol.initialSpeed,
    currentDistance: protocol.initialDistance,
    athleteStates: athletes.map(a => ({
      athleteId: a.id,
      athleteName: a.name,
      consecutiveFailures: 0,
      isEliminated: false,
      eliminatedAtStage: 0,
      eliminatedAtRep: 0,
    })),
  }));

  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const accumulatedPauseRef = useRef<number>(0);
  const audioStartedRef = useRef<boolean>(false);
  const beepSyncedRef = useRef<boolean>(false);
  // Cooldown por atleta para evitar duplo-clique acidental no botão de falha
  const failureCooldownRef = useRef<Record<string, number>>({});
  // Espelha o último `elapsed` calculado — usado pelo AudioService para
  // religar o áudio no ponto certo depois de uma interrupção externa.
  const elapsedRef = useRef<number>(0);
  // Watchdog: detecta currentTime do áudio "congelado" mesmo sem disparo
  // de evento nativo (defesa extra, além dos listeners do AudioService).
  const lastAudioTimeRef = useRef<number>(-1);
  const audioStuckSinceRef = useRef<number | null>(null);

  // Update protocol values when protocol changes
  useEffect(() => {
    if (!state.isStarted) {
      setState(prev => ({
        ...prev,
        currentSpeed: protocol.initialSpeed,
        currentDistance: protocol.initialDistance,
        athleteStates: athletes.map(a => ({
          athleteId: a.id,
          athleteName: a.name,
          consecutiveFailures: 0,
          isEliminated: false,
          eliminatedAtStage: 0,
          eliminatedAtRep: 0,
        })),
      }));
    }
  }, [protocol, athletes, state.isStarted]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTest = useCallback(async () => {
    if (intervalRef.current !== null) return; // evita startTest duplo
    await AudioService.resume();

    setState(prev => ({
      ...prev,
      isRunning: true,
      isStarted: true,
      currentRep: 1,
      currentPhase: 'going',
      elapsedTime: 0,
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
    }));

    startTimeRef.current = Date.now();
    accumulatedPauseRef.current = 0;
    audioStartedRef.current = false;
    beepSyncedRef.current = false;
    elapsedRef.current = 0;
    lastAudioTimeRef.current = -1;
    audioStuckSinceRef.current = null;

    // Start the protocol audio (MP3 with all timed beeps)
    AudioService.startProtocolAudio();
    // Dá ao AudioService acesso ao `elapsed` mais recente, para que uma
    // eventual recuperação (áudio travado por queda de rede/BT) religue
    // o áudio exatamente no ponto certo, nunca do valor congelado antigo.
    AudioService.setElapsedProvider(() => elapsedRef.current);

    intervalRef.current = window.setInterval(() => {
      setState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev;

        // =================================================================
        // SYNC: Use audio currentTime as the source of truth.
        // If audio is available, elapsed = audioTime - intro offset.
        // Fallback to Date.now() if audio is not available.
        // =================================================================
        let elapsed: number;
        const audioTime = AudioService.getProtocolAudioTime();

        // WATCHDOG: reforço além dos listeners nativos do AudioService —
        // se o áudio "deveria" estar tocando mas o currentTime não avança
        // por mais de 400ms, trata como travado (sem depender de nenhum
        // evento do <audio> ter disparado) e cai pro relógio de parede.
        if (audioTime >= 0) {
          if (audioTime === lastAudioTimeRef.current) {
            if (audioStuckSinceRef.current === null) {
              audioStuckSinceRef.current = Date.now();
            } else if (Date.now() - audioStuckSinceRef.current > 400) {
              AudioService.markExternallyStalled();
            }
          } else {
            lastAudioTimeRef.current = audioTime;
            audioStuckSinceRef.current = null;
          }
        } else {
          lastAudioTimeRef.current = -1;
          audioStuckSinceRef.current = null;
        }

        // JS Clock also needs to account for the intro offset to be a valid comparison
        const wallClockElapsedRaw = (Date.now() - startTimeRef.current - accumulatedPauseRef.current) / 1000;
        const wallClockElapsed = wallClockElapsedRaw - AUDIO_INTRO_OFFSET; // Allows negative values

        if (audioTime >= 0) {
          // SYNC: If this is the first time we detect the audio playing, 
          // reset the JS clock to be exactly in sync with the audio start.
          // This eliminates the startup lag from drift logs.
          if (!audioStartedRef.current && audioTime > 0) {
            startTimeRef.current = Date.now();
            accumulatedPauseRef.current = 0;
            audioStartedRef.current = true;
            Logger.log(`[AudioSync] Audio playback detected at ${audioTime.toFixed(2)}s. Syncing JS clock.`);
          }

          // STAGE 2: Sincronia Rígida no BIPE (7.4s)
          // Forçamos o relógio JS a bater exatamente 0s de teste quando o áudio chega no offset.
          if (!beepSyncedRef.current && audioTime >= AUDIO_INTRO_OFFSET) {
            // Resetamos o startTime para "Agora - Offset" para que wallClockElapsed seja exatamente 0.
            startTimeRef.current = Date.now() - (AUDIO_INTRO_OFFSET * 1000);
            accumulatedPauseRef.current = 0;
            beepSyncedRef.current = true;
            Logger.log(`[AudioSync] HARD SYNC: Áudio atingiu ${AUDIO_INTRO_OFFSET}s (BIPE). Cronômetro zerado e sincronizado.`);
          }

          // Audio is playing — use its time as master clock
          elapsed = audioTime - AUDIO_INTRO_OFFSET;

          // DIAGNOSTIC LOGGING: Check for drift between Audio master and Wall clock
          // Só logamos drift após o bipe estar sincronizado
          if (beepSyncedRef.current) {
            const drift = Math.abs(elapsed - wallClockElapsed);
            if (drift > 0.1) { // 100ms drift threshold
              Logger.log(`[AudioSync] Drift detected: ${(drift * 1000).toFixed(0)}ms. Master=${elapsed.toFixed(2)}s, JS=${wallClockElapsed.toFixed(2)}s`);
            }
          }
        } else {
          // Fallback: Date.now() based timer
          elapsed = wallClockElapsed;
        }

        const newElapsedTime = elapsed;
        elapsedRef.current = newElapsedTime;

        // If elapsed is negative, we are in the intro phase
        let phase: 'idle' | 'going' | 'returning' | 'recovery';
        let repInStage = 1;
        let currentStage = 1;
        let repElapsedTime = 0;

        if (newElapsedTime < 0) {
          phase = 'idle'; // Introductory phase
          repElapsedTime = 0;
        } else {
          const stageElapsedTime = newElapsedTime % protocol.stageDuration;
          repElapsedTime = stageElapsedTime % protocol.repDuration;

          repInStage = Math.floor(stageElapsedTime / protocol.repDuration) + 1;

          // Official T-CAR 2.0: 6s going + 6s returning + 6s recovery (18s total per rep)
          if (repElapsedTime < 6) {
            phase = 'going';
          } else if (repElapsedTime < 12) {
            phase = 'returning';
          } else {
            phase = 'recovery';
          }

          currentStage = Math.floor(newElapsedTime / protocol.stageDuration) + 1;
        }

        return {
          ...prev,
          elapsedTime: newElapsedTime,
          repElapsedTime,
          currentRep: Math.min(repInStage, protocol.repsPerStage),
          currentPhase: phase,
          currentStage,
          currentSpeed: CalculatorService.getSpeedAtStage(protocol, currentStage),
          currentDistance: CalculatorService.getDistanceAtStage(protocol, currentStage),
        };
      });
    }, 50); // Increased frequency for smoother sync (from 100 to 50ms)
  }, [protocol]);

  const pauseTest = useCallback(() => {
    pauseTimeRef.current = Date.now();
    AudioService.pauseProtocolAudio();
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeTest = useCallback(() => {
    if (pauseTimeRef.current > 0) {
      accumulatedPauseRef.current += Date.now() - pauseTimeRef.current;
      pauseTimeRef.current = 0;
    }
    AudioService.resumeProtocolAudio();
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const recordFailure = useCallback((athleteId: string) => {
    const now = Date.now();
    const lastClick = failureCooldownRef.current[athleteId] ?? 0;
    if (now - lastClick < 800) return; // ignora cliques com menos de 800ms de intervalo
    failureCooldownRef.current[athleteId] = now;

    AudioService.playFailBeep();

    setState(prev => {
      const newAthleteStates = prev.athleteStates.map(as => {
        if (as.athleteId !== athleteId || as.isEliminated) return as;

        const newFailures = as.consecutiveFailures + 1;

        if (newFailures >= 2) {
          return {
            ...as,
            consecutiveFailures: newFailures,
            isEliminated: true,
            eliminatedAtStage: prev.currentStage,
            eliminatedAtRep: prev.currentRep,
          };
        }

        return { ...as, consecutiveFailures: newFailures };
      });

      const allEliminated = newAthleteStates.every(as => as.isEliminated);

      if (allEliminated) {
        clearTimer();
        AudioService.stopProtocolAudio();
        return { ...prev, athleteStates: newAthleteStates, allEliminated: true, isRunning: false };
      }

      return { ...prev, athleteStates: newAthleteStates };
    });
  }, [clearTimer]);

  const resetFailures = useCallback((athleteId: string) => {
    setState(prev => ({
      ...prev,
      athleteStates: prev.athleteStates.map(as =>
        as.athleteId === athleteId ? { ...as, consecutiveFailures: 0 } : as
      ),
    }));
  }, []);

  const endTest = useCallback((): { athleteResults: AthleteResult[]; totalTime: number } | null => {
    clearTimer();
    AudioService.stopProtocolAudio();
    AudioService.playEndBeep();

    const currentState = state;

    if (!currentState.isStarted) {
      return null;
    }

    const athleteResults: AthleteResult[] = currentState.athleteStates.map(as => {
      const stage = as.isEliminated ? as.eliminatedAtStage : currentState.currentStage;
      const rep = as.isEliminated ? as.eliminatedAtRep : currentState.currentRep;

      const completedStages = Math.max(0, stage - 1);
      const completedRepsInLastStage = rep;

      const isLastStageComplete = !as.isEliminated &&
        currentState.currentRep === protocol.repsPerStage &&
        currentState.currentPhase === 'recovery' &&
        currentState.repElapsedTime >= 17;

      const finalCompletedStages = isLastStageComplete ? stage : completedStages;

      // T-CAR 2.0: Calcular totalReps, pvBruto, e pvCorrigido
      const totalReps = CalculatorService.calculateTotalReps(
        finalCompletedStages,
        completedRepsInLastStage,
        isLastStageComplete
      );

      const pvBruto = CalculatorService.calculateRawPV(
        protocol,
        finalCompletedStages,
        completedRepsInLastStage,
        isLastStageComplete
      );

      const pvCorrigido = CalculatorService.calculateCorrectedPV(
        protocol.level,
        totalReps
      );

      const finalDistance = CalculatorService.calculateTotalDistance(
        protocol,
        finalCompletedStages,
        completedRepsInLastStage,
        isLastStageComplete
      );

      return {
        athleteId: as.athleteId,
        athleteName: as.athleteName,
        completedStages: finalCompletedStages,
        completedRepsInLastStage,
        totalReps,
        isLastStageComplete,
        pvBruto,
        pvCorrigido,
        fcFinal: null, // Preenchido na tela de resultados
        fcEstimada: null,
        finalDistance,
        eliminatedByFailure: as.isEliminated,
      };
    });

    setState({
      ...INITIAL_STATE,
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
      athleteStates: athletes.map(a => ({
        athleteId: a.id,
        athleteName: a.name,
        consecutiveFailures: 0,
        isEliminated: false,
        eliminatedAtStage: 0,
        eliminatedAtRep: 0,
      })),
    });

    return {
      athleteResults,
      totalTime: currentState.elapsedTime,
    };
  }, [state, protocol, athletes, clearTimer]);

  const resetTest = useCallback(() => {
    clearTimer();
    AudioService.stopProtocolAudio();
    setState({
      ...INITIAL_STATE,
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
      athleteStates: athletes.map(a => ({
        athleteId: a.id,
        athleteName: a.name,
        consecutiveFailures: 0,
        isEliminated: false,
        eliminatedAtStage: 0,
        eliminatedAtRep: 0,
      })),
    });
  }, [protocol, athletes, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      AudioService.stopProtocolAudio();
    };
  }, [clearTimer]);

  return {
    state,
    startTest,
    pauseTest,
    resumeTest,
    recordFailure,
    resetFailures,
    endTest,
    resetTest,
  };
}
