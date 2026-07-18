import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { directusService } from "@/lib/directus";
import {
  interactionRequestsService,
  type InteractionRequest,
} from "@/lib/interactionRequests";
import { InteractionRequestModal } from "@/components/interaction-requests/InteractionRequestModal";

export const Route = createFileRoute("/interaction-requests")({
  head: () => ({
    meta: [
      { title: "Certbuddy - Interaction Requests" },
      {
        name: "description",
        content: "Review and answer pending interaction requests.",
      },
    ],
  }),
  component: InteractionRequestsPage,
});

function InteractionRequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<InteractionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<InteractionRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await interactionRequestsService.listNew();
      setItems(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!directusService.isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }
    void load();
  }, [load, navigate]);

  const totalNew = items.length;

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const ta = a.date_created ? new Date(a.date_created).getTime() : 0;
      const tb = b.date_created ? new Date(b.date_created).getTime() : 0;
      return tb - ta;
    });
  }, [items]);

  function openRequest(item: InteractionRequest) {
    setSelectedRequest(item);
    setModalOpen(true);
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Interaction Requests</h1>
            <nav className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Pending requests</CardTitle>
              <CardDescription>
                Review requests that are waiting for your action.
              </CardDescription>
            </div>
            <Badge variant={totalNew > 0 ? "default" : "secondary"}>
              {totalNew} new
            </Badge>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No pending interaction requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.type ?? "unknown"}</TableCell>
                      <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">
                        {buildSummary(item)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.date_created ? new Date(item.date_created).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.status ?? "new"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => openRequest(item)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <InteractionRequestModal
        request={selectedRequest}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            setSelectedRequest(null);
          }
        }}
        onActionCompleted={load}
      />
    </main>
  );
}

function buildSummary(item: InteractionRequest): string {
  if (item.type === "dns_change" && item.request_data && typeof item.request_data === "object") {
    const payload = item.request_data as {
      domain?: string;
      record_name?: string;
      record_type?: string;
    };
    const domain = payload.domain ?? "unknown domain";
    const recordName = payload.record_name ?? "record";
    const recordType = payload.record_type ?? "TXT";
    return `${recordType} ${recordName} for ${domain}`;
  }

  return "Open to review request details.";
}
