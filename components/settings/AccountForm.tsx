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
import type { AccountType } from "@/lib/types";

export function AccountForm() {
  const supabase = React.useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = React.useState("");
  const [startingCapital, setStartingCapital] = React.useState("");
  const [accountType, setAccountType] = React.useState<"" | "MAVEN" | "PERSONAL">("");
  const [provider, setProvider] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    name?: string;
    startingCapital?: string;
    accountType?: string;
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
    if (!accountType) nextErrors.accountType = "Choose whether this is a prop firm or personal account.";

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
        account_type: accountType as AccountType,
        provider: provider.trim() || null,
      });

      toast.success("Account created", `${trimmedName} is ready to configure.`);
      setName("");
      setStartingCapital("");
      setAccountType("");
      setProvider("");
      setNotes("");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account.";
      toast.error("Could not create account", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account name" htmlFor="account_name" required error={errors.name}>
          <Input
            id="account_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. FTMO 2-Step, Personal Live"
            invalid={!!errors.name}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Starting capital"
          htmlFor="account_capital"
          required
          error={errors.startingCapital}
          hint="This is the base for capital, drawdown and performance calculations."
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Account type" htmlFor="account_type" required error={errors.accountType}>
          <select
            id="account_type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as "" | "MAVEN" | "PERSONAL")}
            className="h-9 w-full rounded border border-border-strong bg-white px-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            <option value="">Choose account type</option>
            <option value="MAVEN">Prop firm account</option>
            <option value="PERSONAL">Personal capital account</option>
          </select>
        </Field>

        <Field
          label={accountType === "PERSONAL" ? "Broker (optional)" : "Prop firm (optional)"}
          htmlFor="account_provider"
          hint="You can add or change the provider later."
        >
          <Input
            id="account_provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder={accountType === "PERSONAL" ? "e.g. IC Markets, Pepperstone" : "e.g. FTMO, Maven, The5ers"}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="account_notes" hint="Optional notes about this account, challenge phase or broker setup.">
        <Textarea
          id="account_notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any account details you want to remember."
        />
      </Field>

      <div className="flex items-center justify-end">
        <Button type="submit" loading={saving}>Create Account</Button>
      </div>
    </form>
  );
}
