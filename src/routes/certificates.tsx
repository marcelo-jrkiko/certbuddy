import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { isAuthenticated } from "@/lib/directus";
import {
  activateCertificate,
  deleteCertificate,
  listCertificates,
  uploadCertificate,
  type Certificate,
} from "@/lib/certificates";
import { CheckCircle2, Trash2, Upload, Plus } from "lucide-react";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "Certificates" },
      {
        name: "description",
        content: "Manage your SSL/TLS certificates: upload, activate, delete.",
      },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }
    void load();
  }, [navigate]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCertificates();
      setCerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivate(c: Certificate) {
    setBusyId(c.id);
    try {
      await activateCertificate(c.id);
      toast.success(`Activated ${c.common_name}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await deleteCertificate(deleteTarget.id);
      toast.success(`Deleted ${deleteTarget.common_name}`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Certificates</h1>
            <nav className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Your certificates</CardTitle>
            <CardDescription>
              Upload, activate, or remove certificates issued to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload certificate
                  </Button>
                </DialogTrigger>
                <UploadDialog
                  onClose={() => setUploadOpen(false)}
                  onUploaded={async () => {
                    setUploadOpen(false);
                    await load();
                  }}
                />
              </Dialog>
            </div>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : certs.length === 0 ? (
              <div className="rounded-md border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No certificates yet. Upload your first one to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Common name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certs.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.common_name}
                        </TableCell>
                        <TableCell>
                          {c.is_active ? (
                            <Badge className="bg-primary text-primary-foreground">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(c.tags ?? []).map((t) => (
                              <Badge key={t} variant="outline">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {c.date_created
                            ? new Date(c.date_created).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {c.expires_at
                            ? new Date(c.expires_at).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!c.is_active && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === c.id}
                                onClick={() => handleActivate(c)}
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Activate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={busyId === c.id}
                              onClick={() => setDeleteTarget(c)}
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete certificate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget?.common_name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function UploadDialog({
  onClose,
  onUploaded,
}: {
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [commonName, setCommonName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const certRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const certFile = certRef.current?.files?.[0];
    const keyFile = keyRef.current?.files?.[0];
    if (!commonName.trim()) {
      toast.error("Common name is required");
      return;
    }
    if (!certFile || !keyFile) {
      toast.error("Both certificate and key files are required");
      return;
    }
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await uploadCertificate({
        commonName: commonName.trim(),
        certificateFile: certFile,
        certificateKey: keyFile,
        tags,
      });
      toast.success("Certificate uploaded");
      setCommonName("");
      setTagsInput("");
      if (certRef.current) certRef.current.value = "";
      if (keyRef.current) keyRef.current.value = "";
      onUploaded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Upload certificate</DialogTitle>
        <DialogDescription>
          Provide the common name and upload both the certificate and private
          key files.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="common_name">Common name</Label>
          <Input
            id="common_name"
            placeholder="example.com"
            value={commonName}
            onChange={(e) => setCommonName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert_file">Certificate file (.crt / .pem)</Label>
          <Input
            id="cert_file"
            type="file"
            accept=".crt,.pem,.cer,application/x-x509-ca-cert,application/pkix-cert"
            ref={certRef}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="key_file">Private key file (.key)</Label>
          <Input
            id="key_file"
            type="file"
            accept=".key,.pem"
            ref={keyRef}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma separated)</Label>
          <Input
            id="tags"
            placeholder="prod, web"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
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
            <Upload className="mr-2 h-4 w-4" />
            {submitting ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
