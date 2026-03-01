import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Users,
  History,
  Settings,
  Info,
  Activity,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';

export default function Index() {
  const navigate = useNavigate();
  const { initializeAudio, isAudioReady } = useApp();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
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
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/20 animate-ping" />
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-1">T-CAR</h1>
        <p className="text-sm text-muted-foreground font-medium">Carregando protocolo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Branded Header Bar */}
      <header className="branded-header px-6 pt-8 pb-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight">T-CAR</h1>
              <p className="text-[10px] text-white/50 font-semibold tracking-[0.2em] uppercase">
                UDESC • Protocolo Oficial
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-white/80 text-sm font-medium leading-relaxed">
              Teste de Carminatti para avaliação de performance aeróbica intermitente
            </p>
          </div>

          {/* Main CTA */}
          <button
            onClick={handleStartTest}
            className="w-full flex items-center justify-center gap-3 bg-white text-primary font-bold text-base py-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Play className="w-5 h-5 fill-current" />
            </div>
            Iniciar Teste
          </button>
        </div>
      </header>

      {/* Menu Grid */}
      <div className="px-6 -mt-4 pb-8 flex-1">
        <div className="max-w-md mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <MenuCard
              icon={<Users className="w-5 h-5" />}
              label="Atletas"
              description="Gerenciar cadastros"
              onClick={() => navigate('/athletes')}
            />
            <MenuCard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Dashboard"
              description="Ranking do grupo"
              onClick={() => navigate('/group')}
            />
            <MenuCard
              icon={<History className="w-5 h-5" />}
              label="Histórico"
              description="Testes realizados"
              onClick={() => navigate('/history')}
            />
            <MenuCard
              icon={<Settings className="w-5 h-5" />}
              label="Configurações"
              description="Áudio e conta"
              onClick={() => navigate('/settings')}
            />
          </div>

          <button
            onClick={() => navigate('/about')}
            className="w-full glass-card p-4 flex items-center gap-3 text-left hover:shadow-md transition-all active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sobre o T-CAR</p>
              <p className="text-xs text-muted-foreground">Manual, publicações e downloads</p>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="pb-6 text-center">
        <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wider uppercase">
          T-CAR App
        </p>
      </footer>
    </div>
  );
}

function MenuCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass-card p-4 flex flex-col gap-2.5 text-left hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </button>
  );
}
