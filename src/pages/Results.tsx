import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Clock, Ruler, Gauge, Home, RotateCcw, Heart, Save, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/test/StatCard';
import { CalculatorService } from '@/services/CalculatorService';
import { SupabaseService } from '@/services/SupabaseService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AthleteResult } from '@/models/types';
import { cn } from '@/lib/utils';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const multiResult = location.state?.multiResult;
  
  const [heartRates, setHeartRates] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!multiResult) {
    return (
      <PageContainer title="Resultados">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum resultado disponível</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Voltar ao início
          </Button>
        </div>
      </PageContainer>
    );
  }

  const handleHeartRateChange = (athleteId: string, value: string) => {
    setHeartRates(prev => ({ ...prev, [athleteId]: value }));
  };

  const handleSaveToHistory = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Login necessário',
        description: 'Faça login para salvar testes no histórico.'
      });
      navigate('/auth');
      return;
    }

    setSaving(true);
    try {
      const testData = {
        protocol_level: multiResult.protocol.level,
        total_time: Math.round(multiResult.totalTime),
        date: new Date().toISOString()
      };

      const resultsData = (multiResult.athleteResults as AthleteResult[]).map(ar => ({
        athlete_id: ar.athleteId,
        athlete_name: ar.athleteName,
        completed_stages: ar.completedStages,
        completed_reps_in_last_stage: ar.completedRepsInLastStage,
        is_last_stage_complete: ar.isLastStageComplete,
        peak_velocity: ar.peakVelocity,
        final_distance: ar.finalDistance,
        heart_rate: heartRates[ar.athleteId] ? parseInt(heartRates[ar.athleteId]) : null,
        eliminated_by_failure: ar.eliminatedByFailure
      }));

      await SupabaseService.createTest(testData, resultsData);
      
      setSaved(true);
      toast({
        title: 'Teste salvo!',
        description: 'O teste foi salvo no histórico.'
      });
    } catch (error) {
      console.error('Error saving test:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o teste.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Resultados">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success header */}
        <div className="text-center py-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
            <Trophy className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Teste Concluído!</h2>
          <p className="text-muted-foreground">
            {multiResult.athleteResults.length} atleta{multiResult.athleteResults.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Test summary */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Tempo Total"
            value={CalculatorService.formatTime(multiResult.totalTime)}
            icon={<Clock className="w-4 h-4" />}
          />
          <StatCard
            label="Protocolo"
            value={`Nível ${multiResult.protocol.level}`}
            icon={<Gauge className="w-4 h-4" />}
          />
        </div>

        {/* Individual results */}
        <div className="space-y-3">
          <h3 className="font-semibold">Resultados Individuais</h3>
          
          {(multiResult.athleteResults as AthleteResult[]).map((ar, index) => (
            <div 
              key={ar.athleteId}
              className={cn(
                "glass-card p-4 rounded-xl space-y-3 animate-slide-up",
                ar.eliminatedByFailure && "border-destructive/30"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium">{ar.athleteName}</span>
                </div>
                {ar.eliminatedByFailure && (
                  <span className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                    2 falhas
                  </span>
                )}
              </div>

              {/* PV-TCAR */}
              <div className="text-center bg-primary/10 rounded-lg p-3">
                <p className="stat-label text-xs mb-1">PV-TCAR</p>
                <p className="text-3xl font-mono font-black text-primary">
                  {ar.peakVelocity.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">km/h</p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estágios</span>
                  <span className="font-mono">{ar.completedStages}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distância</span>
                  <span className="font-mono">{ar.finalDistance}m</span>
                </div>
              </div>

              {/* Heart rate input */}
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-destructive" />
                <span className="text-sm text-muted-foreground">FC final:</span>
                <Input
                  type="number"
                  placeholder="bpm"
                  className="w-24 h-8 text-center"
                  value={heartRates[ar.athleteId] || ''}
                  onChange={(e) => handleHeartRateChange(ar.athleteId, e.target.value)}
                  disabled={saved}
                />
                <span className="text-sm text-muted-foreground">bpm</span>
              </div>
            </div>
          ))}
        </div>

        {/* Save to history button */}
        {user && !saved && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSaveToHistory}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar no Histórico
              </>
            )}
          </Button>
        )}

        {saved && (
          <div className="text-center text-success flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5" />
            Teste salvo com sucesso!
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/select-athletes')}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Novo Teste
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Início
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
