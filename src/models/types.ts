// ======================================================================
// T-CAR 2.0 — Tipos TypeScript
// ======================================================================

// --- Entidades de Banco ---

export interface Trainer {
  id: string;
  userId: string;
  name: string;
  email: string;
  club?: string;
  location?: string;
  createdAt: string;
}

export interface Athlete {
  id: string;
  userId: string;
  name: string;
  email?: string;
  password?: string; // Para futura versão/login
  birthDate?: string;
  birth_date?: string; // Compatiblidade com Supabase
  gender?: 'M' | 'F' | 'Prefiro não dizer';
  team?: string;
  position?: string;
  createdAt: string;
}

export interface Test {
  id: string;
  userId: string;
  date: string;
  protocolLevel: 1 | 2;
  totalTime: number;
  temperature?: number;
  notes?: string;
  createdAt: string;
}

export interface TestResultRecord {
  id: string;
  testId: string;
  athleteId: string;
  athleteName: string;
  completedStages: number;
  completedRepsInLastStage: number;
  totalReps: number;
  isLastStageComplete: boolean;
  pvBruto: number;
  pvCorrigido: number;
  fcFinal?: number | null;
  fcEstimada?: number | null;
  finalDistance: number;
  eliminatedByFailure: boolean;
  createdAt: string;
}

// --- Protocolo T-CAR ---

export interface TestProtocol {
  level: 1 | 2;
  initialSpeed: number; // km/h
  initialDistance: number; // metros
  speedIncrement: number; // km/h por estágio
  distanceIncrement: number; // metros por estágio
  repDuration: number; // segundos (sempre 18: 6s ida + 6s volta + 6s recuperação)
  repsPerStage: number; // sempre 5
  stageDuration: number; // segundos (sempre 90)
}

// --- Estado do Teste Multi-Atleta ---

export interface AthleteTestState {
  athleteId: string;
  athleteName: string;
  consecutiveFailures: number;
  isEliminated: boolean;
  eliminatedAtStage: number;
  eliminatedAtRep: number;
  heartRate?: number;
}

export interface AthleteResult {
  athleteId: string;
  athleteName: string;
  completedStages: number;
  completedRepsInLastStage: number;
  totalReps: number;
  isLastStageComplete: boolean;
  pvBruto: number;
  pvCorrigido: number;
  fcFinal?: number | null;
  fcEstimada?: number | null;
  finalDistance: number;
  eliminatedByFailure: boolean;
}

export interface MultiAthleteTestResult {
  id: string;
  date: string;
  protocol: TestProtocol;
  totalTime: number;
  athleteResults: AthleteResult[];
}

// --- Resultado legado (para compatibilidade do localStorage) ---
export interface TestResult {
  id: string;
  athleteId: string;
  athleteName: string;
  protocol: TestProtocol;
  completedStages: number;
  completedRepsInLastStage: number;
  isLastStageComplete: boolean;
  peakVelocity: number; // PV-TCAR bruto
  finalDistance: number;
  totalTime: number;
  date: string;
}

// --- Estado de Execução ---

export interface TestState {
  isRunning: boolean;
  isPaused: boolean;
  currentStage: number;
  currentRep: number;
  currentPhase: 'idle' | 'going' | 'returning' | 'recovery';
  elapsedTime: number;
  repElapsedTime: number;
  consecutiveFailures: number;
  currentSpeed: number;
  currentDistance: number;
}

// --- Configurações ---

export type BeepType = 'standard' | 'high' | 'double';

export interface AppSettings {
  volume: number;
  beepType: BeepType;
  language: 'pt' | 'en';
}

// --- Classificação PV-TCAR ---

export interface PVClassification {
  label: string;
  percentile: number;
  color: string;
}

// --- Offline / Sync ---

export interface PendingSyncItem {
  id: string;
  type: 'test';
  data: any;
  createdAt: string;
  retryCount: number;
}

// --- Utilitários ---

export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateCategory(birthDate: string): string {
  const age = calculateAge(birthDate);
  if (age < 7) return 'Kids';
  if (age <= 11) return 'Sub-11';
  if (age <= 13) return 'Sub-13';
  if (age <= 15) return 'Sub-15';
  if (age <= 17) return 'Sub-17';
  if (age <= 20) return 'Sub-20';
  if (age <= 34) return 'Adulto';
  return 'Master';
}
