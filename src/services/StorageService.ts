import { Athlete, TestResult, AppSettings } from '@/models/types';

const STORAGE_KEYS = {
  ATHLETES: 'tcar_athletes',
  RESULTS: 'tcar_results',
  SETTINGS: 'tcar_settings',
};

class StorageServiceClass {
  // Athletes
  getAthletes(): Athlete[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATHLETES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveAthlete(athlete: Athlete): void {
    const athletes = this.getAthletes();
    const existingIndex = athletes.findIndex(a => a.id === athlete.id);
    
    if (existingIndex >= 0) {
      athletes[existingIndex] = athlete;
    } else {
      athletes.push(athlete);
    }
    
    localStorage.setItem(STORAGE_KEYS.ATHLETES, JSON.stringify(athletes));
  }

  deleteAthlete(id: string): void {
    const athletes = this.getAthletes().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ATHLETES, JSON.stringify(athletes));
  }

  // Results
  getResults(): TestResult[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getResultsByAthlete(athleteId: string): TestResult[] {
    return this.getResults().filter(r => r.athleteId === athleteId);
  }

  saveResult(result: TestResult): void {
    const results = this.getResults();
    results.unshift(result); // Add to beginning (most recent first)
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  }

  deleteResult(id: string): void {
    const results = this.getResults().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  }

  // Settings
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch {
      return this.getDefaultSettings();
    }
  }

  saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  private getDefaultSettings(): AppSettings {
    return {
      volume: 0.8,
      beepType: 'standard',
      language: 'pt',
    };
  }

  // Export
  exportResultsToCSV(): string {
    const results = this.getResults();
    const headers = ['Data', 'Atleta', 'Protocolo', 'PV-TCAR', 'Estágios', 'Distância', 'Tempo'];
    
    const rows = results.map(r => [
      new Date(r.date).toLocaleDateString('pt-BR'),
      r.athleteName,
      `Nível ${r.protocol.level}`,
      r.peakVelocity.toFixed(2),
      r.completedStages.toString(),
      `${r.finalDistance}m`,
      this.formatTime(r.totalTime),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Reset
  resetAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.ATHLETES);
    localStorage.removeItem(STORAGE_KEYS.RESULTS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
}

export const StorageService = new StorageServiceClass();
