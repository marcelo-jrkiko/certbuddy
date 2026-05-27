import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { directusService } from "@/lib/directus";
import { AccountDetailsForm, type AccountDetailsFormValues } from "@/components/account/AccountDetailsForm";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Certbuddy - Create account" },
      {
        name: "description",
        content: "Create your Certbuddy account to manage certificates.",
      },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (directusService.isAuthenticated()) {
      navigate({ to: "/dashboard" });
    }
  }, [navigate]);

  async function onSubmit(values: AccountDetailsFormValues) {
    setError(null);

    setLoading(true);
    try {
      await directusService.register({
        email: values.email,
        password: values.password ?? "",
        firstName: values.firstName,
        lastName: values.lastName,
      });

      await navigate({
        to: "/login",
        search: { registered: "1", email: values.email },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Register to start managing your certificates with Certbuddy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AccountDetailsForm
            mode="register"
            loading={loading}
            error={error}
            submitLabel="Create account"
            onSubmit={onSubmit}
            footer={(
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          />
        </CardContent>
      </Card>
    </main>
  );
}
