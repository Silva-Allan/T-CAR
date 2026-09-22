// ======================================================================
// T-CAR 2.0 — Audio Service (Atualizado)
// ======================================================================
// Áudio principal do protocolo T-CAR via MP3 (Audio T-car 10 BPM_BR.mp3).
// O MP3 contém todos os bips e falas no tempo correto.
// Controle: play/pause/resume/stop sincronizado com o teste.
// Web Audio API como fallback para tons sintetizados (falha, fim).
// ======================================================================

import { Logger } from '@/utils/Logger';
import { AUDIO_INTRO_OFFSET } from '@/constants/audio';

const PROTOCOL_AUDIO_FILES: Record<string, string> = {
  pt: '/audio/Audio T-car 10 BPM_BR.mp3',
  en: '/audio/Audio T-Car 10 BPM_ Eng.mp3',
  es: '/audio/Audio T-car 10 BPM_Esp.mp3',
};

class AudioServiceClass {
  private audioContext: AudioContext | null = null;
  private volume = 0.8;
  private instructionAudio: HTMLAudioElement | null = null;

  // Master protocol audio — the main MP3 with all beeps timed
  private protocolAudio: HTMLAudioElement | null = null;
  private protocolLoaded = false;
  private isProtocolPlaying = false;
  private currentLanguage = 'pt';

  // Estado de resiliência: distingue pausa deliberada do app de uma
  // interrupção externa (queda de rede, troca de rota de Bluetooth, etc.)
  // e tenta religar o áudio automaticamente quando as condições melhoram.
  private appInitiatedPause = false;
  private testInProgress = false;
  private needsReloadOnRecovery = false;
  private elapsedProvider: (() => number) | null = null;
  private recoveryIntervalId: number | null = null;
  private warmedLanguages = new Set<string>();

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
      Logger.error('Erro ao inicializar AudioContext:', error);
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
   * Define o idioma do áudio do protocolo e recarrega se necessário.
   */
  async setLanguage(lang: string): Promise<void> {
    if (this.currentLanguage === lang && this.protocolLoaded) return;
    if (this.isProtocolPlaying) return;
    this.currentLanguage = lang;
    this.protocolLoaded = false;
    this.protocolAudio = null;
    await this.loadProtocolAudio();
  }

  /**
   * Pré-carrega o áudio do protocolo T-CAR.
   */
  private async loadProtocolAudio(): Promise<void> {
    if (this.protocolLoaded) return;

    const audioFile = PROTOCOL_AUDIO_FILES[this.currentLanguage] ?? PROTOCOL_AUDIO_FILES['pt'];
    try {
      this.protocolAudio = new Audio(audioFile);
      this.protocolAudio.volume = this.volume;
      this.protocolAudio.preload = 'auto';
      this.attachPlaybackWatchers(this.protocolAudio);

      await new Promise<void>((resolve) => {
        if (!this.protocolAudio) return resolve();
        this.protocolAudio.addEventListener('canplaythrough', () => {
          this.protocolLoaded = true;
          Logger.log('[AudioService] Áudio do protocolo carregado');
          resolve();
        }, { once: true });
        this.protocolAudio.addEventListener('error', () => {
          Logger.warn('[AudioService] Áudio do protocolo não encontrado');
          this.protocolAudio = null;
          resolve();
        }, { once: true });
        this.protocolAudio.load();
      });
    } catch (error) {
      Logger.warn('Erro ao carregar áudio do protocolo:', error);
      this.protocolAudio = null;
    }
  }

  /**
   * Escuta o estado real do elemento de áudio durante a reprodução, para
   * detectar interrupções que o app não causou (queda de rede, troca de
   * rota de Bluetooth, erro de mídia) e nunca depender só da flag interna
   * `isProtocolPlaying` — que sozinha pode ficar "true" para sempre mesmo
   * com o áudio de fato parado.
   */
  private attachPlaybackWatchers(audio: HTMLAudioElement): void {
    const markStalled = (reason: string) => {
      if (this.appInitiatedPause) return; // pausa deliberada, não é interrupção
      if (this.isProtocolPlaying) {
        Logger.warn(`[AudioService] Interrupção externa detectada (${reason}) — cronômetro cai para relógio de parede`);
      }
      this.isProtocolPlaying = false;
    };

    audio.addEventListener('pause', () => markStalled('pause'));
    audio.addEventListener('stalled', () => markStalled('stalled'));
    audio.addEventListener('waiting', () => markStalled('waiting'));
    audio.addEventListener('error', () => {
      this.needsReloadOnRecovery = true;
      markStalled('error');
    });
    audio.addEventListener('ended', () => markStalled('ended'));
    audio.addEventListener('playing', () => {
      if (!this.testInProgress) return;
      this.isProtocolPlaying = true;
      this.updateMediaSession('playing');
    });
  }

