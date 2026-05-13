import type { ISpeechRecognizer, RecognitionResult, RecognizeOptions } from './ISpeechRecognizer';

type TranscribeRealtimeEvent = {
  isCapturing: boolean;
  data?: { result: string };
  error?: string;
};

type WhisperContext = {
  transcribeRealtime: (options?: {
    language?: string;
    prompt?: string;
    // Inference speed
    temperature?: number;
    beamSize?: number;
    bestOf?: number;
    maxLen?: number;
    maxThreads?: number;
    // Realtime slicing
    realtimeAudioSec?: number;
    realtimeAudioSliceSec?: number;
    realtimeAudioMinSec?: number;
    // VAD
    useVad?: boolean;
    vadMs?: number;
    vadThold?: number;
    vadFreqThold?: number;
  }) => Promise<{
    stop: () => Promise<void>;
    subscribe: (callback: (event: TranscribeRealtimeEvent) => void) => void;
  }>;
  release: () => Promise<void>;
};

type WhisperModule = {
  initWhisper: (options: {
    filePath: string;
    useGpu?: boolean;
    useFlashAttn?: boolean;
    useCoreMLIos?: boolean;
  }) => Promise<WhisperContext>;
};

type ExpoConstantsModule = {
  default?: {
    executionEnvironment?: string;
    appOwnership?: string;
  };
};

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
  private stopRealtime: (() => Promise<void>) | null = null;
  private isRunning = false;
  private language: string | undefined;
  private contextHint: string | undefined;
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
    this.contextHint = options.contextHint;
    this.isRunning = true;

    try {
      await this.ensureModel();

      const { stop, subscribe } = await this.whisperCtx!.transcribeRealtime({
        language: this.language,
        prompt: this.contextHint,
        // Greedy decoding — skips beam search and candidate sampling.
        // With a context prompt guiding the output, accuracy loss is minimal and
        // inference is 2-3× faster than the default beam-search mode.
        temperature: 0,
        beamSize: 1,
        bestOf: 1,
        // 2s clips hold ~10-15 words; cap decoder output to match.
        maxLen: 80,
        realtimeAudioSec: 300,
        // 2s slices: shortest practical size for whisper.cpp.
        // Each slice fires inference immediately on completion (~150ms for tiny+GPU),
        // giving ~2.2s end-to-end latency — best achievable with Whisper on device.
        realtimeAudioSliceSec: 2,
        realtimeAudioMinSec: 1,
        useVad: true,
        vadMs: 2000,    // minimum 2s per VAD window (API lower limit)
        vadThold: 0.6,  // energy threshold; lower = more sensitive
      });

      this.stopRealtime = stop;

      subscribe((event) => {
        if (!this.isRunning) return;
        if (event.error) {
          this.emitError(new Error(event.error));
          return;
        }
        const text = event.data?.result?.trim();
        if (text) {
          this.emitResult({ text, isFinal: !event.isCapturing });
        }
      });
    } catch (err) {
      this.isRunning = false;
      this.emitError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.stopRealtime) {
      await this.stopRealtime().catch(() => {});
      this.stopRealtime = null;
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
    this.whisperCtx = await initWhisper({
      filePath,
      useGpu: true,       // Metal GPU on iOS — typically 3-5× faster than CPU
      useFlashAttn: true, // Flash Attention when GPU is available
    });
  }

  private async downloadModel(url: string, onProgress?: (p: number) => void): Promise<string> {
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

  private emitResult(result: RecognitionResult): void {
    this.resultListeners.forEach((cb) => cb(result));
  }

  private emitError(err: Error): void {
    this.errorListeners.forEach((cb) => cb(err));
  }

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
      return 'Whisper is unavailable in Expo Go. Use a development build.';
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
