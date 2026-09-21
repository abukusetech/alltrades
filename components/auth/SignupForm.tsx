"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";

export function SignupForm() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) return setError("Full name is required.");
    if (!trimmedEmail) return setError("Email is required.");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: trimmedName },
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-border bg-white p-6 shadow-card"
      noValidate
    >
      <h1 className="text-lg font-semibold text-ink-900">Create your account</h1>
      <p className="mt-1 text-2xs text-ink-500">
        Start recording trades and monitoring account discipline.
      </p>

      <div className="mt-5 space-y-4">
        <Field label="Full name" htmlFor="full_name" required>
          <Input
            id="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Trader"
          />
        </Field>

        <Field label="Email" htmlFor="signup_email" required>
          <Input
            id="signup_email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="signup_password"
          required
          hint="At least 8 characters."
        >
          <Input
            id="signup_password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <Field label="Confirm password" htmlFor="confirm_password" required>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            {error}
          </div>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </div>

      <div className="mt-5 border-t border-border pt-4 text-center text-2xs text-ink-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Log in
        </Link>
      </div>
    </form>
  );
}
