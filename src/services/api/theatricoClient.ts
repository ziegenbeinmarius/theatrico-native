import { config } from '@/lib/config';
import type { ITheatricoClient, Play, Position, Session, SessionStatus } from '@/domain';

type RawCreateSession = {
  join_code: string;
  qr_url: string;
  language: string;
  script_title: string;
};

type RawGetSession = {
  join_code: string;
  cursor: number;
  paused: boolean;
  clients: number;
  chunk_duration_ms: number;
  language: string;
};

class TheatricoClient implements ITheatricoClient {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${config.backendUrl}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });

    if (!res.ok) {
      throw new Error(`API ${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  listPlays(): Promise<Play[]> {
    return this.request<Play[]>('/api/plays');
  }

  async createSession(playId: string): Promise<Session> {
    const raw = await this.request<RawCreateSession>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ playId }),
    });
    return {
      id: raw.join_code,
      code: raw.join_code,
      playId,
      status: 'active',
      currentPosition: null,
    };
  }

  async getSession(code: string): Promise<Session> {
    const raw = await this.request<RawGetSession>(`/api/sessions/${encodeURIComponent(code)}`);
    return {
      id: raw.join_code,
      code: raw.join_code,
      playId: '',
      status: raw.paused ? 'paused' : 'active',
      currentPosition: null,
    };
  }

  updatePosition(code: string, position: Position): Promise<void> {
    return this.request<void>(`/api/sessions/${encodeURIComponent(code)}/position`, {
      method: 'PATCH',
      body: JSON.stringify(position),
    });
  }

  updateStatus(code: string, status: SessionStatus): Promise<void> {
    return this.request<void>(`/api/sessions/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
}

export const theatricoClient: ITheatricoClient = new TheatricoClient();
