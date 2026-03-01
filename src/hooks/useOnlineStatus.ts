import { useState, useEffect, useRef } from 'react';

// Usa o Supabase como alvo do ping com mode:'no-cors'
// Qualquer resposta (mesmo opaque) = internet funcionando
// fetch() que lança exceção = sem internet real
const PING_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://www.google.com'}`;
const PING_INTERVAL_MS = 8000; // verifica a cada 8 segundos
const PING_TIMEOUT_MS = 4000; // timeout de 4 segundos

async function checkRealConnectivity(): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

        await fetch(PING_URL, {
            method: 'HEAD',
            mode: 'no-cors',   // evita erro de CORS — fetch retorna resposta opaque
            cache: 'no-store',
            signal: controller.signal,
        });

        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
}

/**
 * Hook reativo para status de conexão COM INTERNET REAL.
 *
 * - Escuta online/offline do browser (resposta imediata a desconexão total)
 * - Faz ping periódico para confirmar que há acesso à internet de verdade
 * - Resolve o caso onde navigator.onLine = true mas o WiFi não tem internet
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const intervalRef = useRef<number | null>(null);

    const probe = async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return;
        }
        const real = await checkRealConnectivity();
        setIsOnline(real);
    };

    useEffect(() => {
        // Checar imediatamente
        probe();

        // Ouvir eventos do browser (resposta rápida)
        const handleOnline = () => probe();
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Ping periódico para detectar "WiFi sem internet"
        intervalRef.current = window.setInterval(probe, PING_INTERVAL_MS);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return isOnline;
}
