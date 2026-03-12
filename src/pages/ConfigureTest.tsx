import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Volume2, Check, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { AudioService } from '@/services/AudioService';
import { cn } from '@/lib/utils';

export default function ConfigureTest() {
  const navigate = useNavigate();
  const { selectedAthlete, selectedProtocol, setProtocolLevel, initializeAudio, isAudioReady } = useApp();
  const [selectedLevel, setSelectedLevel] = useState<1 | 2>(selectedProtocol.level);

  const handleTestAudio = async () => {
    if (!isAudioReady) {
      await initializeAudio();
    }
    await AudioService.testAudio();
  };

  const handleConfirm = () => {
    setProtocolLevel(selectedLevel);
    navigate('/instructions');
  };

  const protocols = [
    {
      level: 1 as const,
      title: 'Nível 1',
      description: 'Iniciantes e intermediários',
      speed: '9.0 km/h',
      distance: '15 metros',
    },
    {
      level: 2 as const,
      title: 'Nível 2',
      description: 'Atletas avançados',
      speed: '12.0 km/h',
      distance: '20 metros',
    },
  ];

  return (
    <PageContainer
      title="Configurar Teste"
      showBack
      backTo="/select-athletes"
    >
      <div className="max-w-md mx-auto space-y-6">
        {/* Selected athlete info */}
        {selectedAthlete && (
          <div className="glass-card p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">Atleta</p>
            <p className="font-semibold text-lg">{selectedAthlete.name}</p>
          </div>
        )}

        {/* Protocol selection */}
        <div className="space-y-3">
          <h2 className="text-sm text-muted-foreground px-1">Selecione o protocolo</h2>

          {protocols.map((protocol) => (
            <button
              key={protocol.level}
              className={cn(
                "w-full glass-card p-5 rounded-xl text-left transition-all duration-200",
                selectedLevel === protocol.level
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "hover:bg-card/90"
              )}
              onClick={() => setSelectedLevel(protocol.level)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{protocol.title}</h3>
                  <p className="text-sm text-muted-foreground">{protocol.description}</p>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                  selectedLevel === protocol.level
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {selectedLevel === protocol.level && (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Velocidade</p>
                  <p className="text-lg font-mono font-semibold text-primary">{protocol.speed}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Distância</p>
                  <p className="text-lg font-mono font-semibold">{protocol.distance}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Protocol info */}
        <div className="glass-card p-4 rounded-xl space-y-2">
          <h3 className="font-semibold mb-3">Progressão do teste</h3>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Incremento de velocidade</span>
            <span className="font-mono">+0.6 km/h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Incremento de distância</span>
            <span className="font-mono">+1 metro</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duração do estágio</span>
            <span className="font-mono">90 segundos</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Repetições por estágio</span>
            <span className="font-mono">5 (ida/volta)</span>
          </div>
        </div>

        {/* Audio test */}
        <Button
          variant="outline"
          className="w-full h-12"
          onClick={handleTestAudio}
        >
          <Volume2 className="w-5 h-5 mr-2" />
          Testar Áudio
        </Button>

        {/* Confirm button */}
        <Button
          variant="hero"
          className="w-full"
          onClick={handleConfirm}
        >
          Continuar
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </PageContainer>
  );
}
