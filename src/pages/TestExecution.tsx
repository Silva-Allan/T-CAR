import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Square, Play, RotateCcw, User, XCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/test/StatCard';
import { ProgressRing } from '@/components/test/ProgressRing';
import { useMultiAthleteTestEngine } from '@/hooks/useMultiAthleteTestEngine';
import { useApp } from '@/store/AppContext';
import { CalculatorService } from '@/services/CalculatorService';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TestExecution() {
  const navigate = useNavigate();
  const { selectedAthletes, selectedProtocol, initializeAudio } = useApp();
  const { state, startTest, recordFailure, resetFailures, endTest } = useMultiAthleteTestEngine(
    selectedProtocol, 
    selectedAthletes
  );
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isBeeping, setIsBeeping] = useState(false);
  const [audioReady, setAudioReady] = useState(false);

  // Initialize audio on mount
  useEffect(() => {
    const init = async () => {
      await initializeAudio();
      setAudioReady(true);
    };
    init();
  }, []);

  // Watch for test end from all athletes eliminated
  useEffect(() => {
    if (state.allEliminated && !state.isRunning && state.isStarted) {
      handleTestEnd();
    }
  }, [state.allEliminated, state.isRunning, state.isStarted]);

  // Beep animation effect
  useEffect(() => {
    if (!state.isRunning) return;
    
    const interval = Math.floor(state.elapsedTime / 6);
    const prevInterval = Math.floor((state.elapsedTime - 0.1) / 6);
    
    if (interval > prevInterval) {
      setIsBeeping(true);
      setTimeout(() => setIsBeeping(false), 150);
    }
  }, [state.elapsedTime, state.isRunning]);

  const handleStartTest = async () => {
    startTest();
  };

  const handleTestEnd = () => {
    const result = endTest();
    if (result) {
      navigate('/results', { 
        state: { 
          multiResult: {
            protocol: selectedProtocol,
            totalTime: result.totalTime,
            athleteResults: result.athleteResults,
          }
        } 
      });
    } else {
      navigate('/');
    }
  };

  const handleFailure = (athleteId: string) => {
    recordFailure(athleteId);
  };

  const handleResetFailures = (athleteId: string) => {
    resetFailures(athleteId);
  };

  const stageProgress = state.isStarted 
    ? ((state.elapsedTime % selectedProtocol.stageDuration) / selectedProtocol.stageDuration) * 100
    : 0;

  const activeAthletes = state.athleteStates.filter(as => !as.isEliminated);

  // Pre-test screen
  if (!state.isStarted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="glass-card border-b border-border/50 p-4">
          <div className="container mx-auto text-center">
            <h1 className="text-xl font-bold">T-CAR Nível {selectedProtocol.level}</h1>
            <p className="text-muted-foreground">{selectedAthletes.length} atleta{selectedAthletes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="flex-1 container mx-auto px-4 py-6 flex flex-col items-center justify-center gap-8">
          {/* Athletes list */}
          <div className="w-full max-w-md space-y-2">
            <h2 className="text-sm text-muted-foreground text-center mb-4">Atletas participantes</h2>
            {selectedAthletes.map((athlete, index) => (
              <div 
                key={athlete.id}
                className="glass-card p-3 rounded-xl flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {index + 1}
                </div>
                <span className="font-medium">{athlete.name}</span>
              </div>
            ))}
          </div>

          {/* Start button */}
          <Button
            size="lg"
            className="h-20 w-full max-w-md text-xl gap-3"
            onClick={handleStartTest}
            disabled={!audioReady}
          >
            <Play className="w-8 h-8" />
            Iniciar Teste
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/configure-test')}
          >
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top stats bar */}
      <div className="glass-card border-b border-border/50 p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {activeAthletes.length}/{selectedAthletes.length} ativos
            </span>
            <span className="text-sm text-muted-foreground">
              Nível {selectedProtocol.level}
            </span>
          </div>
          
          {/* Main timer */}
          <div className="text-center">
            <span className={cn(
              "stat-value transition-all duration-150",
              isBeeping && "text-primary scale-105"
            )}>
              {CalculatorService.formatTime(state.elapsedTime)}
            </span>
          </div>
        </div>
      </div>

      {/* Stage info */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-6">
          <ProgressRing 
            progress={stageProgress} 
            size={120}
            className={cn(isBeeping && "animate-beep")}
          >
            <div className="text-center">
              <p className="stat-label text-xs">Estágio</p>
              <p className="text-2xl font-mono font-bold">{state.currentStage}</p>
            </div>
          </ProgressRing>

          <div className="space-y-2">
            <StatCard
              label="Velocidade"
              value={state.currentSpeed.toFixed(1)}
              unit="km/h"
              variant="primary"
              className="!p-3"
            />
            <StatCard
              label="Distância"
              value={state.currentDistance}
              unit="m"
              className="!p-3"
            />
          </div>
        </div>

        {/* Rep and phase indicator */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="text-center">
            <p className="stat-label">Rep</p>
            <p className="text-xl font-mono font-bold">{state.currentRep}/5</p>
          </div>
          <div className={cn(
            "px-4 py-2 rounded-full text-sm font-medium",
            state.currentPhase === 'going' && "bg-primary/20 text-primary",
            state.currentPhase === 'returning' && "bg-warning/20 text-warning",
            state.currentPhase === 'recovery' && "bg-success/20 text-success",
          )}>
            {state.currentPhase === 'going' && 'IDA →'}
            {state.currentPhase === 'returning' && '← VOLTA'}
            {state.currentPhase === 'recovery' && '⏸ RECUPERAÇÃO'}
          </div>
        </div>
      </div>

      {/* Athletes grid with failure buttons */}
      <div className="flex-1 container mx-auto px-4 py-2 overflow-y-auto">
        <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
          {state.athleteStates.map((as, index) => (
            <div
              key={as.athleteId}
              className={cn(
                "glass-card p-3 rounded-xl flex items-center gap-3 transition-all",
                as.isEliminated && "opacity-50 bg-destructive/10"
              )}
            >
              {/* Athlete number */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                as.isEliminated ? "bg-destructive/30 text-destructive" : "bg-primary text-primary-foreground"
              )}>
                {index + 1}
              </div>

              {/* Athlete name */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium truncate",
                  as.isEliminated && "line-through"
                )}>
                  {as.athleteName}
                </p>
                {as.consecutiveFailures > 0 && !as.isEliminated && (
                  <p className="text-xs text-destructive">{as.consecutiveFailures}/2 falhas</p>
                )}
                {as.isEliminated && (
                  <p className="text-xs text-destructive">Eliminado</p>
                )}
              </div>

              {/* Action buttons */}
              {!as.isEliminated ? (
                <div className="flex items-center gap-2">
                  {as.consecutiveFailures > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => handleResetFailures(as.athleteId)}
                    >
                      <RotateCcw className="w-4 h-4 text-success" />
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    className="h-10 px-4"
                    onClick={() => handleFailure(as.athleteId)}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Falha
                  </Button>
                </div>
              ) : (
                <XCircle className="w-6 h-6 text-destructive" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="glass-card border-t border-border/50 p-4">
        <div className="container mx-auto max-w-md">
          <Button
            variant="destructive"
            className="w-full h-12"
            onClick={() => setShowEndDialog(true)}
          >
            <Square className="w-4 h-4 mr-2" />
            Encerrar Teste
          </Button>
        </div>
      </div>

      {/* End confirmation dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar teste?</AlertDialogTitle>
            <AlertDialogDescription>
              O teste será finalizado e os resultados serão calculados com base no progresso atual de cada atleta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleTestEnd}>
              Encerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
