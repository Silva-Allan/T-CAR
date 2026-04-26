// ======================================================================
// T-CAR 2.0 — Serviço de Classificação PV-TCAR (Normativo)
// ======================================================================
// REGRA: Classificação baseada em Categoria (idade) e Posição.
// Tabelas normativas oficiais T-CAR (2026).
// ======================================================================

import { PVClassification, calculateCategory } from '@/models/types';

/**
 * Matriz Normativa T-CAR
 * Estrutura: [Categoria][Posição] = [P20, P40, P60, P80]
 * Valores representam o PV máximo (inclusive) para a faixa.
 */
const NORMATIVE_DATA: Record<string, Record<string, number[]>> = {
    'Sub-11': {
        'defender_central': [13.0, 13.6, 13.9, 14.4],
        'defender_wide': [13.2, 13.6, 14.3, 14.5],
        'midfielder': [13.0, 13.2, 13.5, 14.4],
        'forward': [13.1, 13.6, 14.2, 14.5],
        'center_forward': [13.1, 13.6, 14.2, 14.5], // Fallback para forward no Sub-11
    },
    'Sub-13': {
        'defender_central': [13.2, 13.9, 14.5, 15.2],
        'defender_wide': [13.6, 14.3, 14.9, 15.6],
        'midfielder': [13.4, 14.3, 14.9, 15.4],
        'forward': [13.4, 14.0, 14.6, 15.0],
        'center_forward': [13.4, 14.0, 14.6, 15.0],
    },
    'Sub-15': {
        'defender_central': [14.8, 15.2, 15.7, 16.3],
        'defender_wide': [15.1, 15.7, 16.2, 16.8],
        'midfielder': [15.0, 15.6, 16.0, 16.8],
        'forward': [15.0, 15.6, 16.0, 16.7],
        'center_forward': [15.0, 15.6, 16.0, 16.7],
    },
    'Sub-17': {
        'defender_central': [15.4, 15.8, 16.4, 16.9],
        'defender_wide': [15.7, 16.4, 16.9, 17.4],
        'midfielder': [15.8, 16.3, 16.7, 17.3],
        'forward': [15.7, 16.2, 16.6, 17.3],
        'center_forward': [15.7, 16.2, 16.6, 17.3],
    },
    'Sub-20': {
        'defender_central': [15.7, 16.3, 16.8, 17.3],
        'defender_wide': [16.3, 16.8, 17.4, 17.6],
        'midfielder': [16.1, 16.4, 17.0, 17.8],
        'forward': [15.7, 16.3, 16.8, 17.4],
        'center_forward': [15.7, 16.3, 16.8, 17.4],
    },
    'Profissional': {
        'defender_central': [15.6, 16.2, 16.6, 16.9],
        'defender_wide': [16.2, 16.8, 17.2, 17.5],
        'midfielder': [16.0, 16.6, 17.0, 17.5],
        'forward': [15.6, 16.2, 16.5, 17.2],
        'center_forward': [16.3, 16.8, 16.9, 17.6],
    },
};

/**
 * Escala de classificação unificada (5 níveis).
 */
const CLASSIFICATION_TIERS = [
    { label: 'classVeryLow', percentile: 20, color: '#EF4444' },    // P <= 20
    { label: 'classLow', percentile: 40, color: '#F97316' },         // P 21-40
    { label: 'classRegular', percentile: 60, color: '#F59E0B' },     // P 41-60
    { label: 'classHigh', percentile: 80, color: '#22C55E' },        // P 61-80
    { label: 'classVeryHigh', percentile: 99, color: '#006633' },    // P > 80
];

class ClassificationServiceClass {
    /**
     * Obtém a classificação PV-TCAR baseada nos dados do atleta e no PV atingido.
     */
    getClassification(
        level: number, // Mantido por assinatura, mas a nova regra usa PV absoluto corrigido
        pvCorrigido: number,
        athlete?: { birth_date?: string; birthDate?: string; position?: string }
    ): PVClassification {
        // 1. Identificar Categoria
        const bDate = athlete?.birth_date || athlete?.birthDate;
        const category = bDate ? calculateCategory(bDate) : 'Profissional'; // Default profissional se sem data

        // 2. Identificar Posição (Normalizar chaves)
        let position = athlete?.position || 'midfielder';
        
        // Mapeamento simples caso venha strings legadas/livres
        if (position.toLowerCase().includes('zagueiro') || position.toLowerCase().includes('defender_central')) position = 'defender_central';
        else if (position.toLowerCase().includes('lateral') || position.toLowerCase().includes('defender_wide')) position = 'defender_wide';
        else if (position.toLowerCase().includes('meio') || position.toLowerCase().includes('midfielder')) position = 'midfielder';
        else if (position.toLowerCase().includes('centroavante') || position.toLowerCase().includes('center_forward')) position = 'center_forward';
        else if (position.toLowerCase().includes('atacante') || position.toLowerCase().includes('forward')) position = 'forward';
        else position = 'midfielder'; // Fallback geral

        // 3. Buscar Tabela Específica
        const categoryData = NORMATIVE_DATA[category] || NORMATIVE_DATA['Profissional'];
        const thresholds = categoryData[position] || categoryData['midfielder'];

        // 4. Determinar Faixa
        // thresholds = [P20, P40, P60, P80]
        if (pvCorrigido <= thresholds[0]) return this.getTier(0);
        if (pvCorrigido <= thresholds[1]) return this.getTier(1);
        if (pvCorrigido <= thresholds[2]) return this.getTier(2);
        if (pvCorrigido <= thresholds[3]) return this.getTier(3);
        return this.getTier(4); // P > 80
    }

    private getTier(index: number): PVClassification {
        const tier = CLASSIFICATION_TIERS[index];
        return {
            label: tier.label,
            percentile: tier.percentile,
            color: tier.color,
        };
    }

    /**
     * Retorna todas as faixas para legenda.
     */
    getAllClassifications(): { label: string; percentile: number; color: string }[] {
        return CLASSIFICATION_TIERS.map(t => ({
            label: t.label,
            percentile: t.percentile,
            color: t.color,
        }));
    }
}

export const ClassificationService = new ClassificationServiceClass();
