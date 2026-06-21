import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Athlete, TestResult, AppSettings, TestProtocol, MultiAthleteTestResult, AthleteResult } from '@/models/types';
import { StorageService } from '@/services/StorageService';
import { AudioService } from '@/services/AudioService';
import { CalculatorService } from '@/services/CalculatorService';
import { IndexedDBService } from '@/services/IndexedDBService';
import { SyncService, SyncStatus } from '@/services/SyncService';

interface AppContextType {
  // Athletes (em memória — fonte primária é Supabase)
  selectedAthlete: Athlete | null;
  selectedAthletes: Athlete[];
  setSelectedAthlete: (athlete: Athlete | null) => void;
  setSelectedAthletes: (athletes: Athlete[]) => void;

  // Protocol
  selectedProtocol: TestProtocol;
  setProtocolLevel: (level: 1 | 2) => void;

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetAllData: () => void;

  // Audio
  isAudioReady: boolean;
  initializeAudio: () => Promise<boolean>;

  // Sync
  syncStatus: SyncStatus | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<TestProtocol>(
    CalculatorService.getProtocol(1)
  );
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Init IndexedDB + start sync monitoring
  useEffect(() => {
    IndexedDBService.init().then(() => {
      SyncService.startMonitoring();
    });

    const unsubscribe = SyncService.onStatusChange(setSyncStatus);
    return () => unsubscribe();
  }, []);

  // Apply settings to audio service
  useEffect(() => {
    AudioService.setVolume(settings.volume);
  }, [settings.volume]);

  useEffect(() => {
    AudioService.setLanguage(settings.language || 'pt');
  }, [settings.language]);

  const initializeAudio = async (): Promise<boolean> => {
    const success = await AudioService.initialize();
    setIsAudioReady(success);
    return success;
  };

  const setProtocolLevel = (level: 1 | 2): void => {
    setSelectedProtocol(CalculatorService.getProtocol(level));
  };

  const updateSettings = (newSettings: Partial<AppSettings>): void => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const resetAllData = (): void => {
    StorageService.resetAllData();
    setSelectedAthlete(null);
    setSelectedAthletes([]);
    setSettings(StorageService.getSettings());
  };

  return (
    <AppContext.Provider
      value={{
        selectedAthlete,
        selectedAthletes,
        setSelectedAthlete,
        setSelectedAthletes,
        selectedProtocol,
        setProtocolLevel,
        settings,
        updateSettings,
        resetAllData,
        isAudioReady,
        initializeAudio,
        syncStatus,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
