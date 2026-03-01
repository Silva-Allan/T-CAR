import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Athlete, TestResult, AppSettings, TestProtocol, MultiAthleteTestResult, AthleteResult } from '@/models/types';
import { StorageService } from '@/services/StorageService';
import { AudioService } from '@/services/AudioService';
import { CalculatorService } from '@/services/CalculatorService';
import { IndexedDBService } from '@/services/IndexedDBService';
import { SyncService, SyncStatus } from '@/services/SyncService';

interface AppContextType {
  // Athletes
  athletes: Athlete[];
  selectedAthlete: Athlete | null;
  selectedAthletes: Athlete[];
  setSelectedAthlete: (athlete: Athlete | null) => void;
  setSelectedAthletes: (athletes: Athlete[]) => void;
  addAthlete: (athlete: Omit<Athlete, 'id' | 'createdAt'>) => Athlete;
  updateAthlete: (athlete: Athlete) => void;
  deleteAthlete: (id: string) => void;

  // Protocol
  selectedProtocol: TestProtocol;
  setProtocolLevel: (level: 1 | 2) => void;

  // Results
  results: TestResult[];
  multiResults: MultiAthleteTestResult[];
  addResult: (result: Omit<TestResult, 'id' | 'date'>) => void;
  addMultiResult: (result: Omit<MultiAthleteTestResult, 'id' | 'date'>) => void;
  deleteResult: (id: string) => void;
  getAthleteResults: (athleteId: string) => TestResult[];

  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetAllData: () => void;

  // Audio
  isAudioReady: boolean;
  initializeAudio: () => Promise<boolean>;

  // Export
  exportToCSV: () => void;

  // Sync
  syncStatus: SyncStatus | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<TestProtocol>(
    CalculatorService.getProtocol(1)
  );
  const [results, setResults] = useState<TestResult[]>([]);
  const [multiResults, setMultiResults] = useState<MultiAthleteTestResult[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // Load data on mount + init IndexedDB + start sync monitoring
  useEffect(() => {
    setAthletes(StorageService.getAthletes());
    setResults(StorageService.getResults());
    setSettings(StorageService.getSettings());

    // Inicializar IndexedDB e sync
    IndexedDBService.init().then(() => {
      SyncService.startMonitoring();
    });

    // Listener de status de sincronização
    const unsubscribe = SyncService.onStatusChange(setSyncStatus);
    return () => unsubscribe();
  }, []);

  // Apply settings to audio service
  useEffect(() => {
    AudioService.setVolume(settings.volume);
  }, [settings.volume]);

  const initializeAudio = async (): Promise<boolean> => {
    const success = await AudioService.initialize();
    setIsAudioReady(success);
    return success;
  };

  const addAthlete = (athleteData: Omit<Athlete, 'id' | 'createdAt'>): Athlete => {
    const newAthlete: Athlete = {
      ...athleteData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    StorageService.saveAthlete(newAthlete);
    setAthletes(StorageService.getAthletes());
    return newAthlete;
  };

  const updateAthlete = (athlete: Athlete): void => {
    StorageService.saveAthlete(athlete);
    setAthletes(StorageService.getAthletes());
    if (selectedAthlete?.id === athlete.id) {
      setSelectedAthlete(athlete);
    }
  };

  const deleteAthlete = (id: string): void => {
    StorageService.deleteAthlete(id);
    setAthletes(StorageService.getAthletes());
    if (selectedAthlete?.id === id) {
      setSelectedAthlete(null);
    }
  };

  const setProtocolLevel = (level: 1 | 2): void => {
    setSelectedProtocol(CalculatorService.getProtocol(level));
  };

  const addResult = (resultData: Omit<TestResult, 'id' | 'date'>): void => {
    const newResult: TestResult = {
      ...resultData,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    StorageService.saveResult(newResult);
    setResults(StorageService.getResults());
  };

  const addMultiResult = (resultData: Omit<MultiAthleteTestResult, 'id' | 'date'>): void => {
    const newResult: MultiAthleteTestResult = {
      ...resultData,
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('tcar_multi_results') || '[]');
    existing.push(newResult);
    localStorage.setItem('tcar_multi_results', JSON.stringify(existing));
    setMultiResults(existing);
  };

  const deleteResult = (id: string): void => {
    StorageService.deleteResult(id);
    setResults(StorageService.getResults());
  };

  const getAthleteResults = (athleteId: string): TestResult[] => {
    return results.filter(r => r.athleteId === athleteId);
  };

  const updateSettings = (newSettings: Partial<AppSettings>): void => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const resetAllData = (): void => {
    StorageService.resetAllData();
    setAthletes([]);
    setResults([]);
    setSelectedAthlete(null);
    setSettings(StorageService.getSettings());
  };

  const exportToCSV = (): void => {
    const csv = StorageService.exportResultsToCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tcar_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <AppContext.Provider
      value={{
        athletes,
        selectedAthlete,
        selectedAthletes,
        setSelectedAthlete,
        setSelectedAthletes,
        addAthlete,
        updateAthlete,
        deleteAthlete,
        selectedProtocol,
        setProtocolLevel,
        results,
        multiResults,
        addResult,
        addMultiResult,
        deleteResult,
        getAthleteResults,
        settings,
        updateSettings,
        resetAllData,
        isAudioReady,
        initializeAudio,
        exportToCSV,
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
