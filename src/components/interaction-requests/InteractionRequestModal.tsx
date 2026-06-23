import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  interactionRequestsService,
  type InteractionRequest,
} from "@/lib/interactionRequests";
import { DnsChangeRequestContent } from "./modals/DnsChangeRequestContent";
import { UnsupportedInteractionRequestContent } from "./modals/UnsupportedInteractionRequestContent";

export function InteractionRequestModal({
  request,
  open,
  onOpenChange,
  onActionCompleted,
}: {
  request: InteractionRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionCompleted: () => Promise<void> | void;
}) {
  const [busyAction, setBusyAction] = useState<"confirm" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const requestId = request?.id ?? "";
  const requestType = request?.type ?? "unknown";

  const content = useMemo(() => {
    if (!request) return null;

    if (request.type === "dns_change") {
      return <DnsChangeRequestContent requestData={request.request_data} />;
    }

    return (
      <UnsupportedInteractionRequestContent
        type={request.type}
        requestData={request.request_data}
      />
    );
  }, [request]);

  async function handleConfirm() {
    if (!requestId) return;
    setBusyAction("confirm");
    try {
      await interactionRequestsService.answerRequest(requestId, {
        answered_at: new Date().toISOString(),
      });
      toast.success("Interaction request confirmed.");
      setRejectReason("");
      onOpenChange(false);
      await onActionCompleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to confirm request.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    if (!requestId) return;
    setBusyAction("reject");
    try {
      await interactionRequestsService.rejectRequest(requestId, rejectReason);
      toast.success("Interaction request rejected.");
      setRejectReason("");
      onOpenChange(false);
      await onActionCompleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject request.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setRejectReason("");
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interaction request</DialogTitle>
          <DialogDescription>
            Type: <span className="font-mono text-xs">{requestType}</span>
          </DialogDescription>
        </DialogHeader>

        {content}

        <div className="space-y-2">
          <Label htmlFor="reject-reason">Reject reason (optional)</Label>
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this request was rejected..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busyAction}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!!busyAction || !requestId}
          >
            {busyAction === "reject" ? "Rejecting..." : "Reject"}
          </Button>
          <Button onClick={handleConfirm} disabled={!!busyAction || !requestId}>
            {busyAction === "confirm" ? "Confirming..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
