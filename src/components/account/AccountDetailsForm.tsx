import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type AccountDetailsFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
};

type AccountDetailsFormMode = "register" | "manage";

type AccountDetailsFormInitialValues = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type AccountDetailsFormProps = {
  mode: AccountDetailsFormMode;
  initialValues?: AccountDetailsFormInitialValues;
  loading?: boolean;
  error?: string | null;
  success?: string | null;
  submitLabel: string;
  onSubmit: (values: AccountDetailsFormValues) => Promise<void>;
  footer?: React.ReactNode;
};

export function AccountDetailsForm({
  mode,
  initialValues,
  loading = false,
  error,
  success,
  submitLabel,
  onSubmit,
  footer,
}: AccountDetailsFormProps) {
  const [firstName, setFirstName] = useState(initialValues?.firstName ?? "");
  const [lastName, setLastName] = useState(initialValues?.lastName ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(initialValues?.firstName ?? "");
    setLastName(initialValues?.lastName ?? "");
    setEmail(initialValues?.email ?? "");
  }, [initialValues?.email, initialValues?.firstName, initialValues?.lastName]);

  const hasPasswordField = mode === "register" || mode === "manage";
  const effectiveError = formError || error;

  const submitText = useMemo(() => {
    if (!loading) return submitLabel;
    return mode === "register" ? "Creating account..." : "Saving changes...";
  }, [loading, mode, submitLabel]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }

    const wantsPassword = password.length > 0 || confirmPassword.length > 0;

    if (mode === "register" && password.length < 8) {
      setFormError("Password must have at least 8 characters.");
      return;
    }

    if (mode === "manage" && wantsPassword && password.length < 8) {
      setFormError("New password must have at least 8 characters.");
      return;
    }

    if (mode === "register" && password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    if (mode === "manage" && wantsPassword && password !== confirmPassword) {
      setFormError("New password and confirmation do not match.");
      return;
    }

    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: trimmedEmail,
      password: wantsPassword ? password : undefined,
    });

    if (mode === "manage") {
      setPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>
      </div>

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

      {hasPasswordField && (
        <>
          <div className="space-y-2">
            <Label htmlFor="password">
              {mode === "register" ? "Password" : "New password (optional)"}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "off"}
              required={mode === "register"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">
              {mode === "register"
                ? "Confirm password"
                : "Confirm new password"}
            </Label>
            <Input
              id="confirm_password"
              type="password"
              autoComplete={mode === "register" ? "new-password" : "off"}
              required={mode === "register"}
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </>
      )}

      {effectiveError && (
        <p className="text-sm text-destructive" role="alert">
          {effectiveError}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-600" role="status">
          {success}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {submitText}
      </Button>

      {footer}
    </form>
  );
}
