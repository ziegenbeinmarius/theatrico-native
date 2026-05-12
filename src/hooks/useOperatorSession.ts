import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { theatricoClient } from '@/services/api/theatricoClient';
import { createSessionWebSocket } from '@/services/api/websocket/SessionWebSocket';
import { createAudioWebSocket } from '@/services/api/websocket/AudioWebSocket';
import { useSpeechRecognizerContext } from '@/context/SpeechRecognizerContext';
import type { IAudioWebSocket, ISessionWebSocket, Play, Position, Session, SessionMessage, SessionStatus } from '@/domain';
import { flattenLines, findLineIndex } from '@/lib/scriptUtils';

export interface TranscriptItem {
  id: string;
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export interface UseOperatorSessionResult {
  session: Session | undefined;
  play: Play | null;
  isLoading: boolean;
  isRecording: boolean;
  transcriptItems: TranscriptItem[];
  currentPosition: Position | null;
  wsDisconnected: boolean;
  error: Error | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  togglePause: () => Promise<void>;
  movePrev: () => Promise<void>;
  moveNext: () => Promise<void>;
}

const CHUNK_DURATION_MS = 3000;

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useOperatorSession(sessionCode: string): UseOperatorSessionResult {
  const { recognizer } = useSpeechRecognizerContext();

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['sessions', sessionCode],
    queryFn: () => theatricoClient.getSession(sessionCode),
    enabled: Boolean(sessionCode),
  });

  const { data: plays, isLoading: playsLoading } = useQuery({
    queryKey: ['plays'],
    queryFn: () => theatricoClient.listPlays(),
    enabled: Boolean(session),
  });

  const play = plays?.find((p) => p.id === session?.playId) ?? null;
  const isLoading = sessionLoading || playsLoading;
  const error = sessionError instanceof Error ? sessionError : null;

  const [isRecording, setIsRecording] = useState(false);
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);

  // Mirror session.currentPosition into local state once loaded
  useEffect(() => {
    if (session?.currentPosition) {
      setCurrentPosition(session.currentPosition);
    }
  }, [session?.currentPosition]);

  const sessionWsRef = useRef<ISessionWebSocket | null>(null);
  const audioWsRef = useRef<IAudioWebSocket | null>(null);
  const audioRecordingRef = useRef<Audio.Recording | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const transcriptCounterRef = useRef(0);

  // WebSocket lifecycle
  useEffect(() => {
    if (!sessionCode) return;

    const sessionWs = createSessionWebSocket(sessionCode);
    const audioWs = createAudioWebSocket(sessionCode);
    sessionWsRef.current = sessionWs;
    audioWsRef.current = audioWs;

    const handleMessage = (msg: SessionMessage) => {
      if (msg.type === 'position_update') {
        setCurrentPosition(msg.position);
        setWsDisconnected(false);
      } else if (msg.type === 'transcript') {
        const id = String(++transcriptCounterRef.current);
        setTranscriptItems((prev) => {
          const lastItem = prev[prev.length - 1];
          if (!msg.isFinal && lastItem && !lastItem.isFinal) {
            return [...prev.slice(0, -1), { id, text: msg.text, isFinal: false, timestamp: Date.now() }];
          }
          return [...prev, { id, text: msg.text, isFinal: msg.isFinal, timestamp: Date.now() }];
        });
      } else if (msg.type === 'error') {
        setWsDisconnected(true);
      }
    };

    sessionWs.onMessage(handleMessage);
    sessionWs.connect();
    audioWs.connect();

    return () => {
      sessionWs.offMessage(handleMessage);
      sessionWs.disconnect();
      audioWs.disconnect();
      sessionWsRef.current = null;
      audioWsRef.current = null;
    };
  }, [sessionCode]);

  // Local recognizer results
  useEffect(() => {
    const unsub = recognizer.onResult((result) => {
      const id = String(++transcriptCounterRef.current);
      setTranscriptItems((prev) => {
        const lastItem = prev[prev.length - 1];
        if (!result.isFinal && lastItem && !lastItem.isFinal) {
          return [...prev.slice(0, -1), { id, text: result.text, isFinal: false, timestamp: Date.now() }];
        }
        return [...prev, { id, text: result.text, isFinal: result.isFinal, timestamp: Date.now() }];
      });
    });
    return unsub;
  }, [recognizer]);

  const captureChunk = useCallback(async () => {
    if (!isRecordingRef.current) return;
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      audioRecordingRef.current = recording;

      chunkTimerRef.current = setTimeout(async () => {
        chunkTimerRef.current = null;
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          if (uri && isRecordingRef.current) {
            const b64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            audioWsRef.current?.sendAudioChunk(base64ToArrayBuffer(b64));
          }
        } catch {
          // Swallow chunk errors; pipeline continues
        }
        if (isRecordingRef.current) {
          void captureChunk();
        }
      }, CHUNK_DURATION_MS);
    } catch {
      if (isRecordingRef.current) {
        chunkTimerRef.current = setTimeout(() => void captureChunk(), 500);
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) throw new Error('Microphone permission denied');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    await recognizer.start({ language: 'en-US' });
    isRecordingRef.current = true;
    setIsRecording(true);
    void captureChunk();
  }, [recognizer, captureChunk]);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (chunkTimerRef.current !== null) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    try {
      if (audioRecordingRef.current) {
        await audioRecordingRef.current.stopAndUnloadAsync();
        audioRecordingRef.current = null;
      }
    } catch {}

    try {
      await recognizer.stop();
    } catch {}
  }, [recognizer]);

  const togglePause = useCallback(async () => {
    if (!session) return;
    const newStatus: SessionStatus = session.status === 'paused' ? 'active' : 'paused';
    await theatricoClient.updateStatus(sessionCode, newStatus);
  }, [session, sessionCode]);

  const movePrev = useCallback(async () => {
    if (!play || !currentPosition) return;
    const lines = flattenLines(play);
    const idx = findLineIndex(lines, currentPosition.lineId);
    if (idx <= 0) return;
    const prevLine = lines[idx - 1];
    if (!prevLine) return;
    await theatricoClient.updatePosition(sessionCode, prevLine.position);
    setCurrentPosition(prevLine.position);
  }, [play, currentPosition, sessionCode]);

  const moveNext = useCallback(async () => {
    if (!play || !currentPosition) return;
    const lines = flattenLines(play);
    const idx = findLineIndex(lines, currentPosition.lineId);
    if (idx < 0 || idx >= lines.length - 1) return;
    const nextLine = lines[idx + 1];
    if (!nextLine) return;
    await theatricoClient.updatePosition(sessionCode, nextLine.position);
    setCurrentPosition(nextLine.position);
  }, [play, currentPosition, sessionCode]);

  return {
    session,
    play,
    isLoading,
    isRecording,
    transcriptItems,
    currentPosition,
    wsDisconnected,
    error,
    startRecording,
    stopRecording,
    togglePause,
    movePrev,
    moveNext,
  };
}
