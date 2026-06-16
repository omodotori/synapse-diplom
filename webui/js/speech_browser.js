/**
 * WhisperMicrophoneInput — Whisper-based STT fallback (Firefox, etc.)
 *
 * Used when the browser does not support the Web Speech API (SpeechRecognition).
 * Uses Transformers.js (Xenova/whisper-*) + MediaRecorder + AudioContext.
 *
 * Interface is compatible with MicrophoneInput in speech-store.js:
 *   constructor(updateCallback, options)
 *   async initialize() → bool
 *   toggle()
 *   status (getter)
 *   messageSent
 *   async requestPermission() → bool
 */

import { pipeline, read_audio } from './transformers@3.0.2.js';

const Status = {
  INACTIVE: 'inactive',
  ACTIVATING: 'activating',
  LISTENING: 'listening',
  RECORDING: 'recording',
  WAITING: 'waiting',
  PROCESSING: 'processing',
};

export class WhisperMicrophoneInput {
  constructor(updateCallback, options = {}) {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.lastChunk = null;
    this.updateCallback = updateCallback;
    this.messageSent = false;

    // Audio analysis properties
    this.audioContext = null;
    this.mediaStreamSource = null;
    this.analyserNode = null;
    this._status = Status.INACTIVE;
    this.transcriber = null;

    // Timing properties
    this.lastAudioTime = null;
    this.waitingTimer = null;
    this.silenceStartTime = null;
    this.hasStartedRecording = false;
    this.analysisFrame = null;
    this.stream = null;

    this.options = {
      modelSize: 'tiny',
      language: 'en',
      silenceThreshold: 0.07,
      silenceDuration: 1000,
      waitingTimeout: 1500,
      minSpeechDuration: 500,
      deviceId: null,
      onStatusChange: null,
      ...options,
    };
  }

  get status() {
    return this._status;
  }

  set status(newStatus) {
    if (this._status === newStatus) return;
    const oldStatus = this._status;
    this._status = newStatus;
    console.log(`[Whisper] Mic status: ${oldStatus} → ${newStatus}`);
    if (this.options.onStatusChange) {
      this.options.onStatusChange(newStatus);
    }
    this.handleStatusChange(oldStatus, newStatus);
  }

  // ── State machine ──────────────────────────────────────────────

  handleStatusChange(_oldStatus, newStatus) {
    if (newStatus !== Status.RECORDING) {
      this.lastChunk = null;
    }

    switch (newStatus) {
      case Status.INACTIVE:
        this.handleInactiveState();
        break;
      case Status.LISTENING:
        this.handleListeningState();
        break;
      case Status.RECORDING:
        this.handleRecordingState();
        break;
      case Status.WAITING:
        this.handleWaitingState();
        break;
      case Status.PROCESSING:
        this.handleProcessingState();
        break;
    }
  }

  handleInactiveState() {
    this.stopRecording();
    this.stopAudioAnalysis();
    if (this.waitingTimer) {
      clearTimeout(this.waitingTimer);
      this.waitingTimer = null;
    }
  }

  handleListeningState() {
    this.stopRecording();
    this.audioChunks = [];
    this.hasStartedRecording = false;
    this.silenceStartTime = null;
    this.lastAudioTime = null;
    this.messageSent = false;
    this.startAudioAnalysis();
  }

  handleRecordingState() {
    if (
      !this.hasStartedRecording &&
      this.mediaRecorder?.state !== 'recording'
    ) {
      this.hasStartedRecording = true;
      this.mediaRecorder.start(1000);
      console.log('[Whisper] Speech started — recording');
    }
    if (this.waitingTimer) {
      clearTimeout(this.waitingTimer);
      this.waitingTimer = null;
    }
  }

  handleWaitingState() {
    this.waitingTimer = setTimeout(() => {
      if (this.status === Status.WAITING) {
        this.status = Status.PROCESSING;
      }
    }, this.options.waitingTimeout);
  }

  handleProcessingState() {
    this.stopRecording();
    this.process();
  }

