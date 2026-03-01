// ======================================================================
// T-CAR — Wake Lock Hook
// ======================================================================
// Mantém a tela ativa durante o teste usando a Screen Wake Lock API.
// Solicita wake lock quando o teste inicia, libera quando termina.
// ======================================================================

import { useRef, useCallback } from 'react';

export function useWakeLock() {
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);

    const requestWakeLock = useCallback(async () => {
        if (!('wakeLock' in navigator)) {
            console.warn('[WakeLock] Screen Wake Lock API não suportada neste dispositivo');
            return;
        }

        try {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
            console.log('[WakeLock] Tela mantida ativa');

            wakeLockRef.current.addEventListener('release', () => {
                console.log('[WakeLock] Wake lock liberado');
                wakeLockRef.current = null;
            });
        } catch (err: any) {
            console.warn('[WakeLock] Erro ao solicitar wake lock:', err.message);
        }
    }, []);

    const releaseWakeLock = useCallback(async () => {
        if (wakeLockRef.current) {
            try {
                await wakeLockRef.current.release();
                wakeLockRef.current = null;
                console.log('[WakeLock] Tela liberada');
            } catch (err: any) {
                console.warn('[WakeLock] Erro ao liberar wake lock:', err.message);
            }
        }
    }, []);

    const isActive = () => wakeLockRef.current !== null;

    return { requestWakeLock, releaseWakeLock, isActive };
}
