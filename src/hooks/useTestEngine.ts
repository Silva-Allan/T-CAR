import { useState, useCallback, useRef, useEffect } from 'react';
import { TestState, TestProtocol, TestResult } from '@/models/types';
import { AudioService } from '@/services/AudioService';
import { CalculatorService } from '@/services/CalculatorService';

const INITIAL_STATE: TestState = {
  isRunning: false,
  isPaused: false,
  currentStage: 1,
  currentRep: 0,
  currentPhase: 'idle',
  elapsedTime: 0,
  repElapsedTime: 0,
  consecutiveFailures: 0,
  currentSpeed: 0,
  currentDistance: 0,
};

export function useTestEngine(protocol: TestProtocol) {
  const [state, setState] = useState<TestState>({
    ...INITIAL_STATE,
    currentSpeed: protocol.initialSpeed,
    currentDistance: protocol.initialDistance,
  });
  
  const intervalRef = useRef<number | null>(null);
  const lastBeepTimeRef = useRef<number>(0);

  // Update protocol values when protocol changes
  useEffect(() => {
    if (!state.isRunning) {
      setState(prev => ({
        ...prev,
        currentSpeed: protocol.initialSpeed,
        currentDistance: protocol.initialDistance,
      }));
    }
  }, [protocol, state.isRunning]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTest = useCallback(async () => {
    await AudioService.resume();
    
    setState({
      ...INITIAL_STATE,
      isRunning: true,
      currentRep: 1,
      currentPhase: 'going',
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
    });
    
    lastBeepTimeRef.current = 0;
    
    // Initial beep
    AudioService.playStageBeep();
    
    const startTime = Date.now();
    
    intervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      setState(prev => {
        if (!prev.isRunning || prev.isPaused) return prev;
        
        const newElapsedTime = elapsed;
        const stageElapsedTime = newElapsedTime % protocol.stageDuration;
        const repElapsedTime = stageElapsedTime % protocol.repDuration;
        
        // Calculate current rep (1-5) and phase
        const repInStage = Math.floor(stageElapsedTime / protocol.repDuration) + 1;
        const phase = repElapsedTime < 6 ? 'going' : 'returning';
        
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
          currentPhase: phase as 'going' | 'returning',
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

  const recordFailure = useCallback(() => {
    AudioService.playFailBeep();
    
    setState(prev => {
      const newFailures = prev.consecutiveFailures + 1;
      
      if (newFailures >= 2) {
        // Test ends on 2 consecutive failures
        clearTimer();
        return { ...prev, consecutiveFailures: newFailures, isRunning: false };
      }
      
      return { ...prev, consecutiveFailures: newFailures };
    });
  }, [clearTimer]);

  const resetFailures = useCallback(() => {
    setState(prev => ({ ...prev, consecutiveFailures: 0 }));
  }, []);

  const endTest = useCallback((): Omit<TestResult, 'id' | 'date' | 'athleteId' | 'athleteName'> | null => {
    clearTimer();
    AudioService.playEndBeep();
    
    const currentState = state;
    
    if (!currentState.isRunning && currentState.elapsedTime === 0) {
      return null;
    }
    
    // Calculate completed stages and reps
    const completedStages = currentState.currentStage - 1;
    const completedRepsInLastStage = currentState.currentRep - 1;
    const isLastStageComplete = currentState.currentRep === protocol.repsPerStage && 
                                 currentState.currentPhase === 'returning' &&
                                 currentState.repElapsedTime >= 5.5;
    
    const peakVelocity = CalculatorService.calculatePeakVelocity(
      protocol,
      completedStages > 0 ? completedStages : 1,
      completedRepsInLastStage,
      isLastStageComplete
    );
    
    const finalDistance = CalculatorService.calculateTotalDistance(
      protocol,
      completedStages,
      completedRepsInLastStage,
      isLastStageComplete
    );
    
    setState(prev => ({
      ...INITIAL_STATE,
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
    }));
    
    return {
      protocol,
      completedStages: isLastStageComplete ? currentState.currentStage : completedStages,
      completedRepsInLastStage,
      isLastStageComplete,
      peakVelocity,
      finalDistance,
      totalTime: currentState.elapsedTime,
    };
  }, [state, protocol, clearTimer]);

  const resetTest = useCallback(() => {
    clearTimer();
    setState({
      ...INITIAL_STATE,
      currentSpeed: protocol.initialSpeed,
      currentDistance: protocol.initialDistance,
    });
  }, [protocol, clearTimer]);

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
