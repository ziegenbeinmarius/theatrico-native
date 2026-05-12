import { config } from '@/lib/config';
import type { ITheatricoClient, Play, Session } from '@/domain';

class TheatricoClient implements ITheatricoClient {
  private readonly base: string;

  constructor(base: string) {
    this.base = base;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
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
}

export const theatricoClient: ITheatricoClient = new TheatricoClient(config.backendUrl);
