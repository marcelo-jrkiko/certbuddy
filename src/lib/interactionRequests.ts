import { components } from "../../shared/Schema";
import { directusService } from "./directus";

export type InteractionRequest = components["schemas"]["ItemsInteractionRequest"];

export class InteractionRequestsService {
  async listNew(): Promise<InteractionRequest[]> {
    const filter = encodeURIComponent(JSON.stringify({ status: { _eq: "new" } }));
    const sort = encodeURIComponent("-date_created");
    const fields = encodeURIComponent(
      "id,date_created,date_updated,user,status,type,request_data,response_data",
    );

    const res = await directusService.authFetch(
      `/items/interaction_request?filter=${filter}&sort=${sort}&fields=${fields}&limit=-1`,
    );

    if (!res.ok) {
      throw new Error("Failed to load interaction requests.");
    }

    const { data } = await res.json();
    return Array.isArray(data) ? (data as InteractionRequest[]) : [];
  }

  async answerRequest(
    id: string,
    responseData: Record<string, unknown> = {},
  ): Promise<InteractionRequest> {
    return this.updateRequest(id, {
      status: "answer",
      response_data: responseData,
    });
  }

  async rejectRequest(id: string, reason?: string): Promise<InteractionRequest> {
    const baseResponseData = reason?.trim() ? { reason: reason.trim() } : {};
    return this.updateRequest(id, {
      status: "rejected",
      response_data: {
        ...baseResponseData,
        rejected_at: new Date().toISOString(),
      },
    });
  }

  private async updateRequest(
    id: string,
    payload: Record<string, unknown>,
  ): Promise<InteractionRequest> {
    const res = await directusService.authFetch(`/items/interaction_request/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let message = "Failed to update interaction request.";
      try {
        const data = await res.json();
        const directusMessage = data?.errors?.[0]?.message;
        if (typeof directusMessage === "string" && directusMessage.trim()) {
          message = directusMessage;
        }
      } catch {
        // Keep default message when response is not JSON.
      }
      throw new Error(message);
    }

    const { data } = await res.json();
    return data as InteractionRequest;
  }
}

export const interactionRequestsService = new InteractionRequestsService();
