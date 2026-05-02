import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  directusService,
  type DirectusUser,
} from "@/lib/directus";
import { certificatesService, type Certificate } from "@/lib/certificates";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "description", content: "Your account dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<DirectusUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [certsLoading, setCertsLoading] = useState(true);
  const [certsError, setCertsError] = useState<string | null>(null);

  useEffect(() => {
    if (!directusService.isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }

    directusService.getCurrentUser()
      .then(setUser)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load user");
        navigate({ to: "/login" });
      })
      .finally(() => setLoading(false));

    certificatesService
      .listCertificates()
      .then(setCerts)
      .catch((e) =>
        setCertsError(
          e instanceof Error ? e.message : "Failed to load certificates",
        ),
      )
      .finally(() => setCertsLoading(false));
  }, [navigate]);

  async function handleLogout() {
    await directusService.logout();
    navigate({ to: "/login" });
  }

  const fullName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email
    : "";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/certificates">Certificates</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/configs">Configurations</Link>
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome{user ? `, ${fullName}` : ""}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : user ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">User ID</dt>
                  <dd className="font-mono text-xs">{user.id}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>Overview of your certificates.</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/certificates">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {certsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : certsError ? (
              <p className="text-sm text-destructive">{certsError}</p>
            ) : certs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certificates yet.{" "}
                <Link to="/certificates" className="underline">
                  Add one
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Common name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expired</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certs.map((c) => {
                    const expired =
                      !!c.expires_at &&
                      new Date(c.expires_at).getTime() < Date.now();
                    return (
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
                          {expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
