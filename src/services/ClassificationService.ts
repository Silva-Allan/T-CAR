// ======================================================================
// T-CAR 2.0 — Serviço de Classificação PV-TCAR
// ======================================================================
// REGRA: Usar APENAS o último teste válido.
// Exibir: classificação textual + percentil.
// NUNCA mostrar valor absoluto.
// ======================================================================

import { PVClassification } from '@/models/types';

/**
 * Tabela de classificação baseada em dados normativos do T-CAR.
 * Cada faixa define o PV máximo (inclusive) para aquela classificação.
 *
 * TODO: Substituir pelos valores exatos da pesquisa T-CAR quando disponíveis.
 * Os valores abaixo são baseados em dados normativos gerais de testes shuttle run.
 */
const CLASSIFICATION_TABLES: Record<1 | 2, { maxPV: number; label: string; percentile: number; color: string }[]> = {
    1: [
        { maxPV: 10.0, label: 'Muito Fraco', percentile: 5, color: '#EF4444' },
        { maxPV: 11.0, label: 'Fraco', percentile: 15, color: '#F97316' },
        { maxPV: 12.0, label: 'Abaixo da Média', percentile: 30, color: '#F59E0B' },
        { maxPV: 13.5, label: 'Médio', percentile: 50, color: '#EAB308' },
        { maxPV: 15.0, label: 'Bom', percentile: 70, color: '#84CC16' },
        { maxPV: 16.5, label: 'Muito Bom', percentile: 85, color: '#22C55E' },
        { maxPV: 18.0, label: 'Excelente', percentile: 95, color: '#006633' },
        { maxPV: Infinity, label: 'Elite', percentile: 99, color: '#006633' },
    ],
    2: [
        { maxPV: 13.0, label: 'Muito Fraco', percentile: 5, color: '#EF4444' },
        { maxPV: 14.0, label: 'Fraco', percentile: 15, color: '#F97316' },
        { maxPV: 15.0, label: 'Abaixo da Média', percentile: 30, color: '#F59E0B' },
        { maxPV: 16.5, label: 'Médio', percentile: 50, color: '#EAB308' },
        { maxPV: 18.0, label: 'Bom', percentile: 70, color: '#84CC16' },
        { maxPV: 19.5, label: 'Muito Bom', percentile: 85, color: '#22C55E' },
        { maxPV: 20.5, label: 'Excelente', percentile: 95, color: '#006633' },
        { maxPV: Infinity, label: 'Elite', percentile: 99, color: '#006633' },
    ],
};

class ClassificationServiceClass {
    /**
     * Obtém a classificação PV-TCAR baseada no nível e PV corrigido.
     * Usa apenas o último teste válido.
     */
    getClassification(level: 1 | 2, pvCorrigido: number): PVClassification {
        const table = CLASSIFICATION_TABLES[level];

        for (const tier of table) {
            if (pvCorrigido <= tier.maxPV) {
                return {
                    label: tier.label,
                    percentile: tier.percentile,
                    color: tier.color,
                };
            }
        }

        // Fallback (nunca deve chegar aqui)
        const last = table[table.length - 1];
        return {
            label: last.label,
            percentile: last.percentile,
            color: last.color,
        };
    }

    /**
     * Retorna todas as faixas de classificação para um nível.
     * Útil para exibição de legenda.
     */
    getAllClassifications(level: 1 | 2): { label: string; percentile: number; color: string }[] {
        return CLASSIFICATION_TABLES[level].map(t => ({
            label: t.label,
            percentile: t.percentile,
            color: t.color,
        }));
    }
}

export const ClassificationService = new ClassificationServiceClass();
