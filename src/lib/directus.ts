// Lightweight Directus auth client (no SDK required).
// Stores access + refresh tokens in localStorage.

const STORAGE_KEY = "directus_auth";

export type DirectusSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
};

export type DirectusUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
};

function getDirectusUrl(): string {
  const url = import.meta.env.VITE_DIRECTUS_URL as string | undefined;
  if (!url) {
    throw new Error(
      "VITE_DIRECTUS_URL is not configured. Set it in your environment.",
    );
  }
  return url.replace(/\/$/, "");
}

export function getSession(): DirectusSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DirectusSession;
  } catch {
    return null;
  }
}

function setSession(s: DirectusSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function toSession(data: {
  access_token: string;
  refresh_token: string;
  expires: number;
}): DirectusSession {
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires,
  };
}

export async function login(email: string, password: string) {
  const res = await fetch(`${getDirectusUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, mode: "json" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.errors?.[0]?.message || "Invalid email or password.",
    );
  }
  const { data } = await res.json();
  setSession(toSession(data));
}

export async function refresh(): Promise<DirectusSession | null> {
  const current = getSession();
  if (!current?.refresh_token) return null;
  const res = await fetch(`${getDirectusUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: current.refresh_token, mode: "json" }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const { data } = await res.json();
  const session = toSession(data);
  setSession(session);
  return session;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let session = getSession();
  if (!session) throw new Error("Not authenticated");

  // Refresh if expiring within 30s
  if (session.expires_at - Date.now() < 30_000) {
    session = (await refresh()) ?? session;
  }

  const res = await fetch(`${getDirectusUrl()}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (res.status === 401) {
    const refreshed = await refresh();
    if (!refreshed) throw new Error("Session expired");
    return fetch(`${getDirectusUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${refreshed.access_token}`,
      },
    });
  }
  return res;
}

export async function getCurrentUser(): Promise<DirectusUser> {
  const res = await authFetch(
    "/users/me?fields=id,email,first_name,last_name,avatar",
  );
  if (!res.ok) throw new Error("Failed to load user");
  const { data } = await res.json();
  return data as DirectusUser;
}

export async function logout() {
  const session = getSession();
  if (session?.refresh_token) {
    await fetch(`${getDirectusUrl()}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token, mode: "json" }),
    }).catch(() => {});
  }
  clearSession();
}

export function isAuthenticated(): boolean {
  return !!getSession();
}
