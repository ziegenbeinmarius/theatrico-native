import type { ISpeechRecognizer, RecognitionResult, RecognizeOptions } from './ISpeechRecognizer';

// Types mirrored from modules/native-speech for lazy-require compatibility
interface NativeSpeechResultEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface NativeSpeechErrorEvent {
  code: string;
  message: string;
}

export class NativeRecognizer implements ISpeechRecognizer {
  readonly type = 'native' as const;

  private resultListeners: Set<(r: RecognitionResult) => void> = new Set();
  private errorListeners: Set<(e: Error) => void> = new Set();
  private resultSubscription: { remove: () => void } | null = null;
  private errorSubscription: { remove: () => void } | null = null;
  private isRunning = false;

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

    const { NativeSpeechModule, NativeSpeechEmitter } = this.requireModule();

    const granted = await NativeSpeechModule.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Speech recognition or microphone permission denied');
    }

    this.resultSubscription = NativeSpeechEmitter.addListener(
      'onResult',
      (event: NativeSpeechResultEvent) => {
        this.resultListeners.forEach((cb) =>
          cb({ text: event.text, isFinal: event.isFinal, confidence: event.confidence }),
        );
      },
    );

    this.errorSubscription = NativeSpeechEmitter.addListener(
      'onError',
      (event: NativeSpeechErrorEvent) => {
        this.errorListeners.forEach((cb) => cb(new Error(`[${event.code}] ${event.message}`)));
      },
    );

    await NativeSpeechModule.startRecognition(options.language ?? 'en-US', options.contextHint ?? '');
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    const { NativeSpeechModule } = this.requireModule();
    await NativeSpeechModule.stopRecognition();

    this.resultSubscription?.remove();
    this.errorSubscription?.remove();
    this.resultSubscription = null;
    this.errorSubscription = null;
  }

  // Lazy require keeps the module loadable in environments without the native binding (web, jest).
  // Path: from src/services/speech/ up three levels to repo root, then into modules/native-speech.
  private requireModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../../../modules/native-speech') as typeof import('../../../modules/native-speech');
  }
}