  /**
   * Inicia a reprodução do áudio do protocolo (do início).
   * Chamado quando o teste começa.
   * Se já estiver tocando, NÃO reinicia (previne duplicação).
   */
  startProtocolAudio(): void {
    if (!this.protocolAudio) return;
    if (this.isProtocolPlaying) {
      Logger.warn('[AudioService] Áudio do protocolo já está tocando');
      return;
    }

    this.protocolAudio.currentTime = 0;
    this.protocolAudio.volume = this.volume;
    this.testInProgress = true;
    this.needsReloadOnRecovery = false;
    this.protocolAudio.play()
      .then(() => {
        this.isProtocolPlaying = true;
        this.updateMediaSession('playing');
        Logger.log('[AudioService] Áudio do protocolo iniciado');
      })
      .catch(err => {
        Logger.error('[AudioService] Erro ao iniciar áudio:', err);
      });

    if (this.recoveryIntervalId === null) {
      this.recoveryIntervalId = window.setInterval(() => this.attemptRecovery(), 2000);
    }
  }

  /**
   * Pausa o áudio do protocolo.
   * Chamado quando o teste é pausado.
   */
  pauseProtocolAudio(): void {
    if (!this.protocolAudio || !this.isProtocolPlaying) return;
    this.appInitiatedPause = true;
    this.protocolAudio.pause();
    this.appInitiatedPause = false;
    this.updateMediaSession('paused');
    Logger.log('[AudioService] Áudio do protocolo pausado em:', this.protocolAudio.currentTime.toFixed(1) + 's');
  }

  /**
   * Retoma o áudio do protocolo.
   * Chamado quando o teste é retomado.
   */
  resumeProtocolAudio(): void {
    if (!this.protocolAudio || !this.isProtocolPlaying) return;
    this.protocolAudio.play()
      .then(() => this.updateMediaSession('playing'))
      .catch(err => {
        Logger.warn('[AudioService] Erro ao retomar áudio:', err);
      });
  }

  /**
   * Para o áudio do protocolo completamente.
   * Chamado quando o teste termina ou é cancelado.
   */
  stopProtocolAudio(): void {
    this.testInProgress = false;
    this.needsReloadOnRecovery = false;
    this.elapsedProvider = null;
    if (this.recoveryIntervalId !== null) {
      clearInterval(this.recoveryIntervalId);
      this.recoveryIntervalId = null;
    }

    if (!this.protocolAudio) return;
    this.appInitiatedPause = true;
    this.protocolAudio.pause();
    this.appInitiatedPause = false;
    this.protocolAudio.currentTime = 0;
    this.isProtocolPlaying = false;
    this.updateMediaSession('none');
    Logger.log('[AudioService] Áudio do protocolo parado');
  }

  /**
   * Fornece ao AudioService o `elapsed` mais recente do motor do teste,
   * usado para religar o áudio no ponto certo após uma interrupção.
   */
  setElapsedProvider(getElapsed: () => number): void {
    this.elapsedProvider = getElapsed;
  }

  /**
   * Marca o áudio como travado por causa externa (chamado pelo watchdog
   * do motor do teste, como reforço aos listeners nativos em situações
   * em que nenhum evento de mídia chegou a disparar).
   */
  markExternallyStalled(): void {
    this.isProtocolPlaying = false;
  }

