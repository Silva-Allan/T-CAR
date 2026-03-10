// ======================================================================
// T-CAR 2.0 — Tabela de Correção PV-TCAR
// ======================================================================
// REGRA DE OURO: Esta tabela é client-side para ser auditável e
// transparente. Nenhuma lógica científica fica no backend.
//
// pv_corrigido = PV_TABLE[level][totalReps]
//
// Nível 1: velocidade inicial 9.0 km/h, incremento 0.6 km/h por estágio
// Nível 2: velocidade inicial 12.0 km/h, incremento 0.6 km/h por estágio
// Cada estágio = 5 repetições
//
// A velocidade do estágio N = initialSpeed + (N-1) * 0.6
// A rep R do estágio N = rep global = (N-1)*5 + R
// PV corrigido para rep incompleta = velocidade do estágio anterior +
//   (reps no estágio incompleto / 5) * 0.6
// ======================================================================

/**
 * Gera a tabela PV-TCAR baseada no protocolo científico.
 *
 * Para cada rep global:
 * - Estágio = floor((rep-1) / 5) + 1
 * - Rep dentro do estágio = ((rep-1) % 5) + 1
 * - Se rep é a primeira do estágio (rep_in_stage=1):
 *     PV = velocidade do estágio anterior (estágio completo)
 *     + (1/5) * 0.6
 * - Generalizando: PV = initialSpeed + (estágio-2)*0.6 + (rep_in_stage/5)*0.6
 *   quando estágio > 1
 * - Para estágio 1: PV = initialSpeed + (rep_in_stage/5)*0.6 - 0.6
 *   Mas na prática, a rep 1 do estágio 1 começa com a velocidade base.
 *
 * Simplificação: PV para rep global R =
 *   initialSpeed + ((R-1)/5) * 0.6  (interpolação linear)
 */
function generatePVTable(
    initialSpeed: number,
    maxReps: number
): Record<number, number> {
    const table: Record<number, number> = {};
    for (let rep = 1; rep <= maxReps; rep++) {
        const stage = Math.floor((rep - 1) / 5) + 1;
        const repInStage = ((rep - 1) % 5) + 1;

        const stageEndVelocity = initialSpeed + (stage - 1) * 0.6;
        const repVelocity = stageEndVelocity - 0.6 + (repInStage * 0.12);

        table[rep] = Number(repVelocity.toFixed(1));
    }
    return table;
}

// Tabelas geradas pelo protocolo T-CAR
const PV_TABLE: Record<1 | 2, Record<number, number>> = {
    1: generatePVTable(9.0, 100),  // Nível 1: 9.0 km/h inicial, até 100 reps
    2: generatePVTable(12.0, 80),  // Nível 2: 12.0 km/h inicial, até 80 reps
};

class PVTableServiceClass {
    /**
     * Obtém o PV corrigido da tabela para um nível e número total de repetições.
     * Esta é a lookup principal usada ao finalizar um teste.
     */
    getCorrectedPV(level: 1 | 2, totalReps: number): number {
        const table = PV_TABLE[level];
        const maxRep = level === 1 ? 100 : 80;

        if (totalReps <= 0) return level === 1 ? 9.0 : 12.0;
        if (totalReps > maxRep) return table[maxRep];

        return table[totalReps] ?? 0;
    }

    /**
     * Retorna a tabela PV completa para um nível.
     * Útil para exibição e verificação.
     */
    getTable(level: 1 | 2): Record<number, number> {
        return { ...PV_TABLE[level] };
    }

    /**
     * Retorna o número máximo de repetições por nível.
     */
    getMaxReps(level: 1 | 2): number {
        return level === 1 ? 100 : 80;
    }

    /**
     * Calcula o total de repetições a partir dos estágios completos e
     * reps no último estágio incompleto.
     */
    calculateTotalReps(
        completedStages: number,
        completedRepsInLastStage: number,
        isLastStageComplete: boolean
    ): number {
        const fullStageReps = completedStages * 5;
        if (isLastStageComplete) {
            return fullStageReps;
        }
        return fullStageReps + completedRepsInLastStage;
    }
}

export const PVTableService = new PVTableServiceClass();
