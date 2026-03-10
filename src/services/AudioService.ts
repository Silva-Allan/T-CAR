// ======================================================================
// T-CAR 2.0 — Audio Service (Atualizado)
// ======================================================================
// Áudio principal do protocolo T-CAR via MP3 (beep.mp3).
// O MP3 contém todos os bips e falas no tempo correto.
// Controle: play/pause/resume/stop sincronizado com o teste.
// Web Audio API como fallback para tons sintetizados (falha, fim).
// ======================================================================

class AudioServiceClass {
  private audioContext: AudioContext | null = null;
  private volume = 0.8;
  private instructionAudio: HTMLAudioElement | null = null;

  // Master protocol audio — the main MP3 with all beeps timed
  private protocolAudio: HTMLAudioElement | null = null;
  private protocolLoaded = false;
  private isProtocolPlaying = false;

  private permissionGranted = false;

  /**
   * Inicializa o AudioContext e pré-carrega o áudio do protocolo.
   * DEVE ser chamado em resposta a interação do usuário (click/touch).
   */
  async initialize(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Pre-load the protocol audio
      await this.loadProtocolAudio();

      this.permissionGranted = true;
      return true;
    } catch (error) {
      console.error('Erro ao inicializar AudioContext:', error);
      return false;
    }
  }

  /**
   * Resume o AudioContext (necessário após autoplay policy).
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Verifica se permissão de áudio foi concedida.
   */
  hasPermission(): boolean {
    return this.permissionGranted && this.audioContext?.state === 'running';
  }

  /**
   * Solicita permissão de áudio.
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      await this.audioContext.resume();
      await this.loadProtocolAudio();
      this.permissionGranted = true;
      return true;
    } catch {
      return false;
    }
  }

  // ====================================================================
  // Protocol Audio (Master audio — single MP3 with all timed beeps)
  // ====================================================================

  /**
   * Pré-carrega o áudio do protocolo T-CAR.
   */
  private async loadProtocolAudio(): Promise<void> {
    if (this.protocolLoaded) return;

    try {
      this.protocolAudio = new Audio('/audio/beep.mp3');
      this.protocolAudio.volume = this.volume;
      this.protocolAudio.preload = 'auto';

      await new Promise<void>((resolve) => {
        if (!this.protocolAudio) return resolve();
        this.protocolAudio.addEventListener('canplaythrough', () => {
          this.protocolLoaded = true;
          console.log('[AudioService] Áudio do protocolo carregado');
          resolve();
        }, { once: true });
        this.protocolAudio.addEventListener('error', () => {
          console.warn('[AudioService] Áudio do protocolo não encontrado');
          this.protocolAudio = null;
          resolve();
        }, { once: true });
        this.protocolAudio.load();
      });
    } catch (error) {
      console.warn('Erro ao carregar áudio do protocolo:', error);
      this.protocolAudio = null;
    }
  }

  /**
   * Inicia a reprodução do áudio do protocolo (do início).
   * Chamado quando o teste começa.
   * Se já estiver tocando, NÃO reinicia (previne duplicação).
   */
  startProtocolAudio(): void {
    if (!this.protocolAudio) return;
    if (this.isProtocolPlaying) {
      console.warn('[AudioService] Áudio do protocolo já está tocando');
      return;
    }

    this.protocolAudio.currentTime = 0;
    this.protocolAudio.volume = this.volume;
    this.protocolAudio.play()
      .then(() => {
        this.isProtocolPlaying = true;
        console.log('[AudioService] Áudio do protocolo iniciado');
      })
      .catch(err => {
        console.error('[AudioService] Erro ao iniciar áudio:', err);
      });
  }

  /**
   * Pausa o áudio do protocolo.
   * Chamado quando o teste é pausado.
   */
  pauseProtocolAudio(): void {
    if (!this.protocolAudio || !this.isProtocolPlaying) return;
    this.protocolAudio.pause();
    console.log('[AudioService] Áudio do protocolo pausado em:', this.protocolAudio.currentTime.toFixed(1) + 's');
  }

  /**
   * Retoma o áudio do protocolo.
   * Chamado quando o teste é retomado.
   */
  resumeProtocolAudio(): void {
    if (!this.protocolAudio || !this.isProtocolPlaying) return;
    this.protocolAudio.play().catch(err => {
      console.warn('[AudioService] Erro ao retomar áudio:', err);
    });
  }

  /**
   * Para o áudio do protocolo completamente.
   * Chamado quando o teste termina ou é cancelado.
   */
  stopProtocolAudio(): void {
    if (!this.protocolAudio) return;
    this.protocolAudio.pause();
    this.protocolAudio.currentTime = 0;
    this.isProtocolPlaying = false;
    console.log('[AudioService] Áudio do protocolo parado');
  }

  /**
   * Retorna o currentTime do áudio do protocolo (para sincronizar timer).
   */
  getProtocolAudioTime(): number {
    if (!this.protocolAudio || !this.isProtocolPlaying) return -1;
    return this.protocolAudio.currentTime;
  }

  /**
   * Verifica se o áudio do protocolo está carregado.
   */
  isProtocolAudioLoaded(): boolean {
    return this.protocolLoaded && this.protocolAudio !== null;
  }

  /**
   * Verifica se o áudio do protocolo está tocando.
   */
  isProtocolAudioPlaying(): boolean {
    return this.isProtocolPlaying;
  }

  // ====================================================================
  // Instruction Audio
  // ====================================================================

  async loadInstructionAudio(level: 1 | 2): Promise<void> {
    try {
      const audioPath = `/audio/instructions_level_${level}.mp3`;
      this.instructionAudio = new Audio(audioPath);
      this.instructionAudio.volume = this.volume;

      await new Promise<void>((resolve) => {
        if (!this.instructionAudio) return resolve();
        this.instructionAudio.addEventListener('canplaythrough', () => resolve(), { once: true });
        this.instructionAudio.addEventListener('error', () => {
          console.warn(`[AudioService] Instrução MP3 não encontrada em: ${audioPath}`);
          this.instructionAudio = null;
          resolve();
        }, { once: true });
        this.instructionAudio.load();
      });
    } catch (error) {
      console.warn('Erro ao carregar áudio de instrução:', error);
      this.instructionAudio = null;
    }
  }

  async playInstruction(): Promise<void> {
    if (!this.instructionAudio) return;
    try {
      this.instructionAudio.currentTime = 0;
      await this.instructionAudio.play();
    } catch (error) {
      console.warn('Erro ao tocar instrução:', error);
    }
  }

  stopInstruction(): void {
    if (this.instructionAudio) {
      this.instructionAudio.pause();
      this.instructionAudio.currentTime = 0;
    }
  }

  // ====================================================================
  // BIPs de Evento (falha, fim — sons que NÃO estão no MP3)
  // ====================================================================

  /**
   * Toca BIP de falha — tom grave sintetizado (não está no áudio principal).
   */
  playFailBeep(): void {
    this.playTone(330, 0.3, this.volume);
  }

  /**
   * Toca BIP de fim de teste — sequência descendente sintetizada.
   */
  playEndBeep(): void {
    this.playTone(880, 0.2, this.volume);
    setTimeout(() => this.playTone(660, 0.2, this.volume), 200);
    setTimeout(() => this.playTone(440, 0.3, this.volume), 400);
  }

  /**
   * Toca um tom sintetizado via Web Audio API.
   */
  private playTone(frequency: number, duration: number, volume: number): void {
    if (!this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.error('Erro ao reproduzir tom:', error);
    }
  }

  /**
   * Testa o áudio — toca um bip sintetizado rápido.
   */
  async testAudio(): Promise<void> {
    await this.resume();
    this.playTone(880, 0.15, this.volume * 0.7);
  }

  // ====================================================================
  // Backward compatibility — keep playBeep/playStageBeep as no-ops
  // since the protocol audio handles all beeps now.
  // ====================================================================

  playBeep(): void {
    // No-op: beeps now come from the protocol audio MP3
  }

  playStageBeep(): void {
    // No-op: stage changes come from the protocol audio MP3
  }

  // ====================================================================
  // Configurações
  // ====================================================================

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.instructionAudio) {
      this.instructionAudio.volume = this.volume;
    }
    if (this.protocolAudio) {
      this.protocolAudio.volume = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }
}

export const AudioService = new AudioServiceClass();
