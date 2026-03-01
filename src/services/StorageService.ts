// ======================================================================
// T-CAR 2.0 — Storage Service (localStorage - legado + backup)
// ======================================================================
// Mantém compatibilidade com localStorage existente.
// IndexedDB é o armazenamento principal para execução offline.
// ======================================================================

import { Athlete, TestResult, AppSettings, BeepType } from '@/models/types';

const KEYS = {
  ATHLETES: 'tcar_athletes',
  RESULTS: 'tcar_results',
  SETTINGS: 'tcar_settings',
  MULTI_RESULTS: 'tcar_multi_results',
};

const DEFAULT_SETTINGS: AppSettings = {
  volume: 0.8,
  beepType: 'standard' as BeepType,
  language: 'pt',
};

class StorageServiceClass {
  // ====================================================================
  // Atletas (backup local)
  // ====================================================================

  getAthletes(): Athlete[] {
    try {
      const data = localStorage.getItem(KEYS.ATHLETES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveAthlete(athlete: Athlete): void {
    const athletes = this.getAthletes();
    const index = athletes.findIndex(a => a.id === athlete.id);
    if (index >= 0) {
      athletes[index] = athlete;
    } else {
      athletes.push(athlete);
    }
    localStorage.setItem(KEYS.ATHLETES, JSON.stringify(athletes));
  }

  deleteAthlete(id: string): void {
    const athletes = this.getAthletes().filter(a => a.id !== id);
    localStorage.setItem(KEYS.ATHLETES, JSON.stringify(athletes));
  }

  // ====================================================================
  // Resultados (backup local)
  // ====================================================================

  getResults(): TestResult[] {
    try {
      const data = localStorage.getItem(KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveResult(result: TestResult): void {
    const results = this.getResults();
    results.push(result);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(results));
  }

  deleteResult(id: string): void {
    const results = this.getResults().filter(r => r.id !== id);
    localStorage.setItem(KEYS.RESULTS, JSON.stringify(results));
  }

  // ====================================================================
  // Configurações
  // ====================================================================

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }

  // ====================================================================
  // Utilitários
  // ====================================================================

  exportResultsToCSV(): string {
    const results = this.getResults();
    if (results.length === 0) return '';

    const headers = ['Atleta', 'PV-TCAR', 'Estágios', 'Distância', 'Tempo', 'Data'];
    const rows = results.map(r => [
      r.athleteName,
      r.peakVelocity.toFixed(2),
      r.completedStages,
      r.finalDistance,
      r.totalTime.toFixed(0),
      new Date(r.date).toLocaleDateString('pt-BR'),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  resetAllData(): void {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }
}

export const StorageService = new StorageServiceClass();
