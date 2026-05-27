import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AccountDetailsForm,
  type AccountDetailsFormValues,
} from "@/components/account/AccountDetailsForm";
import { directusService, type DirectusUser } from "@/lib/directus";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Certbuddy - Account" },
      {
        name: "description",
        content: "Manage your account details.",
      },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<DirectusUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!directusService.isAuthenticated()) {
      navigate({ to: "/login" });
      return;
    }

    directusService
      .getCurrentUser()
      .then((u) => {
        setUser(u);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load account.");
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function onSubmit(values: AccountDetailsFormValues) {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const updated = await directusService.updateCurrentUser({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        password: values.password,
      });
      setUser(updated);
      setSuccess("Account details updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Account</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile details and password.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>
              Update your name, email, and password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : user ? (
              <AccountDetailsForm
                mode="manage"
                initialValues={{
                  firstName: user.first_name,
                  lastName: user.last_name,
                  email: user.email,
                }}
                loading={saving}
                error={error}
                success={success}
                submitLabel="Save changes"
                onSubmit={onSubmit}
              />
            ) : (
              <p className="text-sm text-destructive">
                {error || "Could not load your account details."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
