import type { ISpeechRecognizer } from './ISpeechRecognizer';
import { WhisperRecognizer } from './WhisperRecognizer';
import { NativeRecognizer } from './NativeRecognizer';

export function createSpeechRecognizer(type: 'whisper' | 'native'): ISpeechRecognizer {
  switch (type) {
    case 'whisper':
      return new WhisperRecognizer();
    case 'native':
      return new NativeRecognizer();
  }
}
