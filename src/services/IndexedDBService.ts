// ======================================================================
// T-CAR 2.0 — IndexedDB Service (Offline-First)
// ======================================================================
// Armazenamento robusto para execução offline de testes.
// Usa IndexedDB (50MB+) ao invés de localStorage (5-10MB).
// ======================================================================

const DB_NAME = 'tcar_db';
const DB_VERSION = 1;

const STORES = {
    TEST_STATE: 'test_state',
    PENDING_SYNC: 'pending_sync',
    SETTINGS: 'settings',
} as const;

class IndexedDBServiceClass {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;

    /**
     * Inicializar IndexedDB.
     */
    async init(): Promise<void> {
        if (this.db) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Store para estado do teste durante execução
                if (!db.objectStoreNames.contains(STORES.TEST_STATE)) {
                    db.createObjectStore(STORES.TEST_STATE, { keyPath: 'id' });
                }

                // Store para testes pendentes de sincronização
                if (!db.objectStoreNames.contains(STORES.PENDING_SYNC)) {
                    const store = db.createObjectStore(STORES.PENDING_SYNC, { keyPath: 'id' });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Store para configurações
                if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                    db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };
        });

        return this.initPromise;
    }

    /**
     * Garantir que o DB está inicializado.
     */
    private async ensureDB(): Promise<IDBDatabase> {
        await this.init();
        if (!this.db) throw new Error('IndexedDB não inicializado');
        return this.db;
    }

    // ====================================================================
    // Estado do Teste (recuperação durante execução)
    // ====================================================================

    async saveTestState(testId: string, state: any): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.TEST_STATE, 'readwrite');
            const store = tx.objectStore(STORES.TEST_STATE);
            store.put({ id: testId, state, updatedAt: new Date().toISOString() });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getTestState(testId: string): Promise<any | null> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.TEST_STATE, 'readonly');
            const store = tx.objectStore(STORES.TEST_STATE);
            const request = store.get(testId);
            request.onsuccess = () => resolve(request.result?.state ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTestState(testId: string): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.TEST_STATE, 'readwrite');
            const store = tx.objectStore(STORES.TEST_STATE);
            store.delete(testId);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // ====================================================================
    // Fila de Sincronização Pendente
    // ====================================================================

    async addToPendingSync(item: {
        id: string;
        type: 'test';
        testData: any;
        resultsData: any[];
    }): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING_SYNC, 'readwrite');
            const store = tx.objectStore(STORES.PENDING_SYNC);
            store.put({
                ...item,
                createdAt: new Date().toISOString(),
                retryCount: 0,
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getPendingSyncs(): Promise<any[]> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING_SYNC, 'readonly');
            const store = tx.objectStore(STORES.PENDING_SYNC);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async removePendingSync(id: string): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING_SYNC, 'readwrite');
            const store = tx.objectStore(STORES.PENDING_SYNC);
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async incrementRetryCount(id: string): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING_SYNC, 'readwrite');
            const store = tx.objectStore(STORES.PENDING_SYNC);
            const request = store.get(id);
            request.onsuccess = () => {
                if (request.result) {
                    request.result.retryCount = (request.result.retryCount || 0) + 1;
                    store.put(request.result);
                }
            };
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getPendingSyncCount(): Promise<number> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.PENDING_SYNC, 'readonly');
            const store = tx.objectStore(STORES.PENDING_SYNC);
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ====================================================================
    // Configurações Offline
    // ====================================================================

    async saveSetting(key: string, value: any): Promise<void> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(STORES.SETTINGS);
            store.put({ key, value });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async getSetting(key: string): Promise<any | null> {
        const db = await this.ensureDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SETTINGS, 'readonly');
            const store = tx.objectStore(STORES.SETTINGS);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result?.value ?? null);
            request.onerror = () => reject(request.error);
        });
    }
}

export const IndexedDBService = new IndexedDBServiceClass();
