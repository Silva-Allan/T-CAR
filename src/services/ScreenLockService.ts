// ======================================================================
// T-CAR 2.0 — Screen Lock Service
// ======================================================================
// Bloqueios de sistema durante execução do teste:
// - Wake Lock: mantém tela ligada
// - Orientation Lock: bloqueia rotação
// - Visibility Change: detecta interrupções
// ======================================================================

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

    /**
     * Solicita Wake Lock para manter a tela ligada durante o teste.
     */
    async requestWakeLock(): Promise<boolean> {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock ativado');

                // Re-adquirir wake lock se a tela for desbloqueada
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock liberado');
                });

                return true;
            }
            console.warn('Wake Lock API não suportada');
            return false;
        } catch (error) {
            console.error('Erro ao solicitar Wake Lock:', error);
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
                console.log(`Orientação bloqueada: ${orientation}`);
                return true;
            }
            console.warn('Screen Orientation Lock não suportado');
            return false;
        } catch (error) {
            console.warn('Não foi possível bloquear orientação:', error);
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
     * Libera todos os bloqueios.
     */
    async release(): Promise<void> {
        // Liberar Wake Lock
        if (this.wakeLock) {
            try {
                await this.wakeLock.release();
                this.wakeLock = null;
                console.log('Wake Lock liberado');
            } catch (error) {
                console.error('Erro ao liberar Wake Lock:', error);
            }
        }

        // Desbloquear orientação
        if (this.orientationLocked) {
            try {
                if (screen.orientation && 'unlock' in screen.orientation) {
                    screen.orientation.unlock();
                    this.orientationLocked = false;
                    console.log('Orientação desbloqueada');
                }
            } catch (error) {
                console.warn('Erro ao desbloquear orientação:', error);
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
        const [wakeLock, orientationLock] = await Promise.all([
            this.requestWakeLock(),
            this.lockOrientation('portrait'),
        ]);

        return { wakeLock, orientationLock };
    }
}

export const ScreenLockService = new ScreenLockServiceClass();
