import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCurrentUser,
  isAuthenticated,
  logout,
  type DirectusUser,
} from "@/lib/directus";

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

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }
    getCurrentUser()
      .then(setUser)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load user");
        navigate({ to: "/login" });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleLogout() {
    await logout();
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
            <Button variant="outline" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-5xl px-6 py-10">
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
      </section>
    </main>
  );
}
