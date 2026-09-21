"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { createAccount } from "@/lib/data/accounts";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

export function AccountForm() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = React.useState("");
  const [startingCapital, setStartingCapital] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    name?: string;
    startingCapital?: string;
  }>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};

    const trimmedName = name.trim();
    if (!trimmedName) nextErrors.name = "Account name is required.";

    const parsedCapital = Number(startingCapital);
    if (!startingCapital.trim()) {
      nextErrors.startingCapital = "Starting capital is required.";
    } else if (!Number.isFinite(parsedCapital) || parsedCapital <= 0) {
      nextErrors.startingCapital = "Starting capital must be greater than zero.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in", "Please log in again.");
        return;
      }

      await createAccount(supabase, user.id, {
        name: trimmedName,
        starting_capital: parsedCapital,
        notes: notes.trim() ? notes.trim() : null,
      });

      toast.success("Account created", `${trimmedName} is ready to use.`);
      setName("");
      setStartingCapital("");
      setNotes("");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create account.";
      toast.error("Could not create account", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field
        label="Account name"
        htmlFor="account_name"
        required
        error={errors.name}
      >
        <Input
          id="account_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. FUNDED ACCOUNT"
          invalid={!!errors.name}
          autoComplete="off"
        />
      </Field>

      <Field
        label="Starting capital"
        htmlFor="account_capital"
        required
        error={errors.startingCapital}
        hint="Greater than zero. This becomes the base for drawdown and withdrawal calculations."
      >
        <Input
          id="account_capital"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={startingCapital}
          onChange={(e) => setStartingCapital(e.target.value)}
          placeholder="5000.00"
          prefix="$"
          invalid={!!errors.startingCapital}
        />
      </Field>

      <Field
        label="Notes"
        htmlFor="account_notes"
        hint="Optional. For example: funding provider, rules variant, phase."
      >
        <Textarea
          id="account_notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes about this account."
        />
      </Field>

      <div className="flex items-center justify-end">
        <Button type="submit" loading={saving}>
          Create Account
        </Button>
      </div>
    </form>
  );
}
