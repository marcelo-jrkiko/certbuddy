import { directusService } from "./directus";
import { BackendClient } from "./backend_client";

export type EngineActuatorOption = { key: string; name: string; type?: string; config_preset: Record<string, any> };

class EngineService extends BackendClient {
  private async fetchOptions(path: string): Promise<EngineActuatorOption[]> {
    const res = await directusService.fetchWithAuth(
      `${this.getApiUrl()}${path}`,
      { method: "GET" },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = (await res.json()) as EngineActuatorOption[];   
    return data;
  }

  public listAvailableChallenges() {
    return this.fetchOptions("/engine/available_challenges");
  }

  public listAvailableCAs() {
    return this.fetchOptions("/engine/available_cas");
  }
}

export const engineService = new EngineService();
