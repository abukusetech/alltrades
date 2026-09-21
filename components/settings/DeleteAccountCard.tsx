"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export function DeleteAccountCard() {
  const router = useRouter();
  const toast = useToast();
  const supabase = React.useMemo(() => createClient(), []);

  const [userEmail, setUserEmail] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? "");
    })();
  }, [supabase]);

  React.useEffect(() => {
    if (!open) {
      setConfirmation("");
      setError(null);
    }
  }, [open]);

  async function onDelete() {
    setError(null);

    if (confirmation.trim() !== CONFIRM_PHRASE) {
      setError(`Type "${CONFIRM_PHRASE}" exactly to confirm.`);
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Could not delete account.");
      }

      await supabase.auth.signOut();

      toast.success("Account deleted", "Your data has been removed.");

      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 600);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Could not delete account.";
      setError(msg);
      toast.error("Deletion failed", msg);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-loss-text" />
            <CardTitle>Danger Zone</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <div className="text-sm font-medium text-ink-900">
              Delete account and all data
            </div>
            <p className="mt-1 text-2xs text-ink-500">
              Permanently deletes your account, every trading account you
              created, all trades, analyses, screenshots, withdrawals and
              reviews. This action cannot be undone.
            </p>
          </div>

          {userEmail && (
            <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
              Signed in as <span className="font-medium">{userEmail}</span>
            </div>
          )}

          <Button
            variant="danger"
            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
            onClick={() => setOpen(true)}
          >
            Delete Account
          </Button>
        </CardBody>
      </Card>

      <Modal
        open={open}
        onClose={() => (deleting ? undefined : setOpen(false))}
        title="Delete account permanently?"
        description="This cannot be undone."
        size="md"
        closeOnEscape={!deleting}
        closeOnOverlayClick={!deleting}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onDelete}
              loading={deleting}
              disabled={confirmation.trim() !== CONFIRM_PHRASE}
            >
              Delete my account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded border border-loss-border bg-loss-bg px-3 py-2 text-2xs text-loss-text">
            <p className="font-medium">This will permanently remove:</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 opacity-90">
              <li>Your login and email address</li>
              <li>All trading accounts and their starting capital</li>
              <li>Every trade, analysis, withdrawal and weekly review</li>
              <li>All uploaded screenshots</li>
            </ul>
          </div>

          <Field
            label={`Type "${CONFIRM_PHRASE}" to confirm`}
            htmlFor="delete_confirm"
            error={error ?? undefined}
          >
            <Input
              id="delete_confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoComplete="off"
              disabled={deleting}
              invalid={!!error}
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
