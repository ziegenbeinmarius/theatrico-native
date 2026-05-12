import { requireNativeModule, NativeModule } from 'expo-modules-core';

export interface NativeSpeechResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface NativeSpeechError {
  code: string;
  message: string;
}

type NativeSpeechModuleEvents = {
  onResult(event: NativeSpeechResult): void;
  onError(event: NativeSpeechError): void;
};

export declare class NativeSpeechModuleType extends NativeModule<NativeSpeechModuleEvents> {
  requestPermissionsAsync(): Promise<boolean>;
  startRecognition(language: string, contextHint: string): Promise<void>;
  stopRecognition(): Promise<void>;
}

const NativeSpeechModule = requireNativeModule<NativeSpeechModuleType>('NativeSpeech');

export const NativeSpeechEmitter = NativeSpeechModule;

export default NativeSpeechModule;
