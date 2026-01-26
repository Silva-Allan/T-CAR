import { BeepType } from '@/models/types';

class AudioServiceClass {
  private audioContext: AudioContext | null = null;
  private volume: number = 0.8;
  private beepType: BeepType = 'standard';
  private isInitialized: boolean = false;

  async initialize(): Promise<boolean> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      return false;
    }
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  setBeepType(type: BeepType): void {
    this.beepType = type;
  }

  private createBeep(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playBeep(): void {
    if (!this.audioContext) return;

    switch (this.beepType) {
      case 'standard':
        this.createBeep(880, 0.15, 'sine');
        break;
      case 'high':
        this.createBeep(1200, 0.12, 'sine');
        break;
      case 'double':
        this.createBeep(880, 0.08, 'sine');
        setTimeout(() => this.createBeep(880, 0.08, 'sine'), 100);
        break;
    }
  }

  playStageBeep(): void {
    if (!this.audioContext) return;
    
    // Triple beep for new stage
    this.createBeep(1000, 0.1, 'sine');
    setTimeout(() => this.createBeep(1000, 0.1, 'sine'), 120);
    setTimeout(() => this.createBeep(1200, 0.15, 'sine'), 240);
  }

  playEndBeep(): void {
    if (!this.audioContext) return;
    
    // Descending tones for test end
    this.createBeep(800, 0.2, 'sine');
    setTimeout(() => this.createBeep(600, 0.2, 'sine'), 250);
    setTimeout(() => this.createBeep(400, 0.3, 'sine'), 500);
  }

  playFailBeep(): void {
    if (!this.audioContext) return;
    
    this.createBeep(300, 0.3, 'square');
  }

  async testAudio(): Promise<void> {
    await this.resume();
    this.playBeep();
  }

  getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

export const AudioService = new AudioServiceClass();
