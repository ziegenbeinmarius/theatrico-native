import type { ISpeechRecognizer } from './ISpeechRecognizer';
import type { WhisperModelOptions } from './WhisperRecognizer';
import { WhisperRecognizer } from './WhisperRecognizer';
import { NativeRecognizer } from './NativeRecognizer';

export function createSpeechRecognizer(
  type: 'whisper' | 'native',
  whisperModelOptions?: WhisperModelOptions,
): ISpeechRecognizer {
  switch (type) {
    case 'whisper':
      return new WhisperRecognizer(whisperModelOptions ?? {});
    case 'native':
      return new NativeRecognizer();
  }
}
