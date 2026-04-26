// ======================================================================
// T-CAR 2.0 — Storage Service (Somente Configurações)
// ======================================================================
// SEGURANÇA: Dados sensíveis (atletas, resultados) NÃO são armazenados
// em localStorage. Apenas configurações não-sensíveis do app.
// IndexedDB é usado para dados offline com escopo isolado.
// ======================================================================

import { AppSettings, BeepType } from '@/models/types';

const KEYS = {
  SETTINGS: 'tcar_settings',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  volume: 0.8,
  beepType: 'standard' as BeepType,
  language: 'pt',
};

class StorageServiceClass {
  // ====================================================================
  // Configurações (não-sensíveis)
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
  // Limpeza segura
  // ====================================================================

  resetAllData(): void {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  }
}

export const StorageService = new StorageServiceClass();
