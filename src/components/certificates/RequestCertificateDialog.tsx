import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { certificatesService } from "@/lib/certificates";
import { EngineActuatorSelect } from "@/components/base/EngineActuatorSelect";
import { DictionaryEditor } from "@/components/configs/DictionaryEditor";

export function RequestCertificateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [domain, setDomain] = useState("");
  const [challengeType, setChallengeType] = useState("");
  const [certificateAuthority, setCertificateAuthority] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({
    "tags" : "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) {
      toast.error("Domain is required");
      return;
    }
    if (!challengeType || !certificateAuthority) {
      toast.error("Challenge and CA are required");
      return;
    }
    setSubmitting(true);
    try {
      await certificatesService.requestCertificate({
        domain: domain.trim(),
        challenge_type: challengeType,
        certificate_authority: certificateAuthority,
        config,
      });
      toast.success("Certificate request submitted");
      setDomain("");
      setChallengeType("");
      setCertificateAuthority("");
      setConfig({});
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New certificate request</DialogTitle>
        <DialogDescription>
          Submit a new certificate request to the engine.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            required
          />
        </div>
        <EngineActuatorSelect
          kind="challenge"
          value={challengeType}
          onValueChange={setChallengeType}
          open={open}
        />
        <EngineActuatorSelect
          kind="ca"
          value={certificateAuthority}
          onValueChange={setCertificateAuthority}
          open={open}
        />
        <DictionaryEditor value={config} onChange={setConfig} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit request"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
