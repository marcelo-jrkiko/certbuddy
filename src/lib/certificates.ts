import { getSession, refresh } from "./directus";

export type Certificate = {
  id: string;
  common_name: string;
  tags: string[] | null;
  is_active: boolean;
  date_created: string;
  date_updated: string | null;
};

function getApiUrl(): string {
  const url = import.meta.env.VITE_BACKEND_API_URL as string | undefined;
  if (!url) throw new Error("VITE_BACKEND_API_URL is not configured.");
  return url.replace(/\/$/, "");
}

async function getToken(): Promise<string> {
  let session = getSession();
  if (!session) throw new Error("Not authenticated");
  if (session.expires_at - Date.now() < 30_000) {
    session = (await refresh()) ?? session;
  }
  return session.access_token;
}

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${getApiUrl()}${path}`, { ...init, headers });
  if (res.status === 401) {
    const refreshed = await refresh();
    if (refreshed) {
      headers.set("Authorization", `Bearer ${refreshed.access_token}`);
      return fetch(`${getApiUrl()}${path}`, { ...init, headers });
    }
  }
  return res;
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || data?.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function listCertificates(): Promise<Certificate[]> {
  const res = await apiFetch("/certificates/", { method: "GET" });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function uploadCertificate(params: {
  commonName: string;
  certificateFile: File;
  certificateKey: File;
  tags?: string[];
}): Promise<void> {
  const token = await getToken();
  const form = new FormData();
  form.append("certificate_file", params.certificateFile);
  form.append("certificate_key", params.certificateKey);
  if (params.tags && params.tags.length > 0) {
    form.append("tags", JSON.stringify(params.tags));
  }
  const res = await fetch(
    `${getApiUrl()}/certificates/${encodeURIComponent(params.commonName)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteCertificate(id: string): Promise<void> {
  const res = await apiFetch(`/certificates/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function activateCertificate(id: string): Promise<void> {
  const res = await apiFetch(
    `/certificates/${encodeURIComponent(id)}/activate`,
    { method: "PATCH" },
  );
  if (!res.ok) throw new Error(await parseError(res));
}
