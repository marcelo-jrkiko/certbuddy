import { BackendClient } from "./backend_client";
import { DirectusService, directusService } from "./directus";

export type EventHandlerType = "shell_script" | "webhook";

export type EventListener = {
  id?: string;
  name?: string | null;
  event_user?: string | null;
  event_id?: string | null;
  handler?: EventHandlerType | string | null;
  event_params?: Record<string, unknown> | null;
  event_code?: string | null;
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
}

export class EventsService extends BackendClient {
  async listEventIds(): Promise<EventIdOption[]> {
    const res = await this.fetchWithAuth(`${this.getApiUrl()}/engine/events/ids`);
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = (await res.json()) as Record<string, string>;
    return Object.entries(data).map(([key, description]) => ({ key, description }));
  }
}

export const eventsService = new EventsService();
export const eventListenersService = new EventListenersService();
