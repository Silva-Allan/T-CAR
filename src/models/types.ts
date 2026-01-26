export interface Athlete {
  id: string;
  name: string;
  birthDate?: string;
  position?: string;
  team?: string;
  createdAt: string;
}

export interface TestProtocol {
  level: 1 | 2;
  initialSpeed: number; // km/h
  initialDistance: number; // meters
  speedIncrement: number; // km/h per stage
  distanceIncrement: number; // meters per stage
  repDuration: number; // seconds (always 18: 6s going + 6s returning + 6s recovery)
  repsPerStage: number; // always 5
  stageDuration: number; // seconds (always 90)
}

export interface AthleteTestState {
  athleteId: string;
  athleteName: string;
  consecutiveFailures: number;
  isEliminated: boolean;
  eliminatedAtStage: number;
  eliminatedAtRep: number;
  heartRate?: number;
}

export interface MultiAthleteTestResult {
  id: string;
  date: string;
  protocol: TestProtocol;
  totalTime: number;
  athleteResults: AthleteResult[];
}

export interface AthleteResult {
  athleteId: string;
  athleteName: string;
  completedStages: number;
  completedRepsInLastStage: number;
  isLastStageComplete: boolean;
  peakVelocity: number;
  finalDistance: number;
  heartRate?: number;
  eliminatedByFailure: boolean;
}

export interface TestResult {
  id: string;
  athleteId: string;
  athleteName: string;
  protocol: TestProtocol;
  completedStages: number;
  completedRepsInLastStage: number;
  isLastStageComplete: boolean;
  peakVelocity: number; // PV-TCAR
  finalDistance: number;
  totalTime: number; // seconds
  date: string;
}

export interface TestState {
  isRunning: boolean;
  isPaused: boolean;
  currentStage: number;
  currentRep: number;
  currentPhase: 'idle' | 'going' | 'returning';
  elapsedTime: number;
  repElapsedTime: number;
  consecutiveFailures: number;
  currentSpeed: number;
  currentDistance: number;
}

export type BeepType = 'standard' | 'high' | 'double';

export interface AppSettings {
  volume: number;
  beepType: BeepType;
  language: 'pt' | 'en';
}
