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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { directusService } from "@/lib/directus";
import { components } from "../../../shared/Schema";

type CertificateRequest = components["schemas"]["ItemsCertificateRequest"];

const REFRESH_MS = 60_000;

function getRequestError(r: CertificateRequest): string | null {
  const cfg = r.config as Record<string, unknown> | null | undefined;
  if (cfg && typeof cfg === "object" && "error" in cfg) {
    const e = (cfg as Record<string, unknown>).error;
    if (e == null) return null;
    return typeof e === "string" ? e : JSON.stringify(e, null, 2);
  }
  return null;
}

function statusVariant(status?: string | null) {
  switch (status) {
    case "failed":
    case "rejected":
      return "destructive" as const;
    case "processing":
      return "default" as const;
    case "pending":
    default:
      return "secondary" as const;
  }
}

export function CertificateRequestsTable() {
  const [items, setItems] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await directusService.authFetch(
        `/items/certificate_request?fields=*&limit=-1&filter[status][_neq]=issued&sort=-date_created`,
      );
      if (!res.ok) throw new Error("Failed to load requests");
      const { data } = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>Certificate requests</CardTitle>
          <CardDescription>
            Pending and in-progress requests. Auto-refreshes every minute.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No pending requests.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Challenge</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.domain ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {r.status ?? "unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.challenge_type ?? "—"}</TableCell>
                    <TableCell>{r.certificate_authority ?? "—"}</TableCell>
                    <TableCell>{r.type ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {r.date_created
                        ? new Date(r.date_created).toLocaleString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
