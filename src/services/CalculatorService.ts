import { TestProtocol } from '@/models/types';

class CalculatorServiceClass {
  /**
   * Calculate Peak Velocity (PV-TCAR)
   * If last stage is complete: PV = velocity of last complete stage
   * If last stage is incomplete: PV = v + (ns / 10) × 0.6
   * Where v = velocity of last complete stage, ns = completed reps in incomplete stage
   */
  calculatePeakVelocity(
    protocol: TestProtocol,
    completedStages: number,
    completedRepsInLastStage: number,
    isLastStageComplete: boolean
  ): number {
    const lastCompleteStageVelocity = this.getSpeedAtStage(protocol, completedStages);

    if (isLastStageComplete) {
      return lastCompleteStageVelocity;
    }

    // Incomplete stage calculation
    const incompleteStageFraction = (completedRepsInLastStage / 10) * 0.6;
    return Number((lastCompleteStageVelocity + incompleteStageFraction).toFixed(2));
  }

  /**
   * Get speed at a specific stage
   */
  getSpeedAtStage(protocol: TestProtocol, stage: number): number {
    return Number((protocol.initialSpeed + (stage - 1) * protocol.speedIncrement).toFixed(1));
  }

  /**
   * Get distance at a specific stage
   */
  getDistanceAtStage(protocol: TestProtocol, stage: number): number {
    return protocol.initialDistance + (stage - 1) * protocol.distanceIncrement;
  }

  /**
   * Calculate total distance covered
   */
  calculateTotalDistance(
    protocol: TestProtocol,
    completedStages: number,
    completedRepsInLastStage: number,
    isLastStageComplete: boolean
  ): number {
    let totalDistance = 0;

    // Add distance from fully completed stages
    for (let stage = 1; stage <= completedStages; stage++) {
      const stageDistance = this.getDistanceAtStage(protocol, stage);
      // Each stage has 5 reps, each rep is 2 directions (out and back)
      totalDistance += stageDistance * 2 * 5;
    }

    // Add distance from incomplete stage if applicable
    if (!isLastStageComplete && completedRepsInLastStage > 0) {
      const incompleteStageDistance = this.getDistanceAtStage(protocol, completedStages + 1);
      totalDistance += incompleteStageDistance * 2 * completedRepsInLastStage;
    }

    return totalDistance;
  }

  /**
   * Format time in MM:SS format
   */
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Get protocol configuration
   */
  getProtocol(level: 1 | 2): TestProtocol {
    return {
      level,
      initialSpeed: level === 1 ? 9.0 : 12.0,
      initialDistance: level === 1 ? 15 : 20,
      speedIncrement: 0.6,
      distanceIncrement: 1,
      repDuration: 18, // 6s going + 6s returning + 6s recovery
      repsPerStage: 5,
      stageDuration: 90,
    };
  }
}

export const CalculatorService = new CalculatorServiceClass();
