import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Certificate } from "@/lib/certificates";

export function EditCertificateDialog({
  certificate,
  submitting,
  onClose,
  onSave,
}: {
  certificate: Certificate;
  submitting: boolean;
  onClose: () => void;
  onSave: (params: { tags: string[]; canRenew: boolean }) => void | Promise<void>;
}) {
  const [tagsInput, setTagsInput] = useState("");
  const [canRenew, setCanRenew] = useState(true);

  useEffect(() => {
    setTagsInput(((certificate.tags as string[] | null) ?? []).join(", "));
    setCanRenew(certificate.can_renew ?? true);
  }, [certificate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    await onSave({ tags, canRenew });
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit certificate</DialogTitle>
        <DialogDescription>
          Update metadata for <span className="font-medium">{certificate.common_name}</span>.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit_tags">Tags (comma separated)</Label>
          <Input
            id="edit_tags"
            placeholder="prod, web"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="edit_can_renew">Can renew</Label>
            <p className="text-sm text-muted-foreground">
              Allow this certificate to be renewed automatically.
            </p>
          </div>
          <Switch
            id="edit_can_renew"
            checked={canRenew}
            onCheckedChange={setCanRenew}
            disabled={submitting}
          />
        </div>
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
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
