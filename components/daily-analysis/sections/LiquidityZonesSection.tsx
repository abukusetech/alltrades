"use client";

import * as React from "react";
import { Plus, Trash2, Edit2, Droplets, X, Check } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import {
  listZones,
  createZone,
  updateZone,
  deleteZone,
  type ZoneInsert,
} from "@/lib/data/analysis-zones";
import type { DailyAnalysis, DailyAnalysisZone, LiquidityNarrative } from "@/lib/types";
import { cn, parseNumberOrNull } from "@/lib/utils";

const TIMEFRAMES = ["D1", "H4", "H1", "M30", "M15", "M5", "M1", "CUSTOM"] as const;
const IMPORTANCE = ["high", "medium", "low"] as const;
const DIRECTIONS = ["bullish", "bearish", "neutral"] as const;

const ZONE_TYPES = [
  // Liquidity
  "Buy-side liquidity",
  "Sell-side liquidity",
  "Equal highs",
  "Equal lows",
  "Previous day high",
  "Previous day low",
  "Previous week high",
  "Previous week low",
  "Asian high",
  "Asian low",
  "London high",
  "London low",
  "New York high",
  "New York low",
  // Institutional price zones
  "Bullish order block",
  "Bearish order block",
  "Bullish FVG",
  "Bearish FVG",
  "Breaker block",
  "Mitigation block",
  "Rejection block",
  "Supply zone",
  "Demand zone",
  // Other important levels
  "Major support",
  "Major resistance",
  "Previous close",
  "Daily open",
  "Weekly open",
  "Equilibrium",
  "Premium zone",
  "Discount zone",
  "Entry POI",
  "Invalidation level",
  "Custom",
] as const;

