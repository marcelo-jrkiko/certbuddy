// Lightweight Directus auth service (no SDK required).
// Stores access + refresh tokens in localStorage.

import { BackendClient, UserSession } from "./backend_client";

export type DirectusUser = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type UpdateCurrentUserInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
};

export class DirectusService extends BackendClient {

  public async loginWithToken(token: string): Promise<void> {
    const cleanedToken = token.trim();
    if (!cleanedToken) throw new Error("Missing login token.");

    const res = await fetch(
      `${this.getApiUrl()}/users/me?fields=id,email,first_name,last_name,avatar`,
      {
        headers: {
          Authorization: `Bearer ${cleanedToken}`,
        },
      },
    );

    if (!res.ok) {
      throw new Error("Invalid or expired login token.");
    }

    this.setSession({
      access_token: cleanedToken,
      refresh_token: "",
      // Tokens passed by query param may not include refresh capability.
      expires_at: Date.now() + 55 * 60 * 1000,
    });
  }

  public async authFetch(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    let session = this.getSession();
    if (!session) throw new Error("Not authenticated");

    // Refresh if expiring within 30s
    if (session.expires_at - Date.now() < 30_000) {
      session = (await this.refresh()) ?? session;
    }

    const res = await fetch(`${this.getApiUrl()}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${session!.access_token}`,
      },
    });

    if (res.status === 401) {
      const refreshed = await this.refresh();
      if (!refreshed) throw new Error("Session expired");
      return fetch(`${this.getApiUrl()}${path}`, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${refreshed.access_token}`,
        },
      });
    }
    return res;
  }

  protected getApiUrl(): string {
    const url = import.meta.env.VITE_DIRECTUS_URL as string | undefined;
    if (!url) {
      throw new Error(
        "VITE_DIRECTUS_URL is not configured. Set it in your environment.",
      );
    }
    return url.replace(/\/$/, "");
  }

  public async login(email: string, password: string): Promise<void> {
    const res = await fetch(`${this.getApiUrl()}/auth/login`, {
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
    this.setSession(this.toSession(data));
  }

  public async register(input: RegisterUserInput): Promise<void> {
    const payload: Record<string, string> = {
      email: input.email,
      password: input.password,
    };

    if (input.firstName?.trim()) {
      payload.first_name = input.firstName.trim();
    }
    if (input.lastName?.trim()) {
      payload.last_name = input.lastName.trim();
    }

    const res = await fetch(`${this.getApiUrl()}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.errors?.[0]?.message || "Failed to create account.",
      );
    }
  }

  public async refresh(): Promise<UserSession | null> {
    const current = this.getSession();
    if (!current?.refresh_token) return null;
    const res = await fetch(`${this.getApiUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: current.refresh_token,
        mode: "json",
      }),
    });
    if (!res.ok) {
      this.clearSession();
      return null;
    }
    const { data } = await res.json();
    const session = this.toSession(data);
    this.setSession(session);
    return session;
  }

  public async getCurrentUser(): Promise<DirectusUser> {
    const res = await this.authFetch(
      "/users/me?fields=id,email,first_name,last_name,avatar",
    );
    if (!res.ok) throw new Error("Failed to load user");
    const { data } = await res.json();
    return data as DirectusUser;
  }

  public async updateCurrentUser(
    input: UpdateCurrentUserInput,
  ): Promise<DirectusUser> {
    const payload: Record<string, string> = {
      email: input.email,
      first_name: input.firstName ?? "",
      last_name: input.lastName ?? "",
    };

    if (input.password) {
      payload.password = input.password;
    }

    const res = await this.authFetch("/users/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        err?.errors?.[0]?.message || "Failed to update account details.",
      );
    }

    const { data } = await res.json();
    return data as DirectusUser;
  }

  public async logout(): Promise<void> {
    const session = this.getSession();
    if (session?.refresh_token) {
      await fetch(`${this.getApiUrl()}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refresh_token: session.refresh_token,
          mode: "json",
        }),
      }).catch(() => { });
    }
    this.clearSession();
  }

  public isAuthenticated(): boolean {
    return !!this.getSession();
  }
}

// Singleton instance for easy access
export const directusService = new DirectusService();
