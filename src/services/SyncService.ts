// ======================================================================
// T-CAR 2.0 — Sync Service
// ======================================================================
// Gerencia sincronização automática de testes criados offline.
// Monitora status online/offline e sincroniza quando reconecta.
// ======================================================================

import { IndexedDBService } from './IndexedDBService';
import { SupabaseService } from './SupabaseService';

type SyncStatusListener = (status: SyncStatus) => void;

export interface SyncStatus {
    isOnline: boolean;
    pendingCount: number;
    isSyncing: boolean;
    lastSyncAt: string | null;
    lastError: string | null;
}

// ── Logging helper ──────────────────────────────────────────────────────
const LOG = (msg: string, data?: any) => {
    const ts = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    if (data !== undefined) {
        console.log(`[SyncService ${ts}] ${msg}`, data);
    } else {
        console.log(`[SyncService ${ts}] ${msg}`);
    }
};

class SyncServiceClass {
    private listeners: SyncStatusListener[] = [];
    private isSyncing = false;
    private lastSyncAt: string | null = null;
    private lastError: string | null = null;
    private isMonitoring = false;

    /**
     * Inicia monitoramento de conectividade e sincronização automática.
     */
    async startMonitoring(): Promise<void> {
        if (this.isMonitoring) return;
        this.isMonitoring = true;

        await IndexedDBService.init();

        const isOnline = navigator.onLine;
        LOG(`Monitoramento iniciado. Status de rede: ${isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`);

        window.addEventListener('online', () => {
            LOG('🟢 ONLINE — Conexão restaurada. Iniciando sincronização de pendentes...');
            this.notifyListeners();
            this.syncPending();
        });

        window.addEventListener('offline', () => {
            LOG('🔴 OFFLINE — Conexão perdida. Modo offline ativo. Dados serão salvos localmente.');
            this.notifyListeners();
        });

        // Tentar sincronizar pendentes ao iniciar
        if (navigator.onLine) {
            const pending = await IndexedDBService.getPendingSyncCount();
            if (pending > 0) {
                LOG(`⏳ Encontrados ${pending} item(ns) pendente(s) ao iniciar. Sincronizando...`);
                this.syncPending();
            } else {
                LOG('✅ Nenhum item pendente. Sincronizado.');
            }
        } else {
            const pending = await IndexedDBService.getPendingSyncCount();
            LOG(`🔴 Modo OFFLINE — ${pending} item(ns) na fila. Sincronização adiada até reconectar.`);
        }
    }

    /**
     * Verifica se está online.
     */
    isOnline(): boolean {
        return navigator.onLine;
    }

    /**
     * Adiciona um listener para mudanças no status de sincronização.
     */
    onStatusChange(listener: SyncStatusListener): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Sincroniza todos os testes pendentes.
     */
    async syncPending(): Promise<void> {
        if (this.isSyncing) {
            LOG('⏸ Sincronização já em progresso. Chamada duplicada ignorada.');
            return;
        }
        if (!navigator.onLine) {
            LOG('🔴 Tentativa de sincronização ignorada — OFFLINE.');
            return;
        }

        this.isSyncing = true;
        this.notifyListeners();

        try {
            const pending = await IndexedDBService.getPendingSyncs();
            LOG(`🔄 Sincronização iniciada: ${pending.length} item(ns) pendente(s).`);

            if (pending.length === 0) {
                LOG('✅ Nada para sincronizar.');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            for (const item of pending) {
                try {
                    LOG(`📤 Enviando item ${item.id} (tentativa ${item.retryCount + 1}/5)...`, {
                        type: item.type,
                        dataHoraDoTeste: item.testData?.date,
                        nivel: item.testData?.protocol_level,
                        atletas: item.resultsData?.length,
                    });

                    if (item.type === 'test') {
                        await SupabaseService.createTest(item.testData, item.resultsData);
                        await IndexedDBService.removePendingSync(item.id);
                        successCount++;
                        LOG(`✅ Item ${item.id} sincronizado com sucesso.`);
                    }
                } catch (error) {
                    failCount++;
                    const errMsg = error instanceof Error ? error.message : String(error);
                    console.error(`[SyncService] ❌ Falha no item ${item.id}:`, error);
                    LOG(`❌ Erro no item ${item.id}: ${errMsg}`);
                    await IndexedDBService.incrementRetryCount(item.id);
                    this.lastError = errMsg;

                    if (item.retryCount >= 4) {
                        LOG(`⚠️ Item ${item.id} atingiu o limite de tentativas. Não será retentado automaticamente.`);
                    }
                }
            }

            this.lastSyncAt = new Date().toISOString();
            LOG(`🏁 Sincronização concluída: ✅ ${successCount} sucesso(s), ❌ ${failCount} falha(s).`);
        } catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            console.error('[SyncService] Erro geral:', error);
            LOG(`💥 Erro geral na sincronização: ${errMsg}`);
            this.lastError = errMsg;
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    /**
     * Salva um teste para sincronização posterior (quando offline).
     */
    async saveForLaterSync(
        testId: string,
        testData: any,
        resultsData: any[]
    ): Promise<void> {
        LOG(`💾 Salvando teste OFFLINE: ${testId}`, {
            dataHoraDoTeste: testData?.date,
            nivel: testData?.protocol_level,
            atletas: resultsData?.length,
        });
        await IndexedDBService.addToPendingSync({
            id: testId,
            type: 'test',
            testData,
            resultsData,
        });
        const total = await IndexedDBService.getPendingSyncCount();
        LOG(`📦 Fila offline agora tem ${total} item(ns) pendente(s).`);
        this.notifyListeners();
    }

    /**
     * Obtém o status atual de sincronização.
     */
    async getStatus(): Promise<SyncStatus> {
        const pendingCount = await IndexedDBService.getPendingSyncCount();
        return {
            isOnline: navigator.onLine,
            pendingCount,
            isSyncing: this.isSyncing,
            lastSyncAt: this.lastSyncAt,
            lastError: this.lastError,
        };
    }

    private async notifyListeners(): Promise<void> {
        const status = await this.getStatus();
        this.listeners.forEach(l => l(status));
    }
}

export const SyncService = new SyncServiceClass();
