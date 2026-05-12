import type { ISpeechRecognizer, RecognitionResult, RecognizeOptions } from './ISpeechRecognizer';

type WhisperContext = {
  transcribe: (
    audioPath: string,
    options?: { language?: string },
  ) => {
    stop: () => Promise<void>;
    promise: Promise<{ result: string; segments?: { text: string }[] }>;
  };
  release: () => Promise<void>;
};

type WhisperModule = {
  initWhisper: (options: { filePath: string }) => Promise<WhisperContext>;
};

type ExpoConstantsModule = {
  default?: {
    executionEnvironment?: 'bare' | 'standalone' | 'storeClient' | string;
    appOwnership?: 'expo' | 'standalone' | 'guest' | string;
  };
};

// expo-audio types are mirrored here so this class can lazy-require the native module.
type RecordingOptions = {
  extension: string;
  sampleRate: number;
  numberOfChannels: number;
  bitRate: number;
  android: object;
  ios: {
    extension: string;
    outputFormat: string | number;
    audioQuality: number;
    sampleRate: number;
    numberOfChannels: number;
    bitRate: number;
    linearPCMBitDepth: number;
    linearPCMIsBigEndian: boolean;
    linearPCMIsFloat: boolean;
  };
  web: object;
};

type Recording = {
  prepareToRecordAsync: (options?: Partial<RecordingOptions>) => Promise<void>;
  record: () => void;
  stop: () => Promise<void>;
  uri: string | null;
};

type AudioModule = {
  requestRecordingPermissionsAsync: () => Promise<{ granted: boolean }>;
  setAudioModeAsync: (mode: object) => Promise<void>;
  AudioModule: { AudioRecorder: new (options: Partial<RecordingOptions>) => Recording };
  RecordingPresets: { HIGH_QUALITY: RecordingOptions };
  AudioQuality: { MAX: number };
  IOSOutputFormat: { LINEARPCM: string | number };
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
        await this.recording.stop();
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
    const FileSystem = this.requireFileSystem();
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

    const { granted } = await Audio.requestRecordingPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });

    const startChunk = async () => {
      if (!this.isRunning) return;

      const rec = new Audio.AudioModule.AudioRecorder({
        ...Audio.RecordingPresets.HIGH_QUALITY,
        extension: '.wav',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
      });
      await rec.prepareToRecordAsync({
        ...Audio.RecordingPresets.HIGH_QUALITY,
        extension: '.wav',
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 256000,
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.AudioQuality.MAX,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      });
      rec.record();
      this.recording = rec;

      // After chunk duration, stop and transcribe
      setTimeout(async () => {
        if (!this.isRunning) return;
        try {
          await rec.stop();
          const uri = rec.uri;
          if (uri && this.whisperCtx) {
            const { promise } = this.whisperCtx.transcribe(uri, {
              language: this.language,
            });
            const { result } = await promise;
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('whisper.rn') as Partial<WhisperModule>;
      if (typeof mod?.initWhisper !== 'function') {
        throw new Error(this.getWhisperUnavailableMessage());
      }
      return mod as WhisperModule;
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message ?? '';
        if (
          msg.includes('getConstants') ||
          msg.includes('NativeModule') ||
          msg.includes('Cannot find module')
        ) {
          throw new Error(this.getWhisperUnavailableMessage());
        }
      }
      throw error;
    }
  }

  private getWhisperUnavailableMessage(): string {
    if (this.isRunningInExpoGo()) {
      return 'Whisper is unavailable in Expo Go. Use a development build and reinstall the app.';
    }
    return 'Whisper native module is not available. Rebuild/reinstall the app so native modules are linked.';
  }

  private isRunningInExpoGo(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const constants = require('expo-constants') as ExpoConstantsModule;
      const env = constants?.default?.executionEnvironment;
      const ownership = constants?.default?.appOwnership;
      return env === 'storeClient' || ownership === 'expo';
    } catch {
      return false;
    }
  }

  private requireAudio(): AudioModule {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as AudioModule;
  }

  private requireFileSystem(): {
    cacheDirectory: string;
    getInfoAsync: (p: string) => Promise<{ exists: boolean }>;
    createDownloadResumable: (
      url: string,
      dest: string,
      opts: object,
      cb: (p: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
    ) => { downloadAsync: () => Promise<unknown> };
  } {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-file-system/legacy') as ReturnType<typeof this.requireFileSystem>;
  }
}