  /**
   * Tenta religar o áudio do protocolo depois de uma interrupção externa
   * (queda de rede, troca de rota de Bluetooth, erro de mídia). Reposiciona
   * sempre pelo `elapsed` ao vivo do motor do teste — nunca continua do
   * `currentTime` congelado antigo, o que evitaria pular ou duplicar bipes.
   * Roda a cada 2s enquanto o teste estiver em andamento; falhas (ex: ainda
   * sem rede) são silenciosas e a próxima tentativa cobre o caso.
   */
  private attemptRecovery(): void {
    if (!this.testInProgress || !this.protocolAudio || this.isProtocolPlaying) return;

    if (this.needsReloadOnRecovery) {
      this.protocolAudio.load();
      this.needsReloadOnRecovery = false;
    }

    const target = (this.elapsedProvider?.() ?? 0) + AUDIO_INTRO_OFFSET;
    this.protocolAudio.currentTime = Math.max(0, target);
    this.protocolAudio.volume = this.volume;
    this.protocolAudio.play()
      .then(() => {
        this.isProtocolPlaying = true;
        this.updateMediaSession('playing');
        Logger.log(`[AudioService] Recuperado, retomando em ${target.toFixed(1)}s`);
      })
      .catch(() => {
        // Ainda sem condições (rede/BT) — a próxima tentativa em 2s cobre isso.
      });
  }

  /**
   * Garante que o MP3 do protocolo do idioma informado esteja completamente
   * em cache (Service Worker) antes que o teste precise dele — assim a
   * reprodução durante o teste não depende de fetches de rede ao vivo.
   * Chamado o mais cedo possível (na entrada do app), não bloqueia nada:
   * falhas caem de volta no comportamento atual sob demanda.
   */
  async ensureFullyCached(lang?: string): Promise<void> {
    const targetLang = lang ?? this.currentLanguage;
    if (this.warmedLanguages.has(targetLang)) return;

    const audioFile = PROTOCOL_AUDIO_FILES[targetLang] ?? PROTOCOL_AUDIO_FILES['pt'];
    try {
      const response = await fetch(audioFile);
      if (response.ok) {
        await response.arrayBuffer();
        this.warmedLanguages.add(targetLang);
        Logger.log(`[AudioService] Áudio do protocolo (${targetLang}) pré-aquecido em cache`);
      }
    } catch (error) {
      Logger.warn('[AudioService] Falha ao pré-aquecer áudio do protocolo:', error);
    }
  }

  /**
   * Sincroniza a Media Session com o estado real de playback do protocolo.
   * Áudio ativamente tocando com uma Media Session registrada é uma das
   * poucas coisas que o navegador confiavelmente isenta de suspensão em
   * segundo plano — é o que mantém o protocolo tocando com a tela apagada
   * ou o app minimizado, e mostra um controle de mídia na tela de bloqueio.
   *
   * De propósito, NÃO registra handlers de 'play'/'pause': o teste só pode
   * ser pausado por uma ação deliberada dentro do app — nunca por um toque
   * acidental no controle de mídia da tela de bloqueio ou de um fone Bluetooth.
   */
  private updateMediaSession(state: 'playing' | 'paused' | 'none'): void {
    if (!('mediaSession' in navigator)) return;
    try {
      if (state !== 'none' && !navigator.mediaSession.metadata) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'T-CAR — Teste em andamento',
          artist: 'T-CAR',
        });
      } else if (state === 'none') {
        navigator.mediaSession.metadata = null;
      }
      navigator.mediaSession.playbackState = state;
    } catch (error) {
      Logger.warn('[AudioService] Erro ao atualizar Media Session:', error);
    }
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
          Logger.warn(`[AudioService] Instrução MP3 não encontrada em: ${audioPath}`);
          this.instructionAudio = null;
          resolve();
        }, { once: true });
        this.instructionAudio.load();
      });
    } catch (error) {
      Logger.warn('Erro ao carregar áudio de instrução:', error);
      this.instructionAudio = null;
    }
  }

  async playInstruction(): Promise<void> {
    if (!this.instructionAudio) return;
    try {
      this.instructionAudio.currentTime = 0;
      await this.instructionAudio.play();
    } catch (error) {
      Logger.warn('Erro ao tocar instrução:', error);
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
  async playFailBeep(): Promise<void> {
    await this.resume();
    this.playTone(330, 0.3, this.volume);
  }

  /**
   * Toca BIP de fim de teste — sequência descendente sintetizada.
   */
  async playEndBeep(): Promise<void> {
    await this.resume();
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
      Logger.error('Erro ao reproduzir tom:', error);
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
