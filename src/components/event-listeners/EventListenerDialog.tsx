import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  eventListenersService,
  type EventListener,
  type DirectusFlow,
  type EventIdOption,
} from "@/lib/eventListeners";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EventListener | null;
  onSaved: () => void;
}

export function EventListenerDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [flows, setFlows] = useState<DirectusFlow[]>([]);
  const [eventIds, setEventIds] = useState<EventIdOption[]>([]);
  const [eventFlow, setEventFlow] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEventFlow(item?.event_flow ?? "");
    setEventId(item?.event_id ?? "");
    Promise.all([
      eventListenersService.listFlows(),
      eventListenersService.listEventIds(),
    ])
      .then(([f, e]) => {
        setFlows(f);
        setEventIds(e);
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load options"));
  }, [open, item]);

  const handleSave = async () => {
    if (!eventFlow || !eventId) {
      toast.error("Please select both a flow and an event");
      return;
    }
    setSaving(true);
    try {
      const payload = { event_flow: eventFlow, event_id: eventId };
      if (item?.id) {
        await eventListenersService.update(item.id, payload);
      } else {
        await eventListenersService.create(payload);
      }
      toast.success("Saved");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit" : "Create"} event listener</DialogTitle>
          <DialogDescription>
            Bind a Directus Flow to a system event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {eventIds.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    <div className="flex flex-col">
                      <span className="font-medium">{e.key}</span>
                      <span className="text-xs text-muted-foreground">{e.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Flow</Label>
            <Select value={eventFlow} onValueChange={setEventFlow}>
              <SelectTrigger>
                <SelectValue placeholder="Select flow..." />
              </SelectTrigger>
              <SelectContent>
                {flows.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
