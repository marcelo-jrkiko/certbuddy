import { directusService } from "./directus";

export type ConfigKind = "challenge" | "ca" | "shared";

export type SharedConfig = {
  id: string;
  key?: string | null;
  domain?: string | null;
  config?: Record<string, unknown> | null;
};

export type ChallengeConfig = {
  id: string;
  challenge_key?: string | null;
  domain?: string | null;
  config?: Record<string, unknown> | null;
  merged_config?: string | null;
};

export type CAConfig = {
  id: string;
  ca_key?: string | null;
  domain?: string | null;
  config?: Record<string, unknown> | null;
  merged_config?: string | null;
};

export const COLLECTIONS: Record<ConfigKind, string> = {
  challenge: "challenge_config",
  ca: "certificateauthority_config",
  shared: "shared_config",
};

function directusUrl(): string {
  const url = import.meta.env.VITE_DIRECTUS_URL as string | undefined;
  if (!url) throw new Error("VITE_DIRECTUS_URL not configured");
  return url.replace(/\/$/, "");
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.errors?.[0]?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function listItems<T = any>(
  kind: ConfigKind,
  fields = "*",
): Promise<T[]> {
  const collection = COLLECTIONS[kind];
  const res = await directusService.authFetch(
    `/items/${collection}?fields=${encodeURIComponent(fields)}&limit=-1`,
  );
  if (!res.ok) throw new Error(await parseError(res));
  const { data } = await res.json();
  return data as T[];
}

export async function createItem<T = any>(
  kind: ConfigKind,
  payload: Record<string, unknown>,
): Promise<T> {
  const res = await directusService.authFetch(`/items/${COLLECTIONS[kind]}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const { data } = await res.json();
  return data as T;
}

export async function updateItem<T = any>(
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
  if (!res.ok) throw new Error(await parseError(res));
  const { data } = await res.json();
  return data as T;
}

export async function deleteItem(kind: ConfigKind, id: string): Promise<void> {
  const res = await directusService.authFetch(
    `/items/${COLLECTIONS[kind]}/${id}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 204) throw new Error(await parseError(res));
}

// Silence unused if VITE_DIRECTUS_URL helper not used elsewhere
void directusUrl;
