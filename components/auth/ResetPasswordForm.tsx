"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (active) setReady(!authError && !!data.user);
    });
    return () => { active = false; };
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters for your new password.");
    if (password !== confirm) return setError("The passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(error.message);
        return;
      }
      await supabase.auth.signOut();
      router.replace("/login?password-reset=success");
      router.refresh();
    } catch {
      setError("We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (ready === null) {
    return <div className="rounded-lg border border-border bg-white p-6 text-sm text-ink-500">Checking your reset link…</div>;
  }

  if (!ready) {
    return (
      <div className="rounded-lg border border-border bg-white p-6 shadow-card">
        <h1 className="text-lg font-semibold text-ink-900">Reset link unavailable</h1>
        <p className="mt-2 text-sm text-ink-600">This link may have expired or already been used. Request a fresh password reset email to continue.</p>
        <Link href="/forgot-password" className="mt-5 inline-flex text-sm font-medium text-brand-700 hover:text-brand-800">Request another reset link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-white p-6 shadow-card" noValidate>
      <h1 className="text-lg font-semibold text-ink-900">Choose a new password</h1>
      <p className="mt-1 text-2xs text-ink-500">Use at least 8 characters.</p>
      <div className="mt-5 space-y-4">
        <Field label="New password" htmlFor="new_password" required>
          <Input id="new_password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" showPasswordToggle />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_new_password" required>
          <Input id="confirm_new_password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Enter it again" showPasswordToggle />
        </Field>
        {error && <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text" role="alert">{error}</div>}
        <Button type="submit" loading={loading} className="w-full" size="lg">Update password</Button>
      </div>
    </form>
  );
}