export function LiquidityZonesSection({
  analysis,
  onUpdate,
}: {
  analysis: DailyAnalysis;
  onUpdate: (patch: Partial<DailyAnalysis>) => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [zones, setZones] = React.useState<DailyAnalysisZone[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<DailyAnalysisZone | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  const narrative: LiquidityNarrative = analysis.liquidity_narrative ?? {
    external: null,
    internal: null,
    expectedEvent: null,
    expectedDraw: null,
    narrative: null,
  };

  const load = React.useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    try {
      const rows = await listZones(supabase, user.id, analysis.id);
      setZones(rows);
    } catch (e) {
      toast.error("Could not load zones", e instanceof Error ? e.message : undefined);
    } finally {
      setLoading(false);
    }
  }, [supabase, analysis.id, toast]);

  React.useEffect(() => { void load(); }, [load]);

  function updateNarrative(patch: Partial<LiquidityNarrative>) {
    onUpdate({ liquidity_narrative: { ...narrative, ...patch } });
  }

  return (
    <div className="space-y-4">
      {/* LIQUIDITY NARRATIVE */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Narrative</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="External liquidity" htmlFor="ext_liq">
              <Select
                id="ext_liq"
                value={narrative.external ?? ""}
                onChange={(e) => updateNarrative({ external: (e.target.value || null) as LiquidityNarrative["external"] })}
                options={["Buy-side", "Sell-side", "Both", "Neither"]}
                placeholder="Not set"
              />
            </Field>
            <Field label="Internal liquidity" htmlFor="int_liq">
              <Select
                id="int_liq"
                value={narrative.internal ?? ""}
                onChange={(e) => updateNarrative({ internal: e.target.value || null })}
                options={["Equal highs", "Equal lows", "Internal range liquidity", "Internal FVG liquidity", "No clear internal liquidity"]}
                placeholder="Not set"
              />
            </Field>
            <Field label="Expected event" htmlFor="expected_event">
              <Select
                id="expected_event"
                value={narrative.expectedEvent ?? ""}
                onChange={(e) => updateNarrative({ expectedEvent: (e.target.value || null) as LiquidityNarrative["expectedEvent"] })}
                options={["Sweep Buy-side", "Sweep Sell-side", "Internal sweep", "External sweep", "No sweep", "Already swept"]}
                placeholder="Not set"
              />
            </Field>
            <Field label="Expected draw on liquidity" htmlFor="expected_draw">
              <Select
                id="expected_draw"
                value={narrative.expectedDraw ?? ""}
                onChange={(e) => updateNarrative({ expectedDraw: e.target.value || null })}
                options={["Previous day high", "Previous day low", "Previous week high", "Previous week low", "Asian high", "Asian low", "Equal highs", "Equal lows", "Custom target"]}
                placeholder="Not set"
              />
            </Field>
          </div>
          <Field label="Market narrative — what is price seeking, and why?" htmlFor="narrative">
            <Textarea
              id="narrative"
              rows={3}
              value={narrative.narrative ?? ""}
              onChange={(e) => updateNarrative({ narrative: e.target.value || null })}
              placeholder="e.g. Price is seeking the previous day high to sweep buy-side liquidity before continuing lower."
            />
          </Field>
        </CardBody>
      </Card>

      {/* KEY ZONES */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-brand-600" />
            <CardTitle>Key Zones</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditing(null); setShowForm(true); }}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Zone
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-6 text-center text-2xs text-ink-500">Loading zones…</div>
          ) : zones.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No key zones yet"
                description="Add zones for buy-side liquidity, order blocks, fair value gaps, or any level you're tracking."
                compact
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-muted text-3xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Timeframe</th>
                    <th className="px-3 py-2 text-left font-medium">Type</th>
                    <th className="px-3 py-2 text-right font-medium">Price</th>
                    <th className="px-3 py-2 text-left font-medium">Importance</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {zones.map((z) => (
                    <tr key={z.id} className="hover:bg-surface-soft">
                      <td className="px-3 py-2 text-xs font-medium text-ink-900">{z.name}</td>
                      <td className="px-3 py-2 text-3xs text-ink-600">{z.timeframe}</td>
                      <td className="px-3 py-2 text-3xs text-ink-600">{z.zone_type}</td>
                      <td className="tabular px-3 py-2 text-right text-xs text-ink-900">
                        {z.price != null ? z.price : (z.price_high != null && z.price_low != null ? `${z.price_low} – ${z.price_high}` : "—")}
                      </td>
                      <td className="px-3 py-2">
                        {z.importance && (
                          <Badge tone={z.importance === "high" ? "loss" : z.importance === "medium" ? "warn" : "neutral"}>
                            {z.importance}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditing(z); setShowForm(true); }}
                            leftIcon={<Edit2 className="h-3 w-3" />}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (!window.confirm(`Delete zone "${z.name}"?`)) return;
                              try {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) return;
                                await deleteZone(supabase, user.id, z.id);
                                void load();
                              } catch (e) {
                                toast.error("Delete failed", e instanceof Error ? e.message : undefined);
                              }
                            }}
                            className="text-loss-text hover:bg-loss-bg"
                            leftIcon={<Trash2 className="h-3 w-3" />}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {showForm && (
        <ZoneFormModal
          analysisId={analysis.id}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

function ZoneFormModal({
  analysisId,
  editing,
  onClose,
  onSaved,
}: {
  analysisId: string;
  editing: DailyAnalysisZone | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  const [isRange, setIsRange] = React.useState(editing?.price_high != null || editing?.price_low != null);

  const [name, setName] = React.useState(editing?.name ?? "");
  const [timeframe, setTimeframe] = React.useState(editing?.timeframe ?? "H4");
  const [zoneType, setZoneType] = React.useState(editing?.zone_type ?? "Buy-side liquidity");
  const [price, setPrice] = React.useState(editing?.price != null ? String(editing.price) : "");
  const [priceHigh, setPriceHigh] = React.useState(editing?.price_high != null ? String(editing.price_high) : "");
  const [priceLow, setPriceLow] = React.useState(editing?.price_low != null ? String(editing.price_low) : "");
  const [direction, setDirection] = React.useState(editing?.direction ?? "neutral");
  const [importance, setImportance] = React.useState(editing?.importance ?? "medium");
  const [notes, setNotes] = React.useState(editing?.notes ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload: ZoneInsert = {
        analysis_id: analysisId,
        name: name.trim(),
        timeframe: timeframe as ZoneInsert["timeframe"],
        zone_type: zoneType,
        price: isRange ? null : parseNumberOrNull(price),
        price_high: isRange ? parseNumberOrNull(priceHigh) : null,
        price_low: isRange ? parseNumberOrNull(priceLow) : null,
        direction: direction as ZoneInsert["direction"],
        importance: importance as ZoneInsert["importance"],
        notes: notes.trim() || null,
      };

      if (editing) {
        await updateZone(supabase, user.id, editing.id, payload);
        toast.success("Zone updated");
      } else {
        await createZone(supabase, user.id, payload);
        toast.success("Zone created");
      }
      onSaved();
    } catch (e) {
      toast.error("Save failed", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/40 p-4 pt-16" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-border bg-white p-5 shadow-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">
            {editing ? "Edit Zone" : "New Zone"}
          </h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <Field label="Name" htmlFor="zone_name" required>
            <Input id="zone_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. H4 bullish order block" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Timeframe" htmlFor="zone_tf">
              <Select
                id="zone_tf"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as never)}
                options={[...TIMEFRAMES]}
              />
            </Field>
            <Field label="Zone type" htmlFor="zone_type">
              <Select
                id="zone_type"
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                options={[...ZONE_TYPES]}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsRange(false)}
              className={cn("rounded border px-3 py-1 text-2xs transition-colors", !isRange ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border text-ink-600")}
            >
              Single price
            </button>
            <button
              type="button"
              onClick={() => setIsRange(true)}
              className={cn("rounded border px-3 py-1 text-2xs transition-colors", isRange ? "border-brand-600 bg-brand-50 text-brand-700" : "border-border text-ink-600")}
            >
              Price range
            </button>
          </div>
          {isRange ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price low" htmlFor="zone_low">
                <Input id="zone_low" type="number" step="any" value={priceLow} onChange={(e) => setPriceLow(e.target.value)} />
              </Field>
              <Field label="Price high" htmlFor="zone_high">
                <Input id="zone_high" type="number" step="any" value={priceHigh} onChange={(e) => setPriceHigh(e.target.value)} />
              </Field>
            </div>
          ) : (
            <Field label="Price" htmlFor="zone_price">
              <Input id="zone_price" type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Direction" htmlFor="zone_dir">
              <Select
                id="zone_dir"
                value={direction}
                onChange={(e) => setDirection(e.target.value as never)}
                options={[...DIRECTIONS]}
              />
            </Field>
            <Field label="Importance" htmlFor="zone_imp">
              <Select
                id="zone_imp"
                value={importance}
                onChange={(e) => setImportance(e.target.value as never)}
                options={[...IMPORTANCE]}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="zone_notes">
            <Textarea id="zone_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? "Save changes" : "Create zone"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
