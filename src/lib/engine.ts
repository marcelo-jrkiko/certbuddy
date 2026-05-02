import { directusService } from "./directus";
import { BackendClient } from "./backend_client";

export type EngineOption = { key: string; name: string; type?: string };

class EngineService extends BackendClient {
  private async fetchOptions(path: string): Promise<EngineOption[]> {
    const res = await directusService.fetchWithAuth(
      `${this.getApiUrl()}${path}`,
      { method: "GET" },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = (await res.json()) as Record<
      string,
      { name: string; type?: string }
    >;
    return Object.entries(data).map(([key, v]) => ({
      key,
      name: v.name,
      type: v.type,
    }));
  }

  public listAvailableChallenges() {
    return this.fetchOptions("/engine/available_challenges");
  }

  public listAvailableCAs() {
    return this.fetchOptions("/engine/available_cas");
  }
}

export const engineService = new EngineService();
