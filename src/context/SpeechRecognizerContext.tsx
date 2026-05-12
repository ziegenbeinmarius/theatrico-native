import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ISpeechRecognizer } from '@/services/speech/ISpeechRecognizer';
import { createSpeechRecognizer } from '@/services/speech/SpeechRecognizerFactory';
import { WHISPER_MODELS, type WhisperModelSize } from '@/lib/whisperModels';

const RECOGNIZER_TYPE_KEY = '@theatrico/speech_recognizer_type';
const WHISPER_MODEL_KEY = '@theatrico/whisper_model_size';

interface SpeechRecognizerContextValue {
  recognizer: ISpeechRecognizer;
  switchRecognizer: (type: 'whisper' | 'native') => Promise<void>;
  whisperModelSize: WhisperModelSize;
  switchWhisperModel: (size: WhisperModelSize) => Promise<void>;
}

const SpeechRecognizerContext = createContext<SpeechRecognizerContextValue | null>(null);

export function SpeechRecognizerProvider({ children }: { children: React.ReactNode }) {
  const [whisperModelSize, setWhisperModelSize] = useState<WhisperModelSize>('base');
  const [recognizer, setRecognizer] = useState<ISpeechRecognizer>(() =>
    createSpeechRecognizer('native'),
  );
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    Promise.all([
      AsyncStorage.getItem(RECOGNIZER_TYPE_KEY),
      AsyncStorage.getItem(WHISPER_MODEL_KEY),
    ]).then(([savedType, savedModel]) => {
      const model: WhisperModelSize =
        savedModel === 'tiny' || savedModel === 'base' || savedModel === 'small'
          ? savedModel
          : 'base';

      if (model !== 'base') setWhisperModelSize(model);

      if (savedType === 'whisper' || savedType === 'native') {
        const opts =
          savedType === 'whisper' ? { modelUrl: WHISPER_MODELS[model].url } : undefined;
        setRecognizer(createSpeechRecognizer(savedType, opts));
      }
    });
  }, []);

  const switchRecognizer = useCallback(
    async (type: 'whisper' | 'native') => {
      await AsyncStorage.setItem(RECOGNIZER_TYPE_KEY, type);
      const opts = type === 'whisper' ? { modelUrl: WHISPER_MODELS[whisperModelSize].url } : undefined;
      setRecognizer(createSpeechRecognizer(type, opts));
    },
    [whisperModelSize],
  );

  const switchWhisperModel = useCallback(
    async (size: WhisperModelSize) => {
      await AsyncStorage.setItem(WHISPER_MODEL_KEY, size);
      setWhisperModelSize(size);
      if (recognizer.type === 'whisper') {
        setRecognizer(createSpeechRecognizer('whisper', { modelUrl: WHISPER_MODELS[size].url }));
      }
    },
    [recognizer],
  );

  return (
    <SpeechRecognizerContext.Provider
      value={{ recognizer, switchRecognizer, whisperModelSize, switchWhisperModel }}
    >
      {children}
    </SpeechRecognizerContext.Provider>
  );
}

export function useSpeechRecognizerContext(): SpeechRecognizerContextValue {
  const ctx = useContext(SpeechRecognizerContext);
  if (!ctx) {
    throw new Error('useSpeechRecognizerContext must be used within SpeechRecognizerProvider');
  }
  return ctx;
}
