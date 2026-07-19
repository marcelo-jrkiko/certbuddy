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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  eventListenersService,
  eventsService,
  type EventHandlerType,
  type EventIdOption,
  type EventListener,
} from "@/lib/eventListeners";
import { directusService } from "@/lib/directus";
import { EventListenerNameField } from "@/components/event-listeners/EventListenerNameField";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: EventListener | null;
  onSaved: () => void;
}

const HANDLER_TYPE: EventHandlerType = "shell_script";

const prettyJson = (value: unknown): string => {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "{}";
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
};

export function ShellEventListenerDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [eventIds, setEventIds] = useState<EventIdOption[]>([]);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [eventParams, setEventParams] = useState("{}");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setName(item?.name ?? "");
    setEventId(item?.event_id ?? "");
    setEventCode(item?.event_code ?? "");
    setEventParams(prettyJson(item?.event_params));

    eventsService
      .listEventIds()
      .then(setEventIds)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load options"));
  }, [open, item]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!eventId.trim()) {
      toast.error("Please select an event");
      return;
    }

    if (!eventCode.trim()) {
      toast.error("Script is required");
      return;
    }

    let parsedParams: Record<string, unknown> = {};
    try {
      const parsed = eventParams.trim() ? JSON.parse(eventParams) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedParams = parsed as Record<string, unknown>;
      } else {
        toast.error("event_params must be a JSON object");
        return;
      }
    } catch {
      toast.error("Invalid JSON in event params");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<EventListener> = {
        name: name.trim(),
        event_id: eventId,
        handler: HANDLER_TYPE,
        event_params: parsedParams,
        event_code: eventCode,
      };

      if (item?.id) {
        await eventListenersService.update(item.id, payload);
      } else {
        const user = await directusService.getCurrentUser();
        payload.event_user = user.id;
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit" : "Create"} shell listener</DialogTitle>
          <DialogDescription>
            Execute a bash script when this event is dispatched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <EventListenerNameField value={name} onChange={setName} />

          <div className="space-y-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select event..." />
              </SelectTrigger>
              <SelectContent>
                {eventIds.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Script (event_code)</Label>
            <Textarea
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              rows={10}
              placeholder={'echo "event={{event_id}} domain={{payload.domain}}"'}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label>Params JSON (event_params)</Label>
            <Textarea
              value={eventParams}
              onChange={(e) => setEventParams(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder={JSON.stringify({ timeout_seconds: 60, cwd: "/tmp", env: { DOMAIN: "{{payload.domain}}" } }, null, 2)}
            />
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
