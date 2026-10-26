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
  gender?: 'M' | 'F' | 'Outro' | 'Prefiro não dizer';
  sport?: string | null;
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

export const VALID_POSITIONS = [
  'defender_central', // Zagueiro
  'defender_wide',    // Lateral
  'midfielder',       // Meio-campista
  'forward',          // Atacante
  'center_forward'    // Centroavante
] as const;

export type Position = typeof VALID_POSITIONS[number];

export const HANDBALL_POSITIONS = [
  'handball_goalkeeper', // Goleiro
  'handball_wing',       // Ponta
  'handball_back',       // Armador lateral
  'handball_center',     // Armador central
  'handball_pivot',      // Pivô
] as const;

// --- Modalidade ---
// 'other' = outras modalidades ou não atletas (ex.: turmas de faculdade): sem posição

export const SPORTS = ['football', 'handball', 'other'] as const;
export type Sport = typeof SPORTS[number];

/** Registros antigos (null, 'athletics' do schema inicial) são de futebol */
export function normalizeSport(sport?: string | null): Sport {
  return sport === 'handball' || sport === 'other' ? sport : 'football';
}

export function positionsForSport(sport?: string | null): readonly string[] {
  const s = normalizeSport(sport);
  if (s === 'football') return VALID_POSITIONS;
  if (s === 'handball') return HANDBALL_POSITIONS;
  return [];
}

/**
 * "YYYY-MM-DD" vira meia-noite LOCAL. `new Date('2011-03-01')` seria meia-noite
 * UTC, que no Brasil cai no dia anterior e erra a idade no dia do aniversário.
 */
function toLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

/** Idade na data de referência (padrão: hoje) */
export function calculateAge(birthDate: string, referenceDate: string | Date = new Date()): number {
  const ref = toLocalDate(referenceDate);
  const birth = toLocalDate(birthDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export const CATEGORIES = ['Sub-11', 'Sub-13', 'Sub-15', 'Sub-17', 'Sub-20', 'Profissional'] as const;

/**
 * Categoria pela idade na data de referência. Nos relatórios a referência é
 * a data do teste: quem foi testado como Sub-15 continua Sub-15 naquele teste.
 */
export function calculateCategory(birthDate: string, referenceDate: string | Date = new Date()): string {
  const age = calculateAge(birthDate, referenceDate);
  if (age <= 11) return 'Sub-11';
  if (age <= 13) return 'Sub-13';
  if (age <= 15) return 'Sub-15';
  if (age <= 17) return 'Sub-17';
  if (age <= 20) return 'Sub-20';
  return 'Profissional';
}
