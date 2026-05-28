import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { directusService } from "@/lib/directus";
import certbuddyLogo from "@/assets/Certbuddy.png";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    const params: {
      token?: string;
      registered?: string;
      email?: string;
    } = {};

    if (typeof search.token === "string") {
      params.token = search.token;
    }
    if (typeof search.registered === "string") {
      params.registered = search.registered;
    }
    if (typeof search.email === "string") {
      params.email = search.email;
    }

    return params;
  },
  head: () => ({
    meta: [
      { title: "Certbuddy - Sign in" },
      { name: "description", content: "Sign in to access your dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { token, registered, email: prefilledEmail } = Route.useSearch();
  const [email, setEmail] = useState(prefilledEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runAutoLogin() {      
      if (directusService.isAuthenticated()) {
        await navigate({ to: "/dashboard" });
        return;
      }

      if (!import.meta.env.VITE_ALLOW_AUTO_LOGIN) return; 

      if (!token) return;

      setError(null);
      setIsAutoLoggingIn(true);
      try {
        await directusService.loginWithToken(token);
        if (!cancelled) {
          await navigate({ to: "/dashboard", replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Auto login failed");
        }
      } finally {
        if (!cancelled) {
          setIsAutoLoggingIn(false);
        }
      }
    }

    runAutoLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await directusService.login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <img src={certbuddyLogo} alt="Certbuddy Logo" className="h-12 w-auto mb-4 mx-auto" />
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in with your Certbuddy account.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAutoLoggingIn ? (
            <p className="text-sm text-muted-foreground">Signing you in automatically...</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {registered === "1" && !error && (
                <p className="text-sm text-emerald-600" role="status">
                  Account created successfully. You can sign in now.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <Link to="/register" className="hover:underline">Create account</Link>
                {" | "}
                <Link to="/" className="hover:underline">Back to home</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
