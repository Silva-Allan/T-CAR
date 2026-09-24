import { useEffect, useRef } from 'react';
import { toast } from '@/components/ui/sonner';
import { Logger } from '@/utils/Logger';

const SEEN_KEY = 'pwa_install_prompt_seen';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Sugere instalar o app na tela inicial. No Android/Chrome existe um botão
// real de instalação (evento `beforeinstallprompt`); no iOS Safari essa API
// não existe — a Apple nunca implementou —, então só dá pra mostrar a
// instrução manual (Compartilhar → Adicionar à Tela de Início). Aparece
// uma única vez por aparelho, e nunca se o app já estiver instalado.
export function PwaInstallPrompt() {
  const deferredEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(SEEN_KEY)) return;

    if (isIosSafari()) {
      toast('Instale o T-CAR na tela inicial', {
        description: 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".',
        duration: 10000,
      });
      localStorage.setItem(SEEN_KEY, 'true');
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredEventRef.current = e as BeforeInstallPromptEvent;
      localStorage.setItem(SEEN_KEY, 'true');

      toast('Instalar o T-CAR', {
        description: 'Acesso rápido direto da tela inicial, sem precisar abrir o navegador.',
        duration: Infinity,
        action: {
          label: 'Instalar',
          onClick: async () => {
            try {
              await deferredEventRef.current?.prompt();
            } catch (error) {
              Logger.warn('[PWA] Erro ao solicitar instalação:', error);
            }
            deferredEventRef.current = null;
          },
        },
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  return null;
}