  stopRecording() {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.stop();
      this.hasStartedRecording = false;
    }
  }

  // ── Initialization ─────────────────────────────────────────────

  async initialize() {
    try {
      this.status = Status.ACTIVATING;

      // HTTPS / mediaDevices guard
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[Whisper] getUserMedia not available (HTTPS required)');
        if (window.toastFrontendError) {
          window.toastFrontendError(
            'Микрофон недоступен. Для голосового ввода требуется HTTPS.',
            'Ошибка микрофона',
          );
        }
        this.status = Status.INACTIVE;
        return false;
      }

      // Load Whisper model
      console.log(
        `[Whisper] Loading model: Xenova/whisper-${this.options.modelSize}`,
      );
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        `Xenova/whisper-${this.options.modelSize}`,
      );

      // Get microphone stream
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      };

      // Use specific device if specified (works with getUserMedia)
      if (this.options.deviceId) {
        constraints.audio.deviceId = { exact: this.options.deviceId };
      }

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaRecorder = new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (
          event.data.size > 0 &&
          (this.status === Status.RECORDING || this.status === Status.WAITING)
        ) {
          if (this.lastChunk) {
            this.audioChunks.push(this.lastChunk);
            this.lastChunk = null;
          }
          this.audioChunks.push(event.data);
        } else if (this.status === Status.LISTENING) {
          this.lastChunk = event.data;
        }
      };

      this.setupAudioAnalysis(this.stream);
      this.status = Status.INACTIVE;
      console.log('[Whisper] Initialization complete');
      return true;
    } catch (error) {
      console.error('[Whisper] Initialization error:', error);
      if (window.toastFrontendError) {
        window.toastFrontendError(
          'Не удалось инициализировать голосовой ввод (Whisper).',
          'Ошибка микрофона',
        );
      }
      this.status = Status.INACTIVE;
      return false;
    }
  }

  // ── Audio analysis (silence / speech detection) ────────────────

  setupAudioAnalysis(stream) {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.minDecibels = -90;
    this.analyserNode.maxDecibels = -10;
    this.analyserNode.smoothingTimeConstant = 0.85;
    this.mediaStreamSource.connect(this.analyserNode);
  }

  startAudioAnalysis() {
    const analyzeFrame = () => {
      if (this.status === Status.INACTIVE) return;

      const dataArray = new Uint8Array(this.analyserNode.fftSize);
      this.analyserNode.getByteTimeDomainData(dataArray);

      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] - 128) / 128;
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const now = Date.now();

      if (rms > this.options.silenceThreshold) {
        this.lastAudioTime = now;
        this.silenceStartTime = null;
        if (
          this.status === Status.LISTENING ||
          this.status === Status.WAITING
        ) {
          this.status = Status.RECORDING;
        }
      } else if (this.status === Status.RECORDING) {
        if (!this.silenceStartTime) {
          this.silenceStartTime = now;
        }
        const silenceDuration = now - this.silenceStartTime;
        if (silenceDuration >= this.options.silenceDuration) {
          this.status = Status.WAITING;
        }
      }

      this.analysisFrame = requestAnimationFrame(analyzeFrame);
    };

    this.analysisFrame = requestAnimationFrame(analyzeFrame);
  }

  stopAudioAnalysis() {
    if (this.analysisFrame) {
      cancelAnimationFrame(this.analysisFrame);
      this.analysisFrame = null;
    }
  }

  // ── Transcription ──────────────────────────────────────────────

  async process() {
    if (this.audioChunks.length === 0) {
      this.status = Status.LISTENING;
      return;
    }

    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);

    try {
      const samplingRate = 16000;
      const audioData = await read_audio(audioUrl, samplingRate);
      const result = await this.transcriber(audioData, {
        language: this.options.language,
      });
      const text = this.filterResult(result.text || '');

      if (text) {
        console.log('[Whisper] Transcription:', text);
        this.updateCallback(text, true);
      }
    } catch (error) {
      console.error('[Whisper] Transcription error:', error);
      if (window.toastFrontendError) {
        window.toastFrontendError(
          'Ошибка транскрипции речи.',
          'Ошибка распознавания',
        );
      }
    } finally {
      URL.revokeObjectURL(audioUrl);
      this.audioChunks = [];
      this.status = Status.LISTENING;
    }
  }

  /** Filter out obvious hallucinations (common Whisper artifacts). */
  filterResult(text) {
    text = text.trim();
    let ok = false;
    while (!ok) {
      if (!text) break;
      if (text[0] === '{' && text[text.length - 1] === '}') break;
      if (text[0] === '(' && text[text.length - 1] === ')') break;
      if (text[0] === '[' && text[text.length - 1] === ']') break;
      ok = true;
    }
    if (ok) return text;
    console.log(`[Whisper] Discarding hallucination: ${text}`);
    return '';
  }

  // ── Public API ─────────────────────────────────────────────────

  toggle() {
    if (this.status === Status.INACTIVE || this.status === Status.ACTIVATING) {
      this.messageSent = false;
      this.status = Status.LISTENING;
    } else if (
      this.status === Status.RECORDING ||
      this.status === Status.WAITING
    ) {
      // Force-process what has been captured so far
      this.status = Status.PROCESSING;
    } else {
      this.status = Status.INACTIVE;
    }
  }

  async requestPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (window.toastFrontendError) {
          window.toastFrontendError(
            'Микрофон недоступен. Для голосового ввода требуется HTTPS.',
            'Ошибка',
          );
        }
        return false;
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('[Whisper] Error accessing microphone:', err);
      if (window.toastFrontendError) {
        window.toastFrontendError('Доступ к микрофону запрещён.', 'Ошибка');
      }
      return false;
    }
  }
}
