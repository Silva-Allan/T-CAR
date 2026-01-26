import { useState, useCallback, useRef, useEffect } from 'react';
import { TestState, TestProtocol, AthleteTestState, AthleteResult, Athlete } from '@/models/types';
import { AudioService } from '@/services/AudioService';
import { CalculatorService } from '@/services/CalculatorService';

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
  const lastBeepTimeRef = useRef<number>(-1);
  const startTimeRef = useRef<number>(0);

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

    lastBeepTimeRef.current = -1;
    startTimeRef.current = Date.now();

    // Initial beep
    AudioService.playStageBeep();

    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      setState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev;

        const newElapsedTime = elapsed;
        const stageElapsedTime = newElapsedTime % protocol.stageDuration;
        const repElapsedTime = stageElapsedTime % protocol.repDuration;

        // Calculate current rep (1-5) and phase (6s going, 6s returning, 6s recovery)
        const repInStage = Math.floor(stageElapsedTime / protocol.repDuration) + 1;
        let phase: 'going' | 'returning' | 'recovery';
        if (repElapsedTime < 6) {
          phase = 'going';
        } else if (repElapsedTime < 12) {
          phase = 'returning';
        } else {
          phase = 'recovery';
        }

        // Check for beep timing (every 6 seconds)
        const totalSixSecondPeriods = Math.floor(newElapsedTime / 6);
        if (totalSixSecondPeriods > lastBeepTimeRef.current) {
          lastBeepTimeRef.current = totalSixSecondPeriods;

          // Check if this is start of a new stage
          const currentStageFromTime = Math.floor(newElapsedTime / protocol.stageDuration) + 1;
          if (currentStageFromTime > prev.currentStage) {
            AudioService.playStageBeep();
          } else {
            AudioService.playBeep();
          }
        }

        // Calculate current stage
        const currentStage = Math.floor(newElapsedTime / protocol.stageDuration) + 1;

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
    }, 100);
  }, [protocol]);

  const pauseTest = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const resumeTest = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const recordFailure = useCallback((athleteId: string) => {
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
    AudioService.playEndBeep();

    const currentState = state;

    if (!currentState.isStarted) {
      return null;
    }

    const athleteResults: AthleteResult[] = currentState.athleteStates.map(as => {
      // Se eliminado, usa os valores salvos. Se não (stop manual), usa o estágio/rep atual.
      const stage = as.isEliminated ? as.eliminatedAtStage : currentState.currentStage;
      const rep = as.isEliminated ? as.eliminatedAtRep : currentState.currentRep;

      // Lógica de testes incompletos:
      // Se parou no meio (seja por falha ou stop manual), o estágio atual NÃO conta como completo.
      // Então stagesCompleted sempre será stage - 1.
      const completedStages = Math.max(0, stage - 1);

      // Repetições completas no estágio atual (último que participou)
      const completedRepsInLastStage = rep;

      // Verificação rigorosa para conclusão total do estágio
      // Só é true se NÃO foi eliminado E completou todas as reps + tempo de recuperação final
      const isLastStageComplete = !as.isEliminated &&
        currentState.currentRep === protocol.repsPerStage &&
        currentState.currentPhase === 'recovery' &&
        currentState.repElapsedTime >= 17;

      // Se completou o último estágio perfeitamente, incrementa o contador de estágios
      const finalCompletedStages = isLastStageComplete ? stage : completedStages;

      const peakVelocity = CalculatorService.calculatePeakVelocity(
        protocol,
        Math.max(1, finalCompletedStages), // Garante min 1 para cálculo
        completedRepsInLastStage,
        isLastStageComplete
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
        isLastStageComplete,
        peakVelocity,
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
    return () => clearTimer();
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
