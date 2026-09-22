// ======================================================================
// T-CAR 2.0 — Screen Lock Service
// ======================================================================
// Bloqueios de sistema durante execução do teste:
// - Wake Lock: mantém tela ligada
// - Orientation Lock: bloqueia rotação
// - Visibility Change: detecta interrupções
// ======================================================================

import { Logger } from '@/utils/Logger';

type VisibilityCallback = (isVisible: boolean) => void;

type OrientationLockType =
    | 'any'
    | 'natural'
    | 'landscape'
    | 'portrait'
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary';

class ScreenLockServiceClass {
    private wakeLock: WakeLockSentinel | null = null;
    private orientationLocked = false;
    private visibilityCallbacks: VisibilityCallback[] = [];
    private boundVisibilityHandler: (() => void) | null = null;
    // Verdadeiro enquanto um teste está em execução — usado para readquirir
    // Wake Lock/orientação automaticamente quando a aba volta a ficar visível
    // (o navegador libera o Wake Lock sozinho ao ocultar o documento, e nunca
    // o readquire por conta própria).
    private testActive = false;
    private boundReacquireHandler: (() => void) | null = null;

    /**
     * Solicita Wake Lock para manter a tela ligada durante o teste.
     */
    async requestWakeLock(): Promise<boolean> {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                Logger.log('Wake Lock ativado');

                // Re-adquirir wake lock se a tela for desbloqueada
                this.wakeLock.addEventListener('release', () => {
                    Logger.log('Wake Lock liberado');
                });

                return true;
            }
            Logger.warn('Wake Lock API não suportada');
            return false;
        } catch (error) {
            Logger.error('Erro ao solicitar Wake Lock:', error);
            return false;
        }
    }

    /**
     * Bloqueia a orientação da tela.
     */
    async lockOrientation(orientation: OrientationLockType = 'portrait'): Promise<boolean> {
        try {
            if (screen.orientation && 'lock' in screen.orientation) {
                // Usando assertion porque a API Screen Orientation pode não estar completa nos tipos padrão
                await (screen.orientation as any).lock(orientation);
                this.orientationLocked = true;
                Logger.log(`Orientação bloqueada: ${orientation}`);
                return true;
            }
            Logger.warn('Screen Orientation Lock não suportado');
            return false;
        } catch (error) {
            Logger.warn('Não foi possível bloquear orientação:', error);
            return false;
        }
    }

    /**
     * Registra callback para mudanças de visibilidade (detectar interrupções).
     * Retorna função de cleanup.
     */
    onVisibilityChange(callback: VisibilityCallback): () => void {
        this.visibilityCallbacks.push(callback);

        if (!this.boundVisibilityHandler) {
            this.boundVisibilityHandler = () => {
                const isVisible = !document.hidden;
                this.visibilityCallbacks.forEach(cb => cb(isVisible));
            };
            document.addEventListener('visibilitychange', this.boundVisibilityHandler);
        }

        return () => {
            this.visibilityCallbacks = this.visibilityCallbacks.filter(cb => cb !== callback);
            if (this.visibilityCallbacks.length === 0 && this.boundVisibilityHandler) {
                document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
                this.boundVisibilityHandler = null;
            }
        };
    }

    /**
     * Readquire Wake Lock e bloqueio de orientação se um teste ainda estiver
     * ativo. Chamado automaticamente ao voltar a ficar visível, e também pode
     * ser chamado por consumidores (ex: TestExecution) como reforço — é
     * idempotente e seguro de chamar múltiplas vezes.
     */
    async reacquireIfNeeded(): Promise<void> {
        if (!this.testActive) return;
        await this.requestWakeLock();
        if (this.orientationLocked) {
            await this.lockOrientation('portrait');
        }
    }

    /**
     * Libera todos os bloqueios.
     */
    async release(): Promise<void> {
        this.testActive = false;
        if (this.boundReacquireHandler) {
            document.removeEventListener('visibilitychange', this.boundReacquireHandler);
            this.boundReacquireHandler = null;
        }

        // Liberar Wake Lock
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                Logger.log('Wake Lock liberado');
            } catch (error) {
                Logger.error('Erro ao liberar Wake Lock:', error);
            }
        }

        // Desbloquear orientação
        if (this.orientationLocked) {
            try {
                if (screen.orientation && 'unlock' in screen.orientation) {
                    screen.orientation.unlock();
                    this.orientationLocked = false;
                    Logger.log('Orientação desbloqueada');
                }
            } catch (error) {
                Logger.warn('Erro ao desbloquear orientação:', error);
            }
        }

        // Limpar listeners de visibilidade
        if (this.boundVisibilityHandler) {
            document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
            this.boundVisibilityHandler = null;
            this.visibilityCallbacks = [];
        }
    }

    /**
     * Ativar todos os bloqueios para execução de teste.
     */
    async activateForTest(): Promise<{
        wakeLock: boolean;
        orientationLock: boolean;
    }> {
        this.testActive = true;

        if (!this.boundReacquireHandler) {
            this.boundReacquireHandler = () => {
                if (!document.hidden) {
                    this.reacquireIfNeeded();
                }
            };
            document.addEventListener('visibilitychange', this.boundReacquireHandler);
        }

        const [wakeLock, orientationLock] = await Promise.all([
            this.requestWakeLock(),
            this.lockOrientation('portrait'),
        ]);

        return { wakeLock, orientationLock };
    }
}

export const ScreenLockService = new ScreenLockServiceClass();
