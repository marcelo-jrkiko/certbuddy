import { directusService } from "./directus";
import { components } from "../../shared/Schema"
import { BackendClient } from "./backend_client";

export type Certificate = components["schemas"]["ItemsCertificates"];

export class CertificatesService extends BackendClient {
  public async listCertificates(): Promise<Certificate[]> {
    const res = await directusService.fetchWithAuth(
      `${this.getApiUrl()}/certificates/`,
      { method: "GET" },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }

  public async uploadCertificate(params: {
    commonName: string;
    certificateFile: File;
    certificateKey: File;
    tags?: string[];
  }): Promise<void> {
    const token = await directusService.getToken();
    const form = new FormData();
    form.append("certificate_file", params.certificateFile);
    form.append("certificate_key", params.certificateKey);
    if (params.tags && params.tags.length > 0) {
      form.append("tags", JSON.stringify(params.tags));
    }
    const res = await fetch(
      `${this.getApiUrl()}/certificates/${encodeURIComponent(params.commonName)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public async deleteCertificate(id: string): Promise<void> {
    const res = await directusService.fetchWithAuth(
      `${this.getApiUrl()}/certificates/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
  }

  public async activateCertificate(id: string): Promise<void> {
    const res = await directusService.fetchWithAuth(
      `${this.getApiUrl()}/certificates/${encodeURIComponent(id)}/activate`,
      { method: "PATCH" },
    );
    if (!res.ok) throw new Error(await this.parseError(res));
  }
}

// Singleton instance for easy access
export const certificatesService = new CertificatesService();
