import { config } from '@/lib/config';
import type { ITheatricoClient, Play, Position, Session, SessionStatus } from '@/domain';

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

  createSession(playId: string): Promise<Session> {
    return this.request<Session>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ playId }),
    });
  }

  getSession(code: string): Promise<Session> {
    return this.request<Session>(`/api/sessions/${encodeURIComponent(code)}`);
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
