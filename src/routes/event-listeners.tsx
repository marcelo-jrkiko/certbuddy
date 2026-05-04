import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
  type EventListener,
  type DirectusFlow,
  type EventIdOption,
} from "@/lib/eventListeners";
import { EventListenerDialog } from "@/components/event-listeners/EventListenerDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/event-listeners")({
  head: () => ({
    meta: [
      { title: "Certbuddy - Event Listeners" },
      { name: "description", content: "Manage event listeners that trigger Directus flows." },
    ],
  }),
  component: EventListenersPage,
});

function EventListenersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EventListener[]>([]);
  const [flows, setFlows] = useState<DirectusFlow[]>([]);
  const [eventIds, setEventIds] = useState<EventIdOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<EventListener | null>(null);
  const [deleteItem, setDeleteItem] = useState<EventListener | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, fls, eids] = await Promise.all([
        eventListenersService.list(),
        eventListenersService.listFlows(),
        eventListenersService.listEventIds(),
      ]);
      setItems(list);
      setFlows(fls);
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

  const flowName = (id?: string | null) =>
    flows.find((f) => f.id === id)?.name ?? id ?? "—";
  const eventDesc = (key?: string | null) =>
    eventIds.find((e) => e.key === key)?.description ?? "";

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (item: EventListener) => {
    setEditing(item);
    setEditorOpen(true);
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
            Bind system events to Directus flows.
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
              Each listener triggers a flow when its event fires.
            </CardDescription>
          </div>
          <Button onClick={openNew}>+ New listener</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Flow</TableHead>
                <TableHead className="w-[160px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No event listeners yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.event_id ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {eventDesc(it.event_id)}
                    </TableCell>
                    <TableCell>{flowName(it.event_flow)}</TableCell>
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

      <EventListenerDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        item={editing}
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
