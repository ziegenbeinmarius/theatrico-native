import type { ISpeechRecognizer, RecognitionResult, RecognizeOptions } from './ISpeechRecognizer';

// @mybigday/whisper.rn types (installed separately)
type WhisperContext = {
  transcribe: (audioPath: string, options?: { language?: string }) => Promise<{ result: string; segments?: Array<{ text: string }> }>;
  release: () => Promise<void>;
};

type WhisperModule = {
  initWhisper: (options: { filePath: string }) => Promise<WhisperContext>;
};

// expo-av types (installed separately)
type RecordingOptions = {
  android: object;
  ios: { extension: string; outputFormat: number; audioQuality: number; sampleRate: number; numberOfChannels: number; bitRate: number; linearPCMBitDepth: number; linearPCMIsBigEndian: boolean; linearPCMIsFloat: boolean };
  web: object;
};

type Recording = {
  prepareToRecordAsync: (options: RecordingOptions) => Promise<void>;
  startAsync: () => Promise<void>;
  stopAndUnloadAsync: () => Promise<void>;
  getURI: () => string | null;
};

type AudioModule = {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  setAudioModeAsync: (mode: object) => Promise<void>;
  Recording: new () => Recording;
  RecordingOptionsPresets: { HIGH_QUALITY: RecordingOptions };
  IOSAudioQuality: { MAX: number };
  IOSOutputFormat: { LINEARPCM: number };
};

const CHUNK_DURATION_MS = 2000;
const OVERLAP_MS = 500;

export interface WhisperModelOptions {
  modelUrl?: string;
  modelPath?: string;
  onProgress?: (progress: number) => void;
}

export class WhisperRecognizer implements ISpeechRecognizer {
  readonly type = 'whisper' as const;

  private resultListeners: Set<(r: RecognitionResult) => void> = new Set();
  private errorListeners: Set<(e: Error) => void> = new Set();
  private whisperCtx: WhisperContext | null = null;
  private recording: Recording | null = null;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private language: string | undefined;
  private readonly modelOptions: WhisperModelOptions;

  constructor(modelOptions: WhisperModelOptions = {}) {
    this.modelOptions = modelOptions;
  }

  onResult(cb: (result: RecognitionResult) => void): () => void {
    this.resultListeners.add(cb);
    return () => this.resultListeners.delete(cb);
  }

  onError(cb: (err: Error) => void): () => void {
    this.errorListeners.add(cb);
    return () => this.errorListeners.delete(cb);
  }

  async start(options: RecognizeOptions): Promise<void> {
    if (this.isRunning) return;
    this.language = options.language;
    this.isRunning = true;

    try {
      await this.ensureModel();
      await this.startRecordingLoop();
    } catch (err) {
      this.isRunning = false;
      this.emitError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.chunkTimer !== null) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // ignore stop errors
      }
      this.recording = null;
    }
  }

  private async ensureModel(): Promise<void> {
    if (this.whisperCtx) return;

    let filePath = this.modelOptions.modelPath;

    if (!filePath && this.modelOptions.modelUrl) {
      filePath = await this.downloadModel(this.modelOptions.modelUrl, this.modelOptions.onProgress);
    }

    if (!filePath) {
      throw new Error('WhisperRecognizer: no model path or URL provided');
    }

    const { initWhisper } = this.requireWhisper();
    this.whisperCtx = await initWhisper({ filePath });
  }

  private async downloadModel(url: string, onProgress?: (p: number) => void): Promise<string> {
    // Download model to app cache directory using fetch + FileSystem
    // expo-file-system is used for writing the blob to disk
    const { FileSystem } = this.requireFileSystem();
    const fileName = url.split('/').pop() ?? 'whisper-model.bin';
    const dest = `${FileSystem.cacheDirectory}${fileName}`;

    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) return dest;

    const task = FileSystem.createDownloadResumable(url, dest, {}, (progress) => {
      if (onProgress && progress.totalBytesExpectedToWrite > 0) {
        onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
      }
    });

    await task.downloadAsync();
    return dest;
  }

  private async startRecordingLoop(): Promise<void> {
    const Audio = this.requireAudio();

    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const startChunk = async () => {
      if (!this.isRunning) return;

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      await rec.startAsync();
      this.recording = rec;

      // After chunk duration, stop and transcribe
      setTimeout(async () => {
        if (!this.isRunning) return;
        try {
          await rec.stopAndUnloadAsync();
          const uri = rec.getURI();
          if (uri && this.whisperCtx) {
            const { result } = await this.whisperCtx.transcribe(uri, {
              language: this.language,
            });
            this.emitResult({ text: result.trim(), isFinal: false });
          }
        } catch (err) {
          this.emitError(err instanceof Error ? err : new Error(String(err)));
        }
        // Start next overlapping chunk after OVERLAP_MS into previous chunk's duration
      }, CHUNK_DURATION_MS - OVERLAP_MS);
    };

    await startChunk();
    // Schedule recurring chunks with overlap
    this.chunkTimer = setInterval(startChunk, CHUNK_DURATION_MS - OVERLAP_MS);
  }

  private emitResult(result: RecognitionResult): void {
    this.resultListeners.forEach((cb) => cb(result));
  }

  private emitError(err: Error): void {
    this.errorListeners.forEach((cb) => cb(err));
  }

  // Lazy requires so the module can be imported without crashing on platforms
  // where the native dependency is absent (e.g. web/jest).
  private requireWhisper(): WhisperModule {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@mybigday/whisper.rn') as WhisperModule;
  }

  private requireAudio(): AudioModule {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-av').Audio as AudioModule;
  }

  private requireFileSystem(): { FileSystem: { cacheDirectory: string; getInfoAsync: (p: string) => Promise<{ exists: boolean }>; createDownloadResumable: (url: string, dest: string, opts: object, cb: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void) => { downloadAsync: () => Promise<void> } } } {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-file-system') as ReturnType<typeof this.requireFileSystem>;
  }
}
