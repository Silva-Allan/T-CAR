import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from '@/components/ui/sonner';

// Atualização é manual (registerType: "prompt"): nunca recarrega sozinho,
// para não interromper um teste em andamento em campo.
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Verifica por uma nova versão a cada hora enquanto o app está aberto.
      if (!registration) return;
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success('App pronto para uso offline', {
        description: 'Você já pode usar o T-CAR sem conexão com a internet.',
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast('Nova versão disponível', {
        description: 'Atualize quando não houver um teste em andamento.',
        duration: Infinity,
        action: {
          label: 'Atualizar',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}
