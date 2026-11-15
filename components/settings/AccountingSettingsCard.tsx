"use client";

import * as React from "react";
import { Save, Calculator } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { getSettings, upsertSettings } from "@/lib/accounting/data";
import type { AccountingSettings } from "@/lib/types";

const DEFAULT_PRICES = {
  "2000": 15,
  "5000": 19,
  "10000": 37,
  "20000": 68,
  "50000": 170,
};

export function AccountingSettingsCard() {
  const supabase = React.useMemo(() => createClient(), []);
  const toast = useToast();
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [settings, setSettings] = React.useState<AccountingSettings | null>(null);

  const [propFirm, setPropFirm] = React.useState("");
  const [traderShare, setTraderShare] = React.useState("80");
  const [accountPct, setAccountPct] = React.useState("50");
  const [savingsPct, setSavingsPct] = React.useState("30");
  const [businessPct, setBusinessPct] = React.useState("20");
  const [minReserve, setMinReserve] = React.useState("0");
  const [kesRate, setKesRate] = React.useState("129");
  const [prices, setPrices] = React.useState<Record<string, string>>(
    Object.fromEntries(Object.entries(DEFAULT_PRICES).map(([k, v]) => [k, String(v)]))
  );

  React.useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const s = await getSettings(supabase, user.id);
      setSettings(s);
      if (s) {
        setPropFirm(s.default_prop_firm);
        setTraderShare(String(s.default_trader_share_percent));
        setAccountPct(String(s.account_fund_percent));
        setSavingsPct(String(s.savings_percent));
        setBusinessPct(String(s.business_percent));
        setMinReserve(String(s.minimum_cash_reserve));
        setKesRate(String(s.usd_kes_rate));
        const p = s.account_prices ?? DEFAULT_PRICES;
        setPrices(
          Object.fromEntries(
            Object.entries(p).map(([k, v]) => [k, String(v)])
          )
        );
      }
      setLoading(false);
    })();
  }, [supabase]);

  const allocationSum =
    (Number(accountPct) || 0) + (Number(savingsPct) || 0) + (Number(businessPct) || 0);

  async function onSave() {
    if (Math.abs(allocationSum - 100) > 0.01) {
      toast.error("Percentages must add to 100%", `Currently ${allocationSum.toFixed(2)}%`);
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const cleanPrices: Record<string, number> = {};
      for (const [k, v] of Object.entries(prices)) {
        cleanPrices[k] = Number(v) || 0;
      }

      await upsertSettings(supabase, user.id, {
        default_prop_firm: propFirm.trim(),
        default_trader_share_percent: Number(traderShare) || 80,
        account_fund_percent: Number(accountPct) || 50,
        savings_percent: Number(savingsPct) || 30,
        business_percent: Number(businessPct) || 20,
        minimum_cash_reserve: Number(minReserve) || 0,
        usd_kes_rate: Number(kesRate) || 129,
        account_prices: cleanPrices,
      });
      toast.success("Accounting settings saved");
    } catch (err) {
      toast.error("Save failed", err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardBody className="py-6 text-center text-2xs text-ink-500">Loading…</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-brand-600" />
          <CardTitle>Accounting Settings</CardTitle>
        </div>
        <Badge tone={Math.abs(allocationSum - 100) < 0.01 ? "profit" : "warn"}>
          {allocationSum.toFixed(0)}% allocated
        </Badge>
      </CardHeader>
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default funding provider" htmlFor="prop_firm" hint="Optional default for new prop firm accounts.">
            <Input id="prop_firm" value={propFirm} onChange={(e) => setPropFirm(e.target.value)} placeholder="e.g. FTMO, Maven, The5ers" />
          </Field>
          <Field label="Default trader share %" htmlFor="trader_share">
            <Input
              id="trader_share"
              type="number"
              step="0.01"
              value={traderShare}
              onChange={(e) => setTraderShare(e.target.value)}
              suffix="%"
            />
          </Field>
        </div>

        <div>
          <div className="text-2xs font-medium uppercase tracking-wide text-ink-600">
            Profit allocation
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Field label="Account fund %" htmlFor="acc_pct">
              <Input id="acc_pct" type="number" step="0.01" value={accountPct} onChange={(e) => setAccountPct(e.target.value)} suffix="%" />
            </Field>
            <Field label="Savings %" htmlFor="sav_pct">
              <Input id="sav_pct" type="number" step="0.01" value={savingsPct} onChange={(e) => setSavingsPct(e.target.value)} suffix="%" />
            </Field>
            <Field label="Business %" htmlFor="biz_pct">
              <Input id="biz_pct" type="number" step="0.01" value={businessPct} onChange={(e) => setBusinessPct(e.target.value)} suffix="%" />
            </Field>
          </div>
          <div className="mt-1 text-3xs text-ink-500">
            Must total 100%. Currently {allocationSum.toFixed(2)}%.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Minimum cash reserve" htmlFor="min_reserve" hint="Warning before account purchases">
            <Input
              id="min_reserve"
              type="number"
              step="0.01"
              value={minReserve}
              onChange={(e) => setMinReserve(e.target.value)}
              prefix="$"
            />
          </Field>
          <Field label="USD / KES rate" htmlFor="kes_rate" hint="Editable, stored with each transaction">
            <Input
              id="kes_rate"
              type="number"
              step="0.00000001"
              value={kesRate}
              onChange={(e) => setKesRate(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="text-2xs font-medium uppercase tracking-wide text-ink-600">
            Account ladder prices
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-5">
            {Object.keys(prices).map((size) => (
              <Field key={size} label={`$${Number(size).toLocaleString()}`} htmlFor={`price_${size}`}>
                <Input
                  id={`price_${size}`}
                  type="number"
                  step="0.01"
                  value={prices[size]}
                  onChange={(e) =>
                    setPrices((p) => ({ ...p, [size]: e.target.value }))
                  }
                  prefix="$"
                />
              </Field>
            ))}
          </div>
        </div>

        <div className="flex justify-end border-t border-border pt-3">
          <Button onClick={onSave} loading={saving} leftIcon={<Save className="h-3.5 w-3.5" />}>
            Save accounting settings
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
