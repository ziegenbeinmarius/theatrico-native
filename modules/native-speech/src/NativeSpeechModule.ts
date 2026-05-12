import { requireNativeModule, EventEmitter } from 'expo-modules-core';

export interface NativeSpeechResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface NativeSpeechError {
  code: string;
  message: string;
}

export interface NativeSpeechModuleType {
  requestPermissionsAsync(): Promise<boolean>;
  startRecognition(language: string, contextHint: string): Promise<void>;
  stopRecognition(): Promise<void>;
}

const NativeSpeechModule = requireNativeModule<NativeSpeechModuleType>('NativeSpeech');

export const NativeSpeechEmitter = new EventEmitter(NativeSpeechModule as unknown as Parameters<typeof EventEmitter>[0]);

export default NativeSpeechModule;
