import { config } from '@/lib/config';
import type { ISessionWebSocket, SessionMessage } from '@/domain';

const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class SessionWebSocket implements ISessionWebSocket {
  private readonly url: string;
  private ws: WebSocket | null = null;
  private handlers = new Set<(msg: SessionMessage) => void>();
  private openHandlers = new Set<() => void>();
  private closeHandlers = new Set<() => void>();
  private giveUpHandlers = new Set<() => void>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;

  constructor(sessionCode: string) {
    const wsBase = config.backendUrl.replace(/^http/, 'ws');
    this.url = `${wsBase}/api/sessions/${encodeURIComponent(sessionCode)}/ws`;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  onMessage(handler: (msg: SessionMessage) => void): void {
    this.handlers.add(handler);
  }

  offMessage(handler: (msg: SessionMessage) => void): void {
    this.handlers.delete(handler);
  }

  onOpen(handler: () => void): void {
    this.openHandlers.add(handler);
  }
  offOpen(handler: () => void): void {
    this.openHandlers.delete(handler);
  }
  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }
  offClose(handler: () => void): void {
    this.closeHandlers.delete(handler);
  }
  onGiveUp(handler: () => void): void {
    this.giveUpHandlers.add(handler);
  }
  offGiveUp(handler: () => void): void {
    this.giveUpHandlers.delete(handler);
  }

  private openSocket(): void {
    const ws = new WebSocket(this.url);

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.openHandlers.forEach((h) => h());
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as SessionMessage;
        this.handlers.forEach((h) => h(msg));
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      this.ws = null;
      if (this.shouldReconnect) {
        this.closeHandlers.forEach((h) => h());
        this.scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror, so reconnect is handled there
    };

    this.ws = ws;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.giveUpHandlers.forEach((h) => h());
      return;
    }

    const delay = Math.min(
      BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.openSocket();
      }
    }, delay);
  }
}

export function createSessionWebSocket(sessionCode: string): ISessionWebSocket {
  return new SessionWebSocket(sessionCode);
}

export const defaultSessionWebSocket = {
  forSession: (code: string) => new SessionWebSocket(code),
};

// Convenience factory wired to the default backend
export function sessionWebSocketFactory(code: string): ISessionWebSocket {
  return createSessionWebSocket(code);
}
