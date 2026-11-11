"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

export function ForgotPasswordForm() {
  const supabase = React.useMemo(() => createClient(), []);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter the email address linked to your account.");
      return;
    }

    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo });
      if (error) {
        setError(error.message);
        return;
      }
      setSent(true);
    } catch {
      setError("We couldn't send the reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-white p-6 shadow-card" noValidate>
      <h1 className="text-lg font-semibold text-ink-900">Reset your password</h1>
      <p className="mt-1 text-2xs text-ink-500">Enter the email address you use for ALLTRADES.</p>
      {sent ? (
        <div className="mt-5 rounded border border-border bg-surface-soft px-3 py-3 text-sm text-ink-700" role="status">
          If an account is registered with that email, a password reset link will arrive shortly. Check your inbox and spam folder.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <Field label="Email" htmlFor="reset_email" required>
            <Input id="reset_email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          {error && <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text" role="alert">{error}</div>}
          <Button type="submit" loading={loading} className="w-full" size="lg">Send reset link</Button>
        </div>
      )}
      <div className="mt-5 border-t border-border pt-4 text-center text-2xs text-ink-500">
        Remembered it? <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">Back to log in</Link>
      </div>
    </form>
  );
}
