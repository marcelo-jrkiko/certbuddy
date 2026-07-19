import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { directusService } from "@/lib/directus";
import {
  eventListenersService,
  eventsService,
  type EventListener,
  type EventHandlerType,
  type EventIdOption,
} from "@/lib/eventListeners";
import { ShellEventListenerDialog } from "@/components/event-listeners/ShellEventListenerDialog";
import { WebhookEventListenerDialog } from "@/components/event-listeners/WebhookEventListenerDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/event-listeners")({
  head: () => ({
    meta: [
      { title: "Certbuddy - Event Listeners" },
      { name: "description", content: "Manage event listeners and their handlers." },
    ],
  }),
  component: EventListenersPage,
});

function EventListenersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EventListener[]>([]);
  const [eventIds, setEventIds] = useState<EventIdOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [shellEditorOpen, setShellEditorOpen] = useState(false);
  const [webhookEditorOpen, setWebhookEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EventListener | null>(null);
  const [deleteItem, setDeleteItem] = useState<EventListener | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, eids] = await Promise.all([
        eventListenersService.list(),
        eventsService.listEventIds(),
      ]);
      setItems(list);
      setEventIds(eids);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!directusService.isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }
    load();
  }, [load, navigate]);

  const getHandlerType = (item: EventListener): EventHandlerType | "unknown" => {
    const value = (item.handler ?? "").toString().toLowerCase();
    if (value === "shell_script") return "shell_script";
    if (value === "webhook") return "webhook";
    return "unknown";
  };

  const handlerBadgeLabel = (handler: EventHandlerType | "unknown") => {
    if (handler === "shell_script") return "Shell Script";
    if (handler === "webhook") return "Webhook";
    return "Unknown";
  };

  const listenerDetails = (item: EventListener) => {
    const handler = getHandlerType(item);
    if (handler === "webhook") {
      const params = item.event_params as Record<string, unknown> | null;
      const url = params && typeof params.url === "string" ? params.url : null;
      return url || "No URL configured";
    }
    if (handler === "shell_script") {
      const firstLine = (item.event_code ?? "").split("\n").map((line) => line.trim()).find((line) => line.length > 0);
      return firstLine || "No script configured";
    }
    return "Unsupported handler type";
  };

  const eventDesc = (key?: string | null) =>
    eventIds.find((e) => e.key === key)?.description ?? "";

  const openNew = (type: EventHandlerType) => {
    setEditingItem(null);
    if (type === "shell_script") {
      setShellEditorOpen(true);
      return;
    }
    setWebhookEditorOpen(true);
  };

  const openEdit = (item: EventListener) => {
    setEditingItem(item);
    const handler = getHandlerType(item);
    if (handler === "shell_script") {
      setShellEditorOpen(true);
      return;
    }
    if (handler === "webhook") {
      setWebhookEditorOpen(true);
      return;
    }
    toast.error("Unsupported handler type for this listener");
  };

  const confirmDelete = async () => {
    if (!deleteItem?.id) return;
    try {
      await eventListenersService.remove(deleteItem.id);
      toast.success("Deleted");
      setDeleteItem(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Event Listeners</h1>
          <p className="text-muted-foreground text-sm">
            Bind system events to local handlers.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All listeners</CardTitle>
            <CardDescription>
              Each listener executes a handler when its event fires.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openNew("shell_script")}>+ Shell Listener</Button>
            <Button variant="secondary" onClick={() => openNew("webhook")}>
              + Webhook Listener
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Handler</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No event listeners yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="text-sm">{it.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{it.event_id ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {eventDesc(it.event_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{handlerBadgeLabel(getHandlerType(it))}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(it)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteItem(it)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ShellEventListenerDialog
        open={shellEditorOpen}
        onOpenChange={setShellEditorOpen}
        item={editingItem}
        onSaved={load}
      />

      <WebhookEventListenerDialog
        open={webhookEditorOpen}
        onOpenChange={setWebhookEditorOpen}
        item={editingItem}
        onSaved={load}
      />

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event listener?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
