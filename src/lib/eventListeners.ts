import { DirectusService, directusService } from "./directus";

export type EventListener = {
  id?: string;
  event_user?: string | null;
  event_flow?: string | null;
  event_id?: string | null;
};

export type DirectusFlow = {
  id: string;
  name: string;
  status?: string;
  trigger?: string;
};

export type EventIdOption = { key: string; description: string };

export class EventListenersService extends DirectusService {
  async list(): Promise<EventListener[]> {
    const res = await directusService.authFetch(
      `/items/event_listener?fields=*&limit=-1`,
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as EventListener[];
  }

  async create(payload: Partial<EventListener>): Promise<EventListener> {
    const res = await directusService.authFetch(`/items/event_listener`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as EventListener;
  }

  async update(id: string, payload: Partial<EventListener>): Promise<EventListener> {
    const res = await directusService.authFetch(`/items/event_listener/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as EventListener;
  }

  async remove(id: string): Promise<void> {
    const res = await directusService.authFetch(`/items/event_listener/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) throw new Error(await this.parseError(res));
  }

  async listFlows(): Promise<DirectusFlow[]> {
    const res = await directusService.authFetch(
      `/flows?fields=id,name,status,trigger&limit=-1`,
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as DirectusFlow[];
  }

  async listEventIds(): Promise<EventIdOption[]> {
    const res = await this.fetchWithAuth(`${this.getApiUrl()}/engine/events/ids`);
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = (await res.json()) as Record<string, string>;
    return Object.entries(data).map(([key, description]) => ({ key, description }));
  }
}

export const eventListenersService = new EventListenersService();
