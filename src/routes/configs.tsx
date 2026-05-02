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
  ConfigsService,
  type ConfigKind,
} from "@/lib/configs";
import { ConfigsTable, type ConfigRow } from "@/components/configs/ConfigsTable";
import { ConfigEditorDialog } from "@/components/configs/ConfigEditorDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/configs")({
  head: () => ({
    meta: [
      { title: "Configurations" },
      {
        name: "description",
        content: "Manage challenges, CAs and shared configurations.",
      },
    ],
  }),
  component: ConfigsPage,
});

function ConfigsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKind, setEditorKind] = useState<ConfigKind>("challenge");
  const [editorItem, setEditorItem] = useState<any | null>(null);
  const [deleteRow, setDeleteRow] = useState<ConfigRow | null>(null);

  const configsService = new ConfigsService();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [challenges, cas, shared] = await Promise.all([
        configsService.listItems<any>("challenge"),
        configsService.listItems<any>("ca"),
        configsService.listItems<any>("shared"),
      ]);
      const next: ConfigRow[] = [
        ...challenges.map((i) => ({
          id: i.id,
          kind: "challenge" as const,
          key: i.challenge_key ?? "",
          domain: i.domain,
          merged_config: i.merged_config,
          raw: i,
        })),
        ...cas.map((i) => ({
          id: i.id,
          kind: "ca" as const,
          key: i.ca_key ?? "",
          domain: i.domain,
          merged_config: i.merged_config,
          raw: i,
        })),
        ...shared.map((i) => ({
          id: i.id,
          kind: "shared" as const,
          key: i.key ?? "",
          domain: i.domain,
          merged_config: null,
          raw: i,
        })),
      ];
      setRows(next);
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

  const openNew = (kind: ConfigKind) => {
    setEditorKind(kind);
    setEditorItem(null);
    setEditorOpen(true);
  };

  const openEdit = (row: ConfigRow) => {
    setEditorKind(row.kind);
    setEditorItem(row.raw);
    setEditorOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await configsService.deleteItem(deleteRow.kind, deleteRow.id);
      toast.success("Deleted");
      setDeleteRow(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configurations</h1>
          <p className="text-muted-foreground text-sm">
            Manage challenges, certificate authorities and shared configs.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>All configurations</CardTitle>
            <CardDescription>
              Combined view of challenge, CA and shared configurations.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openNew("challenge")}>+ Challenge</Button>
            <Button onClick={() => openNew("ca")} variant="secondary">
              + CA
            </Button>
            <Button onClick={() => openNew("shared")} variant="outline">
              + Shared
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ConfigsTable
            rows={rows}
            loading={loading}
            onEdit={openEdit}
            onDelete={(r) => setDeleteRow(r)}
          />
        </CardContent>
      </Card>

      <ConfigEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        kind={editorKind}
        item={editorItem}
        onSaved={load}
      />

      <AlertDialog
        open={!!deleteRow}
        onOpenChange={(o) => !o && setDeleteRow(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
