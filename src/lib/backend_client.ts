
export type UserSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
};


export class BackendClient {
    storageKey = "directus_auth";

    protected getApiUrl(): string {
        const url = import.meta.env.VITE_BACKEND_API_URL as string | undefined;
        if (!url) throw new Error("VITE_BACKEND_API_URL is not configured.");
        return url.replace(/\/$/, "");
    }

    protected async parseError(res: Response): Promise<string> {
        try {
            const data = await res.json();
            return data?.error || data?.message || `Request failed (${res.status})`;
        } catch {
            return `Request failed (${res.status})`;
        }
    }


    public getSession(): UserSession | null {
        if (typeof window === "undefined") return null;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return null;
            return JSON.parse(raw) as UserSession;
        } catch {
            return null;
        }
    }

    protected setSession(s: UserSession): void {
        localStorage.setItem(this.storageKey, JSON.stringify(s));
    }

    protected clearSession(): void {
        localStorage.removeItem(this.storageKey);
    }

    protected toSession(data: {
        access_token: string;
        refresh_token: string;
        expires: number;
    }): UserSession {
        return {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: Date.now() + data.expires,
        };
    }

    public async getToken(): Promise<string> {
        let session = this.getSession();
        if (!session) throw new Error("Not authenticated");
        return session.access_token;
    }


    public async fetchWithAuth(
        url: string,
        init: RequestInit = {},
    ): Promise<Response> {
        let session = this.getSession();
        if (!session) throw new Error("Not authenticated");

        const res = await fetch(url, {
            ...init,
            headers: {
                ...(init.headers || {}),
                Authorization: `Bearer ${session.access_token}`,
            },
        });

        if (res.status === 401) {
            throw new Error("Session expired");
        }
        return res;
    }
}