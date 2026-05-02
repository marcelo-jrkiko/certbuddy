import { DirectusService, directusService } from "./directus";

import { components } from "../../shared/Schema"
import { BackendClient } from "./backend_client";


export type ConfigKind = "challenge" | "ca" | "shared";

export type SharedConfig = components["schemas"]["ItemsSharedConfig"];
export type ChallengeConfig = components["schemas"]["ItemsChallengeConfig"];
export type CAConfig = components["schemas"]["ItemsCertificateauthorityConfig"];

export const COLLECTIONS: Record<ConfigKind, string> = {
  challenge: "challenge_config",
  ca: "certificateauthority_config",
  shared: "shared_config",
};

export class ConfigsService extends DirectusService {

  async listItems<T = any>(
    kind: ConfigKind,
    fields = "*",
  ): Promise<T[]> {
    const collection = COLLECTIONS[kind];
    const res = await directusService.authFetch(
      `/items/${collection}?fields=${encodeURIComponent(fields)}&limit=-1`,
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as T[];
  }

  async createItem<T = any>(
    kind: ConfigKind,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const res = await directusService.authFetch(`/items/${COLLECTIONS[kind]}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as T;
  }

  async updateItem<T = any>(
    kind: ConfigKind,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const res = await directusService.authFetch(
      `/items/${COLLECTIONS[kind]}/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const { data } = await res.json();
    return data as T;
  }

  async deleteItem(kind: ConfigKind, id: string): Promise<void> {
    const res = await directusService.authFetch(
      `/items/${COLLECTIONS[kind]}/${id}`,
      { method: "DELETE" },
    );
    if (!res.ok && res.status !== 204) throw new Error(await this.parseError(res));
  }
}
