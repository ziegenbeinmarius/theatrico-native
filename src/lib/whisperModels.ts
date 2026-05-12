export type WhisperModelSize = 'tiny' | 'base' | 'small';

export interface WhisperModelInfo {
  size: WhisperModelSize;
  label: string;
  url: string;
  fileName: string;
  fileSizeMB: number;
  description: string;
}

export const WHISPER_MODELS: Record<WhisperModelSize, WhisperModelInfo> = {
  tiny: {
    size: 'tiny',
    label: 'Tiny',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    fileName: 'ggml-tiny.bin',
    fileSizeMB: 75,
    description: 'Fastest · lower accuracy',
  },
  base: {
    size: 'base',
    label: 'Base',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    fileName: 'ggml-base.bin',
    fileSizeMB: 142,
    description: 'Balanced speed & accuracy',
  },
  small: {
    size: 'small',
    label: 'Small',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    fileName: 'ggml-small.bin',
    fileSizeMB: 244,
    description: 'Slower · higher accuracy',
  },
};

export const WHISPER_MODEL_SIZES: WhisperModelSize[] = ['tiny', 'base', 'small'];
