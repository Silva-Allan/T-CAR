import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';

export default function Instructions() {
  const navigate = useNavigate();
  const { selectedProtocol } = useApp();

  return (
    <PageContainer 
      title="Instruções" 
      showBack 
      backTo="/configure-test"
    >
      <div className="max-w-md mx-auto space-y-6">
        {/* Visual diagram */}
        <div className="glass-card p-6 rounded-xl">
          <h3 className="font-semibold mb-4 text-center">Esquema do Vai-e-Volta</h3>
          
          <div className="relative h-32 flex items-center justify-center">
            {/* Start/End marker */}
            <div className="absolute left-4 flex flex-col items-center">
              <div className="w-3 h-16 bg-primary rounded-full" />
              <span className="text-xs mt-2 text-muted-foreground">INÍCIO</span>
            </div>
            
            {/* Distance line */}
            <div className="flex-1 mx-12 relative">
              <div className="h-1 bg-secondary rounded-full" />
              
              {/* Arrows showing direction */}
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 flex items-center text-primary">
                <ArrowRight className="w-6 h-6 animate-pulse" />
                <span className="text-xs ml-1">IDA (6s)</span>
              </div>
              <div className="absolute top-1/2 right-1/4 -translate-y-1/2 flex items-center text-accent">
                <span className="text-xs mr-1">VOLTA (6s)</span>
                <ArrowLeft className="w-6 h-6 animate-pulse" />
              </div>
              
              {/* Distance label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                <span className="text-sm font-mono font-semibold">{selectedProtocol.initialDistance}m</span>
              </div>
            </div>
            
            {/* Turn marker */}
            <div className="absolute right-4 flex flex-col items-center">
              <div className="w-3 h-16 bg-accent rounded-full" />
              <span className="text-xs mt-2 text-muted-foreground">GIRO</span>
            </div>
          </div>
        </div>

        {/* Instructions text */}
        <div className="glass-card p-5 rounded-xl space-y-4">
          <h3 className="font-semibold">Como funciona</h3>
          
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">1</span>
              <span>O atleta posiciona-se na linha de partida</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">2</span>
              <span>A cada <strong>bipe</strong>, o atleta deve cruzar a linha oposta (ida ou volta)</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">3</span>
              <span>São <strong>5 repetições</strong> (ida+volta) por estágio, totalizando 90 segundos</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">4</span>
              <span>A cada novo estágio, a velocidade e distância aumentam</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">!</span>
              <span>O teste termina após <strong>2 falhas consecutivas</strong> ou por exaustão voluntária</span>
            </li>
          </ol>
        </div>

        {/* Protocol summary */}
        <div className="glass-card p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Protocolo selecionado</span>
            <span className="font-semibold">Nível {selectedProtocol.level}</span>
          </div>
        </div>

        {/* Start button */}
        <Button
          variant="hero"
          className="w-full"
          onClick={() => navigate('/test')}
        >
          <Play className="w-6 h-6 mr-2" />
          Iniciar Teste
        </Button>
      </div>
    </PageContainer>
  );
}
