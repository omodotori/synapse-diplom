import { createStore } from "/js/AlpineStore.js";
import { updateChatInput, sendMessage } from "/index.js";
import { sleep } from "/js/sleep.js";
import { store as microphoneSettingStore } from "/components/settings/speech/microphone-setting-store.js";
import * as shortcuts from "/js/shortcuts.js";

const Status = {
  INACTIVE: "inactive",
  ACTIVATING: "activating",
  LISTENING: "listening",
  RECORDING: "recording",
  WAITING: "waiting",
  PROCESSING: "processing",
};

// Create the speech store
const model = {
  // Initialization guard
  _initialized: false,

  // STT Settings
  stt_model_size: "tiny",
  stt_language: "en",
  stt_silence_threshold: 0.05,
  stt_silence_duration: 1000,
  stt_waiting_timeout: 2000,

  // TTS Settings
  tts_kokoro: false,

  // TTS State
  isSpeaking: false,
  speakingId: "",
  speakingText: "",
  currentAudio: null,
  audioEl: null,
  audioContext: null,
  userHasInteracted: false,
  stopSpeechChain: false,
  ttsStream: null,

  // STT State
  microphoneInput: null,
  isProcessingClick: false,
  selectedDevice: null,
  _initializingMic: false,
  _micStatusReactive: "inactive",

  // Getter for micStatus - uses reactive property for Alpine UI updates
  get micStatus() {
    return this._micStatusReactive || Status.INACTIVE;
  },

  updateMicrophoneButtonUI() {
    const microphoneButton = document.getElementById("microphone-button");
    if (!microphoneButton) return;
    const status = this.micStatus;
    microphoneButton.classList.remove(
      "mic-inactive",
      "mic-activating",
      "mic-listening",
      "mic-recording",
      "mic-waiting",
      "mic-processing"
    );
    microphoneButton.classList.add(`mic-${status.toLowerCase()}`);
    microphoneButton.setAttribute("data-status", status);
  },

  async handleMicrophoneClick() {
    if (this.isProcessingClick || this._initializingMic) return;
    this.isProcessingClick = true;
    try {
      // Capture original text before starting a new recording
      if (!this.microphoneInput || this.microphoneInput.status === Status.INACTIVE || this.microphoneInput.status === Status.ACTIVATING) {
        const chatInputEl = document.getElementById("chat-input");
        this._originalInputText = chatInputEl ? chatInputEl.value : "";
      }

      // reset mic input if device has changed in settings
      const device = microphoneSettingStore.getSelectedDevice();
      if (device != this.selectedDevice) {
        this.selectedDevice = device;
        this.microphoneInput = null;
        this._micStatusReactive = Status.INACTIVE;
        console.log("Device changed, microphoneInput reset");
      }

      if (!this.microphoneInput) {
        await this.initMicrophone();
      }

      if (this.microphoneInput) {
        this.microphoneInput.toggle();
      }
    } finally {
      setTimeout(() => {
        this.isProcessingClick = false;
      }, 300);
    }
  },

  // Initialize speech functionality
  async init() {
    // Guard against multiple initializations
    if (this._initialized) {
      console.log(
        "[Speech Store] Already initialized, skipping duplicate init()"
      );
      return;
    }

    this._initialized = true;
    await this.loadSettings();
    this.setupBrowserTTS();
    this.setupUserInteractionHandling();
  },

  // Load settings from server
  async loadSettings() {
    try {
      const response = await fetchApi("/settings_get", { method: "POST" });
      const data = await response.json();
      const settings = data?.settings || {};

      if (settings) {
        this.stt_model_size = settings.stt_model_size ?? this.stt_model_size;
        this.stt_language = settings.stt_language ?? this.stt_language;
        this.stt_silence_threshold =
          settings.stt_silence_threshold ?? this.stt_silence_threshold;
        this.stt_silence_duration =
          settings.stt_silence_duration ?? this.stt_silence_duration;
        this.stt_waiting_timeout =
          settings.stt_waiting_timeout ?? this.stt_waiting_timeout;
        this.tts_kokoro = settings.tts_kokoro ?? this.tts_kokoro;
      }
    } catch (error) {
      window.toastFetchError("Failed to load speech settings", error);
      console.error("Failed to load speech settings:", error);
    }
  },

  // Setup browser TTS
  setupBrowserTTS() {
    this.synth = window.speechSynthesis;
    this.browserUtterance = null;
  },

  // Setup user interaction handling for autoplay policy
  setupUserInteractionHandling() {
    const enableAudio = () => {
      if (!this.userHasInteracted) {
        this.userHasInteracted = true;
        console.log("User interaction detected - audio playback enabled");

        // Create a dummy audio context to "unlock" audio
        try {
          this.audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
          this.audioContext.resume();
        } catch (e) {
          console.log("AudioContext not available");
        }
      }
    };

    // Listen for any user interaction
    const events = ["click", "touchstart", "keydown", "mousedown"];
    events.forEach((event) => {
      document.addEventListener(event, enableAudio, {
        once: true,
        passive: true,
      });
    });
  },

  // main speak function, allows to speak a stream of text that is generated piece by piece
  async speakStream(id, text, finished = false) {
    // if already running the same stream, do nothing
    if (
      this.ttsStream &&
      this.ttsStream.id === id &&
      this.ttsStream.text === text &&
      this.ttsStream.finished === finished
    )
      return;

    // if user has not interacted (after reload), do not play audio
    if (!this.userHasInteracted) return this.showAudioPermissionPrompt();

    // new stream
    if (!this.ttsStream || this.ttsStream.id !== id) {
      // this.stop(); // stop potential previous stream
      // create new stream data
      this.ttsStream = {
        id,
        text,
        finished,
        running: false,
        lastChunkIndex: -1,
        stopped: false,
        chunks: [],
      };
    } else {
      // update existing stream data
      this.ttsStream.finished = finished;
      this.ttsStream.text = text;
    }

    // cleanup text
    const cleanText = this.cleanText(text);
    if (!cleanText.trim()) return;

    // chunk it for faster processing
    this.ttsStream.chunks = this.chunkText(cleanText);
    if (this.ttsStream.chunks.length == 0) return;

    // if stream was already running, just updating chunks is enough
    // The running loop will pick up the new chunks automatically
    if (this.ttsStream.running) return;
    else this.ttsStream.running = true; // proceed to running phase

    // terminator function to kill the stream if new stream has started
    const terminator = () =>
      this.ttsStream?.id !== id || this.ttsStream?.stopped;

    const spoken = [];

    // continuously loop until all chunks are spoken and stream is finished
    while (true) {
      // check if we should stop
      if (terminator()) break;

      // get the next chunk index to speak
      const nextIndex = this.ttsStream.lastChunkIndex + 1;

      // if no more chunks available, check if we should wait or exit
      if (nextIndex >= this.ttsStream.chunks.length) {
        // if stream is finished, we're done
        if (this.ttsStream.finished) break;
        // otherwise wait a bit for more chunks to arrive
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      // do not speak the last chunk until finished (it is being generated)
      if (
        nextIndex == this.ttsStream.chunks.length - 1 &&
        !this.ttsStream.finished
      ) {
        // wait a bit for more content or finish signal
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      // set the index of last spoken chunk
      this.ttsStream.lastChunkIndex = nextIndex;

      // speak the chunk
      const chunk = this.ttsStream.chunks[nextIndex];
      spoken.push(chunk);
      await this._speak(chunk, nextIndex > 0, () => terminator());
    }

    // at the end, finish stream data
    this.ttsStream.running = false;
  },

  // simplified speak function, speak a single finished piece of text
  async speak(text) {
    const id = Math.random();
    return await this.speakStream(id, text, true);
  },

  // speak wrapper
  async _speak(text, waitForPrevious, terminator) {
    // default browser speech
    if (!this.tts_kokoro)
      return await this.speakWithBrowser(text, waitForPrevious, terminator);

    // kokoro tts
    try {
      await await this.speakWithKokoro(text, waitForPrevious, terminator);
    } catch (error) {
      console.error(error);
      return await this.speakWithBrowser(text, waitForPrevious, terminator);
    }
  },

  chunkText(text, { maxChunkLength = 135, lineSeparator = "..." } = {}) {
    const INC_LIMIT = maxChunkLength * 2;
    const MIN_CHUNK_LENGTH = 20; // minimum length for a chunk before merging

    // Only split by ,/word if needed (unchanged)
    const splitDeep = (seg) => {
      if (seg.length <= INC_LIMIT) return [seg];
      const byComma = seg.match(/[^,]+(?:,|$)/g);
      if (byComma.length > 1)
        return byComma.flatMap((p, i) =>
          splitDeep(i < byComma.length - 1 ? p : p.replace(/,$/, ""))
        );
      const out = [];
      let part = "";
      for (const word of seg.split(/\s+/)) {
        const need = part ? part.length + 1 + word.length : word.length;
        if (need <= maxChunkLength) {
          part += (part ? " " : "") + word;
        } else {
          if (part) out.push(part);
          if (word.length > maxChunkLength) {
            for (let i = 0; i < word.length; i += maxChunkLength)
              out.push(word.slice(i, i + maxChunkLength));
            part = "";
          } else {
            part = word;
          }
        }
      }
      if (part) out.push(part);
      return out;
    };

    // Only split on [.!?] followed by space
    const sentenceTokens = (line) => {
      const toks = [];
      let start = 0;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (
          (c === "." || c === "!" || c === "?") &&
          /\s/.test(line[i + 1] || "")
        ) {
          toks.push(line.slice(start, i + 1));
          i += 1;
          start = i + 1;
        }
      }
      if (start < line.length) toks.push(line.slice(start));
      return toks;
    };

    // Step 1: Split all newlines into individual chunks first
    let initialChunks = [];
    const lines = text.split(/\n+/).filter((l) => l.trim());

    for (const line of lines) {
      if (!line.trim()) continue;
      // Process each line into sentence tokens and add to chunks
      const sentences = sentenceTokens(line.trim());
      initialChunks.push(...sentences);
    }

    // Step 2: Merge short chunks until they meet minimum length criteria
    const finalChunks = [];
    let currentChunk = "";

    for (let i = 0; i < initialChunks.length; i++) {
      const chunk = initialChunks[i];

      // If current chunk is empty, start with this chunk
      if (!currentChunk) {
        currentChunk = chunk;
        // If this is the last chunk or it's already long enough, add it
        if (
          i === initialChunks.length - 1 ||
          currentChunk.length >= MIN_CHUNK_LENGTH
        ) {
          finalChunks.push(currentChunk);
          currentChunk = "";
        }
        continue;
      }

      // Current chunk exists, check if we should merge
      if (currentChunk.length < MIN_CHUNK_LENGTH) {
        // Try to merge with separator
        const merged = currentChunk + " " + lineSeparator + " " + chunk;

        // Check if merged chunk fits within max length
        if (merged.length <= maxChunkLength) {
          currentChunk = merged;
        } else {
          // Doesn't fit, add current chunk and start new one
          finalChunks.push(currentChunk);
          currentChunk = chunk;
        }
      } else {
        // Current chunk is already long enough, add it and start new one
        finalChunks.push(currentChunk);
        currentChunk = chunk;
      }

      // If this is the last chunk, add whatever is in the buffer
      if (i === initialChunks.length - 1 && currentChunk) {
        finalChunks.push(currentChunk);
      }
    }

    return finalChunks.map((chunk) => chunk.trimEnd());
  },

  // Show a prompt to user to enable audio
  showAudioPermissionPrompt() {
    shortcuts.frontendNotification({
      type: "info",
      message: "Click anywhere to enable audio playback",
      displayTime: 5000,
      frontendOnly: true,
    });
    console.log("Please click anywhere on the page to enable audio playback");
  },

  // Browser TTS
  async speakWithBrowser(text, waitForPrevious = false, terminator = null) {
    if (terminator && terminator()) return;

    // wait for previous to finish if requested
    while (waitForPrevious && this.isSpeaking) await sleep(25);
    if (terminator && terminator()) return;

    // stop previous only if not waiting for it
    if (!waitForPrevious) this.stopAudio();

    return new Promise((resolve) => {
      this.browserUtterance = new SpeechSynthesisUtterance(text);
      this.browserUtterance.lang = 'ru-RU';
      
      const setVoice = () => {
        const voices = this.synth.getVoices();
        const ruVoice = voices.find(v => v.lang === 'ru-RU' || v.lang.includes('ru'));
        if (ruVoice) {
          this.browserUtterance.voice = ruVoice;
        }
      };

      if (this.synth.getVoices().length === 0) {
        this.synth.onvoiceschanged = () => setVoice();
      } else {
        setVoice();
      }

      // ensure we keep a reference so it's not garbage collected
      window.__utterances = window.__utterances || [];
      window.__utterances.push(this.browserUtterance);
      
      this.browserUtterance.onstart = () => {
        this.isSpeaking = true;
      };
      
      this.browserUtterance.onend = () => {
        this.isSpeaking = false;
        // clean up reference
        const index = window.__utterances.indexOf(this.browserUtterance);
        if (index > -1) window.__utterances.splice(index, 1);
        resolve();
      };
      
      this.browserUtterance.onerror = (e) => {
        console.error('TTS error', e);
        this.isSpeaking = false;
        resolve();
      };
      
      this.synth.speak(this.browserUtterance);
    });
  },

  // Kokoro TTS
  async speakWithKokoro(text, waitForPrevious = false, terminator = null) {
    try {
      // synthesize on the backend
      const response = await sendJsonData("/synthesize", { text });

      // wait for previous to finish if requested
      while (waitForPrevious && this.isSpeaking) await sleep(25);
      if (terminator && terminator()) return;

      // stop previous only if not waiting for it
      if (!waitForPrevious) this.stopAudio();

      if (response.success) {
        if (response.audio_parts) {
          // Multiple chunks - play sequentially
          for (const audioPart of response.audio_parts) {
            if (terminator && terminator()) return;
            await this.playAudio(audioPart);
            await sleep(100); // Brief pause
          }
        } else if (response.audio) {
          // Single audio
          this.playAudio(response.audio);
        }
      } else {
        throw new Error("Kokoro TTS error:", response.error);
      }
    } catch (error) {
      throw new Error("Kokoro TTS error:", error);
    }
  },

  // Play base64 audio
  async playAudio(base64Audio) {
    return new Promise((resolve, reject) => {
      const audio = this.audioEl ? this.audioEl : (this.audioEl = new Audio());

      // Reset any previous playback state
      audio.pause();
      audio.currentTime = 0;

      audio.onplay = () => {
        this.isSpeaking = true;
      };
      audio.onended = () => {
        this.isSpeaking = false;
        this.currentAudio = null;
        resolve();
      };
      audio.onerror = (error) => {
        this.isSpeaking = false;
        this.currentAudio = null;
        reject(error);
      };

      audio.src = `data:audio/wav;base64,${base64Audio}`;
      this.currentAudio = audio;

      audio.play().catch((error) => {
        this.isSpeaking = false;
        this.currentAudio = null;

        if (error.name === "NotAllowedError") {
          this.showAudioPermissionPrompt();
          this.userHasInteracted = false;
        }
        reject(error);
      });
    });
  },

  // Stop current speech chain
  stop() {
    this.stopAudio(); // stop current audio immediately
    if (this.ttsStream) this.ttsStream.stopped = true; // set stop on current stream
  },

  // Stop current speech audio
  stopAudio() {
    if (this.synth?.speaking) {
      this.synth.cancel();
    }

    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.currentAudio = null;
    this.isSpeaking = false;
  },

  // Clean text for TTS
  cleanText(text) {
    // Use SUB character (ASCII 26, 0x1A) for placeholders to avoid conflicts with actual text
    const SUB = "\x1A"; // non-printable substitute character
    const codePlaceholder = SUB + "code" + SUB;
    const tablePlaceholder = SUB + "table" + SUB;

    // Handle code blocks BEFORE HTML parsing (markdown code blocks)
    text = text.replace(/```(?:[a-zA-Z0-9]*\n)?[\s\S]*?```/g, codePlaceholder); // closed code blocks
    text = text.replace(/```(?:[a-zA-Z0-9]*\n)?[\s\S]*$/g, codePlaceholder); // unclosed code blocks

    // Replace inline code ticks with content preserved
    text = text.replace(/`([^`]*)`/g, "$1"); // remove backticks but keep content

    // Parse HTML using browser's DOMParser to properly extract text content
    try {
      const parser = new DOMParser();
      // Wrap in a div to handle fragments
      const doc = parser.parseFromString(`<div>${text}</div>`, 'text/html');

      // Replace <pre> and <code> tags with placeholder before extracting text
      doc.querySelectorAll('pre, code').forEach(el => {
        el.replaceWith(codePlaceholder);
      });

      // Extract text content (this strips all HTML tags properly)
      text = doc.body.textContent || "";
    } catch (e) {
      // Fallback: simple tag stripping if DOMParser fails
      console.warn("[Speech Store] DOMParser failed, using fallback:", e);
      text = text.replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, codePlaceholder);
      text = text.replace(/<code[^>]*>[\s\S]*?<\/code>/gi, codePlaceholder);
      text = text.replace(/<[^>]+>/g, ''); // strip remaining tags
    }

    // Remove markdown links: [label](url) → label
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

    // Remove markdown formatting: *, _, #
    text = text.replace(/[*_#]+/g, "");

    // Handle tables - both complete and partial
    // Check if text contains a table-like pattern
    if (text.includes("|")) {
      // Find consecutive lines with | characters (table rows)
      const tableLines = text
        .split("\n")
        .filter((line) => line.includes("|") && line.trim().startsWith("|"));
      if (tableLines.length > 0) {
        // Replace each table line with a placeholder
        for (const line of tableLines) {
          text = text.replace(line, tablePlaceholder);
        }
      } else {
        // Just handle individual table rows
        text = text.replace(/\|[^\n]*\|/g, tablePlaceholder);
      }
    }

    // Remove emojis and private unicode blocks
    text = text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    // Replace URLs with just the domain name
    text = text.replace(/https?:\/\/[^\s]+/g, (match) => {
      try {
        return new URL(match).hostname;
      } catch {
        return "";
      }
    });

    // Remove email addresses
    // text = text.replace(/\S+@\S+/g, "");

    // Replace UUIDs with 'UUID'
    text = text.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      "UUID"
    );

    // Collapse multiple spaces/tabs to a single space, but preserve newlines
    text = text.replace(/[ \t]+/g, " ");

    // Function to merge consecutive placeholders of any type
    function mergePlaceholders(txt, placeholder, replacement) {
      // Create regex for consecutive placeholders (with possible whitespace between)
      const regex = new RegExp(placeholder + "\\s*" + placeholder, "g");
      // Merge consecutive placeholders until no more found
      while (regex.test(txt)) {
        txt = txt.replace(regex, placeholder);
      }
      // Replace all remaining placeholders with human-readable text
      return txt.replace(new RegExp(placeholder, "g"), replacement);
    }

    // Apply placeholder merging for both types
    text = mergePlaceholders(text, codePlaceholder, "See code attached ...");
    text = mergePlaceholders(text, tablePlaceholder, "See table attached ...");

    // Trim leading/trailing whitespace
    text = text.trim();

    return text;
  },

  // Initialize microphone input (Web Speech API or Whisper fallback)
  async initMicrophone() {
    if (this.microphoneInput) return this.microphoneInput;
    if (this._initializingMic) return null;
    this._initializingMic = true;

    try {
      const language = this.stt_language || 'ru';
      // Map short language codes to BCP 47 tags for Web Speech API
      const langMap = {
        ru: 'ru-RU', en: 'en-US', fr: 'fr-FR', de: 'de-DE',
        es: 'es-ES', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR',
        uk: 'uk-UA', pt: 'pt-BR', it: 'it-IT', ar: 'ar-SA',
      };
      const speechLang = langMap[language] || language;

      // Callback that updates the store's reactive status for Alpine UI
      const onStatusChange = (newStatus) => {
        this._micStatusReactive = newStatus;
      };

      const callback = (text, isFinal) => {
        const orig = this._originalInputText || "";
        const needsSpace = orig.length > 0 && !orig.endsWith(" ");
        const previewText = orig + (needsSpace ? " " : "") + text;
        
        // Always replace the entire input with original + preview text
        updateChatInput(previewText, true);

        if (isFinal) {
          if (this.microphoneInput && !this.microphoneInput.messageSent) {
            this.microphoneInput.messageSent = true;
          }
        }
      };

      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionAPI) {
        // Web Speech API (Chrome, Edge, Safari)
        console.log('[Speech] Using Web Speech API, language:', speechLang);
        this.microphoneInput = new MicrophoneInput(callback, {
          language: speechLang,
          onStatusChange,
        });

        if (!this.microphoneInput.initialize()) {
          this.microphoneInput = null;
          return null;
        }
      } else {
        // Fallback: Whisper via Transformers.js (Firefox, etc.)
        console.log('[Speech] Web Speech API not available, loading Whisper fallback...');
        this._micStatusReactive = Status.ACTIVATING;
        try {
          const { WhisperMicrophoneInput } = await import('/js/speech_browser.js');

          const deviceId = this.selectedDevice || null;
          this.microphoneInput = new WhisperMicrophoneInput(callback, {
            modelSize: this.stt_model_size || 'tiny',
            language: language,
            silenceThreshold: this.stt_silence_threshold || 0.07,
            silenceDuration: this.stt_silence_duration || 1000,
            waitingTimeout: this.stt_waiting_timeout || 1500,
            deviceId: deviceId,
            onStatusChange,
          });

          const initialized = await this.microphoneInput.initialize();
          if (!initialized) {
            this.microphoneInput = null;
            this._micStatusReactive = Status.INACTIVE;
            return null;
          }
        } catch (error) {
          console.error('[Speech] Failed to load Whisper fallback:', error);
          if (window.toastFrontendError) {
            window.toastFrontendError('Не удалось загрузить модуль распознавания речи.', 'Ошибка');
          }
          this.microphoneInput = null;
          this._micStatusReactive = Status.INACTIVE;
          return null;
        }
      }

      return this.microphoneInput;
    } finally {
      this._initializingMic = false;
    }
  },

  async sendMessage(text) {
    // This function is no longer used for voice input auto-sending
    // but kept for backward compatibility if called from elsewhere.
    text = "(voice) " + text;
    updateChatInput(text);
  },

  // Request microphone permission
  async requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (window.toastFrontendError) {
        window.toastFrontendError('Микрофон недоступен. Для голосового ввода требуется HTTPS.', 'Ошибка');
      }
      return false;
    }
    if (this.microphoneInput) {
      return this.microphoneInput.requestPermission();
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (window.toastFrontendError) {
        window.toastFrontendError('Доступ к микрофону запрещён.', 'Ошибка');
      }
      return false;
    }
  },
};

