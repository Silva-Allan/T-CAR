import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Users, 
  History, 
  Settings, 
  Info,
  Activity,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';

export default function Index() {
  const navigate = useNavigate();
  const { initializeAudio, isAudioReady } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsLoading(false);
    };
    init();
  }, []);

  const handleStartTest = async () => {
    if (!isAudioReady) {
      await initializeAudio();
    }
    navigate('/select-athletes');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <h1 className="text-3xl font-bold mb-2">T-CAR</h1>
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-10 h-10 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">
            T-CAR
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Teste de Carminatti para avaliação de performance aeróbica
          </p>
        </div>

        {/* Main Action */}
        <Button 
          variant="hero"
          size="xl"
          onClick={handleStartTest}
          className="mb-8 animate-slide-up"
        >
          <Play className="w-6 h-6" />
          Iniciar Teste
        </Button>
      </div>

      {/* Menu Grid */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto animate-slide-up">
          <Button
            variant="glass"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/athletes')}
          >
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm">Atletas</span>
          </Button>
          
          <Button
            variant="glass"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/history')}
          >
            <History className="w-5 h-5 text-primary" />
            <span className="text-sm">Histórico</span>
          </Button>
          
          <Button
            variant="glass"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/settings')}
          >
            <Settings className="w-5 h-5 text-primary" />
            <span className="text-sm">Configurações</span>
          </Button>
          
          <Button
            variant="glass"
            className="h-20 flex-col gap-2"
            onClick={() => navigate('/about')}
          >
            <Info className="w-5 h-5 text-primary" />
            <span className="text-sm">Sobre</span>
          </Button>
        </div>
      </div>

      {/* Version footer */}
      <footer className="pb-6 text-center">
        <p className="text-xs text-muted-foreground/50">v1.0.0</p>
      </footer>
    </div>
  );
}
