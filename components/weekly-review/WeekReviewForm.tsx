"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getWeeklyReview, upsertWeeklyReview } from "@/lib/data/weekly-reviews";
import type { WeeklyReview } from "@/lib/types";

export interface WeekReviewFormProps {
  accountId: string;
  weekStart: string;
  weekEnd: string;
}

export function WeekReviewForm({
  accountId,
  weekStart,
  weekEnd,
}: WeekReviewFormProps) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [updatedAt, setUpdatedAt] = React.useState<string | null>(null);

  const [wentWell, setWentWell] = React.useState("");
  const [wentWrong, setWentWrong] = React.useState("");
  const [toImprove, setToImprove] = React.useState("");
  const [keyLesson, setKeyLesson] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDirty(false);

    getWeeklyReview(supabase, accountId, weekStart)
      .then((r: WeeklyReview | null) => {
        if (cancelled) return;
        setWentWell(r?.went_well ?? "");
        setWentWrong(r?.went_wrong ?? "");
        setToImprove(r?.to_improve ?? "");
        setKeyLesson(r?.key_lesson ?? "");
        setNotes(r?.notes ?? "");
        setUpdatedAt(r?.updated_at ?? null);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(
            "Could not load review",
            e instanceof Error ? e.message : undefined
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId, weekStart, supabase, toast]);

  async function onSave() {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not signed in");
        return;
      }
      const saved = await upsertWeeklyReview(supabase, user.id, {
        account_id: accountId,
        week_start: weekStart,
        week_end: weekEnd,
        went_well: wentWell.trim() || null,
        went_wrong: wentWrong.trim() || null,
        to_improve: toImprove.trim() || null,
        key_lesson: keyLesson.trim() || null,
        notes: notes.trim() || null,
      });
      setUpdatedAt(saved.updated_at);
      setDirty(false);
      toast.success("Weekly review saved");
    } catch (e) {
      toast.error(
        "Could not save review",
        e instanceof Error ? e.message : undefined
      );
    } finally {
      setSaving(false);
    }
  }

  function touch<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setDirty(true);
    };
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Weekly Review</CardTitle>
          <p className="mt-1 text-3xs text-ink-500">
            Write down what worked and what to improve.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge tone="warn">Unsaved changes</Badge>}
          {!dirty && updatedAt && (
            <span className="text-3xs text-ink-500">
              Saved{" "}
              {new Date(updatedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        <Field label="What went well?" htmlFor="went_well">
          <Textarea
            id="went_well"
            rows={3}
            value={wentWell}
            onChange={(e) => touch(setWentWell)(e.target.value)}
            disabled={loading}
            placeholder="Setups that worked, decisions you are proud of…"
          />
        </Field>

        <Field label="What went wrong?" htmlFor="went_wrong">
          <Textarea
            id="went_wrong"
            rows={3}
            value={wentWrong}
            onChange={(e) => touch(setWentWrong)(e.target.value)}
            disabled={loading}
            placeholder="FOMO, early exits, oversized risk, market conditions…"
          />
        </Field>

        <Field label="What will I improve next week?" htmlFor="to_improve">
          <Textarea
            id="to_improve"
            rows={3}
            value={toImprove}
            onChange={(e) => touch(setToImprove)(e.target.value)}
            disabled={loading}
            placeholder="Concrete actions and rules to enforce next week."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Key lesson" htmlFor="key_lesson">
            <Textarea
              id="key_lesson"
              rows={3}
              value={keyLesson}
              onChange={(e) => touch(setKeyLesson)(e.target.value)}
              disabled={loading}
              placeholder="One sentence that sums up the week."
            />
          </Field>
          <Field label="Weekly notes" htmlFor="weekly_notes">
            <Textarea
              id="weekly_notes"
              rows={3}
              value={notes}
              onChange={(e) => touch(setNotes)(e.target.value)}
              disabled={loading}
              placeholder="Anything else worth remembering."
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <Button onClick={onSave} loading={saving} disabled={loading}>
            {dirty ? "Save review" : "Save"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
