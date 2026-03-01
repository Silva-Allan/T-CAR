// ======================================================================
// T-CAR 2.0 — Calculator Service (Atualizado)
// ======================================================================
// REGRA DE OURO: Toda lógica científica é client-side.
// ======================================================================

import { TestProtocol, calculateAge } from '@/models/types';
import { PVTableService } from './PVTableService';

class CalculatorServiceClass {
  /**
   * Calcula o PV bruto (Peak Velocity) baseado na fórmula original.
   * Se último estágio completo: PV = velocidade do último estágio completo
   * Se incompleto: PV = v + (ns / 5) × 0.6
   */
  calculateRawPV(
    protocol: TestProtocol,
    completedStages: number,
    completedRepsInLastStage: number,
    isLastStageComplete: boolean
  ): number {
    const lastCompleteStageVelocity = this.getSpeedAtStage(protocol, completedStages);

    if (isLastStageComplete) {
      return lastCompleteStageVelocity;
    }

    const incompleteStageFraction = (completedRepsInLastStage / 5) * 0.6;
    return Number((lastCompleteStageVelocity + incompleteStageFraction).toFixed(2));
  }

  /**
   * Calcula o PV corrigido usando a tabela de correção T-CAR.
   * pv_corrigido = PV_TABLE[level][totalReps]
   */
  calculateCorrectedPV(level: 1 | 2, totalReps: number): number {
    return PVTableService.getCorrectedPV(level, totalReps);
  }

  /**
   * Calcula o total de repetições.
   */
  calculateTotalReps(
    completedStages: number,
    completedRepsInLastStage: number,
    isLastStageComplete: boolean
  ): number {
    return PVTableService.calculateTotalReps(
      completedStages,
      completedRepsInLastStage,
      isLastStageComplete
    );
  }

  /**
   * Calcular FC (Frequência Cardíaca).
   * Se fc_final não foi medida → fc_estimada = 220 - idade
   * Se fc_final foi medida → fc_estimada = null
   */
  calculateFC(
    fcFinal: number | null | undefined,
    birthDate: string | undefined
  ): { fcFinal: number | null; fcEstimada: number | null } {
    if (fcFinal != null && fcFinal > 0) {
      return { fcFinal, fcEstimada: null };
    }

    if (birthDate) {
      const age = calculateAge(birthDate);
      return { fcFinal: null, fcEstimada: 220 - age };
    }

    return { fcFinal: null, fcEstimada: null };
  }

  /**
   * Velocidade em um estágio específico.
   */
  getSpeedAtStage(protocol: TestProtocol, stage: number): number {
    return Number((protocol.initialSpeed + (stage - 1) * protocol.speedIncrement).toFixed(1));
  }

  /**
   * Distância em um estágio específico.
   */
  getDistanceAtStage(protocol: TestProtocol, stage: number): number {
    return protocol.initialDistance + (stage - 1) * protocol.distanceIncrement;
  }

  /**
   * Distância total percorrida.
   */
  calculateTotalDistance(
    protocol: TestProtocol,
    completedStages: number,
    completedRepsInLastStage: number,
    isLastStageComplete: boolean
  ): number {
    let totalDistance = 0;

    for (let stage = 1; stage <= completedStages; stage++) {
      const stageDistance = this.getDistanceAtStage(protocol, stage);
      totalDistance += stageDistance * 2 * 5;
    }

    if (!isLastStageComplete && completedRepsInLastStage > 0) {
      const incompleteStageDistance = this.getDistanceAtStage(protocol, completedStages + 1);
      totalDistance += incompleteStageDistance * 2 * completedRepsInLastStage;
    }

    return totalDistance;
  }

  /**
   * Formatar tempo em MM:SS.
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Obter configuração do protocolo por nível.
   */
  getProtocol(level: 1 | 2): TestProtocol {
    return {
      level,
      initialSpeed: level === 1 ? 9.0 : 12.0,
      initialDistance: level === 1 ? 15 : 20,
      speedIncrement: 0.6,
      distanceIncrement: 1,
      repDuration: 18,
      repsPerStage: 5,
      stageDuration: 90,
    };
  }
}

export const CalculatorService = new CalculatorServiceClass();