// Microphone Input Class using Web Speech API
class MicrophoneInput {
  constructor(updateCallback, options = {}) {
    this.updateCallback = updateCallback;
    this._status = Status.INACTIVE;
    this.recognition = null;
    this.finalTranscript = '';
    this.messageSent = false;
    this.options = {
      language: 'ru-RU',
      onStatusChange: null,
      ...options
    };
  }

  get status() {
    return this._status;
  }

  set status(newStatus) {
    if (this._status === newStatus) return;
    const oldStatus = this._status;
    this._status = newStatus;
    console.log(`Mic status changed from ${oldStatus} to ${newStatus}`);
    if (this.options.onStatusChange) {
      this.options.onStatusChange(newStatus);
    }
  }

  initialize() {
    this.status = Status.ACTIVATING;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("SpeechRecognition is not supported in this browser");
      if (window.toastFrontendError) window.toastFrontendError("Голосовой ввод не поддерживается в этом браузере.", "error");
      this.status = Status.INACTIVE;
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.options.language;

      this.recognition.onstart = () => {
        this.status = Status.LISTENING;
        console.log('[SpeechRecognition] Started, lang:', this.options.language);
      };

      this.recognition.onresult = (event) => {
        this.status = Status.RECORDING;
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        // Show accumulated final + current interim text in real-time
        const displayText = this.finalTranscript + interimTranscript;
        if (displayText) {
          this.updateCallback(displayText, false);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          if (window.toastFrontendError) {
            window.toastFrontendError('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.', 'Ошибка');
          }
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          if (window.toastFrontendError) {
            window.toastFrontendError(`Ошибка распознавания речи: ${event.error}`, 'Ошибка');
          }
        }
        this.status = Status.INACTIVE;
      };

      this.recognition.onend = () => {
        if (this.status === Status.PROCESSING) {
          // Explicitly stopped by user — send accumulated text
          this.status = Status.INACTIVE;
          if (this.finalTranscript.trim()) {
            this.updateCallback(this.finalTranscript.trim(), true);
          }
        } else if (this.status !== Status.INACTIVE) {
          // Unexpected stop while listening — auto-restart
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };

      return true;
    } catch (error) {
      console.error("Microphone initialization error:", error);
      if (window.toastFrontendError) window.toastFrontendError("Failed to access microphone.", "error");
      this.status = Status.INACTIVE;
      return false;
    }
  }

  toggle() {
    if (!this.recognition) {
      if (!this.initialize()) return;
    }

    if (this.status === Status.INACTIVE || this.status === Status.ACTIVATING) {
      // Start listening
      this.finalTranscript = '';
      this.messageSent = false;
      try {
        this.recognition.start();
        // Status will be set to LISTENING by onstart callback
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    } else {
      // Stop — set PROCESSING so onend sends the final text
      this.status = Status.PROCESSING;
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
      // onend callback will handle sending text and setting INACTIVE
    }
  }

  async requestPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (window.toastFrontendError) {
          window.toastFrontendError('Микрофон недоступен. Для голосового ввода требуется HTTPS.', 'Ошибка');
        }
        return false;
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (window.toastFrontendError) {
        window.toastFrontendError('Доступ к микрофону запрещён.', 'Ошибка');
      }
      return false;
    }
  }
}

export const store = createStore("speech", model);

// Initialize speech store
// window.speechStore = speechStore;

// Event listeners
document.addEventListener("settings-updated", () => store.loadSettings());
// document.addEventListener("DOMContentLoaded", () => speechStore.init());
