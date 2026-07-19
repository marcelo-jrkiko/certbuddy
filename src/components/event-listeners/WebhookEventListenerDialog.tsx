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
import { Input } from "@/components/ui/input";
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

const HANDLER_TYPE: EventHandlerType = "webhook";

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

const parseJsonObject = (value: string, label: string): Record<string, unknown> | null => {
  if (!value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    toast.error(`${label} must be a JSON object`);
    return null;
  } catch {
    toast.error(`Invalid JSON in ${label.toLowerCase()}`);
    return null;
  }
};

export function WebhookEventListenerDialog({ open, onOpenChange, item, onSaved }: Props) {
  const [eventIds, setEventIds] = useState<EventIdOption[]>([]);
  const [name, setName] = useState("");
  const [eventId, setEventId] = useState("");
  const [url, setUrl] = useState("");
  const [method, setMethod] = useState("POST");
  const [headers, setHeaders] = useState("{}");
  const [query, setQuery] = useState("{}");
  const [timeoutSeconds, setTimeoutSeconds] = useState("10");
  const [extraParams, setExtraParams] = useState("{}");
  const [eventCode, setEventCode] = useState('{\n  "event": "{{event_id}}",\n  "listener_id": "{{listener_id}}",\n  "payload": {{payload}}\n}');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    const params = (item?.event_params ?? {}) as Record<string, unknown>;
    const { headers: rawHeaders, query: rawQuery, timeout_seconds, url: pUrl, method: pMethod, ...rest } = params;

    setName(item?.name ?? "");
    setEventId(item?.event_id ?? "");
    setUrl(typeof pUrl === "string" ? pUrl : "");
    setMethod(typeof pMethod === "string" ? pMethod.toUpperCase() : "POST");
    setHeaders(prettyJson(rawHeaders));
    setQuery(prettyJson(rawQuery));
    setTimeoutSeconds(timeout_seconds != null ? String(timeout_seconds) : "10");
    setExtraParams(prettyJson(rest));
    setEventCode(item?.event_code ?? '{\n  "event": "{{event_id}}",\n  "listener_id": "{{listener_id}}",\n  "payload": {{payload}}\n}');

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
    if (!url.trim()) {
      toast.error("URL is required");
      return;
    }

    const parsedHeaders = parseJsonObject(headers, "Headers");
    if (!parsedHeaders) return;

    const parsedQuery = parseJsonObject(query, "Query params");
    if (!parsedQuery) return;

    const parsedExtra = parseJsonObject(extraParams, "Extra params");
    if (!parsedExtra) return;

    const timeout = Number(timeoutSeconds);
    if (Number.isNaN(timeout) || timeout <= 0) {
      toast.error("Timeout must be a positive number");
      return;
    }

    const params: Record<string, unknown> = {
      ...parsedExtra,
      url,
      method,
      headers: parsedHeaders,
      query: parsedQuery,
      timeout_seconds: timeout,
    };

    setSaving(true);
    try {
      const payload: Partial<EventListener> = {
        name: name.trim(),
        event_id: eventId,
        handler: HANDLER_TYPE,
        event_params: params,
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{item ? "Edit" : "Create"} webhook listener</DialogTitle>
          <DialogDescription>
            Send an HTTP request when this event is dispatched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <EventListenerNameField value={name} onChange={setName} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
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
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Headers JSON</Label>
              <Textarea
                value={headers}
                onChange={(e) => setHeaders(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Query Params JSON</Label>
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Request Body Template (event_code)</Label>
            <Textarea
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value)}
              rows={9}
              className="font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                min={1}
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Extra Params JSON</Label>
              <Textarea
                value={extraParams}
                onChange={(e) => setExtraParams(e.target.value)}
                rows={4}
                className="font-mono text-xs"
                placeholder={JSON.stringify({ body_format: "json", verify_ssl: true }, null, 2)}
              />
            </div>
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
