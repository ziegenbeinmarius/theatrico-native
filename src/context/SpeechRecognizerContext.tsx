import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ISpeechRecognizer } from '@/services/speech/ISpeechRecognizer';
import { createSpeechRecognizer } from '@/services/speech/SpeechRecognizerFactory';

const STORAGE_KEY = '@theatrico/speech_recognizer_type';

interface SpeechRecognizerContextValue {
  recognizer: ISpeechRecognizer;
  switchRecognizer: (type: 'whisper' | 'native') => Promise<void>;
}

const SpeechRecognizerContext = createContext<SpeechRecognizerContextValue | null>(null);

export function SpeechRecognizerProvider({ children }: { children: React.ReactNode }) {
  const [recognizer, setRecognizer] = useState<ISpeechRecognizer>(() =>
    createSpeechRecognizer('native'),
  );
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'whisper' || saved === 'native') {
        setRecognizer(createSpeechRecognizer(saved));
      }
    });
  }, []);

  const switchRecognizer = useCallback(async (type: 'whisper' | 'native') => {
    await AsyncStorage.setItem(STORAGE_KEY, type);
    setRecognizer(createSpeechRecognizer(type));
  }, []);

  return (
    <SpeechRecognizerContext.Provider value={{ recognizer, switchRecognizer }}>
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
