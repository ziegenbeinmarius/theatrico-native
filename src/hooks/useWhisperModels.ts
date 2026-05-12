import { useCallback, useEffect, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { WHISPER_MODELS, WHISPER_MODEL_SIZES, type WhisperModelSize } from '@/lib/whisperModels';

export interface WhisperModelsState {
  downloadedModels: Set<WhisperModelSize>;
  downloadProgress: Partial<Record<WhisperModelSize, number>>;
  downloadModel: (size: WhisperModelSize) => Promise<void>;
}

function getModelCachePath(size: WhisperModelSize): string {
  return `${FileSystem.cacheDirectory}${WHISPER_MODELS[size].fileName}`;
}

export function useWhisperModels(): WhisperModelsState {
  const [downloadedModels, setDownloadedModels] = useState<Set<WhisperModelSize>>(new Set());
  const [downloadProgress, setDownloadProgress] = useState<
    Partial<Record<WhisperModelSize, number>>
  >({});
  const activeDownloads = useRef<Set<WhisperModelSize>>(new Set());

  useEffect(() => {
    const checkCached = async () => {
      const cached = new Set<WhisperModelSize>();
      await Promise.all(
        WHISPER_MODEL_SIZES.map(async (size) => {
          const info = await FileSystem.getInfoAsync(getModelCachePath(size));
          if (info.exists) cached.add(size);
        }),
      );
      setDownloadedModels(cached);
    };
    checkCached();
  }, []);

  const downloadModel = useCallback(async (size: WhisperModelSize) => {
    if (activeDownloads.current.has(size)) return;

    const dest = getModelCachePath(size);
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      setDownloadedModels((prev) => new Set([...prev, size]));
      return;
    }

    activeDownloads.current.add(size);
    setDownloadProgress((prev) => ({ ...prev, [size]: 0 }));

    const task = FileSystem.createDownloadResumable(
      WHISPER_MODELS[size].url,
      dest,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          setDownloadProgress((prev) => ({
            ...prev,
            [size]: totalBytesWritten / totalBytesExpectedToWrite,
          }));
        }
      },
    );

    try {
      await task.downloadAsync();
      setDownloadedModels((prev) => new Set([...prev, size]));
    } finally {
      activeDownloads.current.delete(size);
      setDownloadProgress((prev) => {
        const next = { ...prev };
        delete next[size];
        return next;
      });
    }
  }, []);

  return { downloadedModels, downloadProgress, downloadModel };
}
