import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_KEY = "mp_risk_percent_v1";
export const DEFAULT_RISK_PERCENT = 3;

/** The preference is cloud-scoped to the signed-in user; preview stays on device. */
export async function loadRiskPercent(): Promise<number> {
  if (!isSupabaseConfigured()) {
    const value = Number(window.localStorage.getItem(LOCAL_KEY));
    return value > 0 && value <= 100 ? value : DEFAULT_RISK_PERCENT;
  }
  const client = createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) {
    const value = Number(window.localStorage.getItem(LOCAL_KEY));
    return value > 0 && value <= 100 ? value : DEFAULT_RISK_PERCENT;
  }
  const { data, error } = await client.from("journal_risk_settings").select("risk_percent").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? Number(data.risk_percent) : DEFAULT_RISK_PERCENT;
}

export async function saveRiskPercent(percent: number): Promise<void> {
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100 || Math.abs(percent * 10000 - Math.round(percent * 10000)) > 1e-7) throw new Error("Risk percentage must be above 0, at most 100, and use at most four decimal places.");
  if (!isSupabaseConfigured()) { window.localStorage.setItem(LOCAL_KEY, String(percent)); return; }
  const client = createClient();
  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw new Error(authError.message);
  if (!user) { window.localStorage.setItem(LOCAL_KEY, String(percent)); return; }
  const { error } = await client.from("journal_risk_settings").upsert({user_id: user.id, risk_percent: percent, updated_at: new Date().toISOString()});
  if (error) throw new Error(error.message);
}

export type RiskInput = {
  balance: number; riskPercent: number; entry: number; stop: number; side: "buy" | "sell";
  contractSize: number; quoteToUsd: number; costPerLot: number; minLot: number; maxLot: number; lotStep: number; lot: number;
};
export type RiskResult = { budget: number; riskPerLot: number; suggestedLot: number; estimatedRisk: number; affordable: boolean };

/** Price delta is in quote currency; conversion and broker contract/volume
 * specifications must be supplied by the user and verified with their broker. */
export function calculatePositionRisk(i: RiskInput): RiskResult | null {
  if (![i.balance, i.riskPercent, i.entry, i.stop, i.contractSize, i.quoteToUsd, i.costPerLot, i.minLot, i.maxLot, i.lotStep, i.lot].every(Number.isFinite)) return null;
  if (i.balance <= 0 || i.riskPercent <= 0 || i.riskPercent > 100 || i.entry <= 0 || i.stop <= 0 || i.contractSize <= 0 || i.quoteToUsd <= 0 || i.costPerLot < 0 || i.minLot <= 0 || i.maxLot < i.minLot || i.lotStep <= 0 || i.lot <= 0) return null;
  // journal_entries.lot_size stores four decimals; never suggest a size the
  // database would round upward or that cannot be represented exactly.
  if ([i.minLot, i.maxLot, i.lotStep, i.lot].some(v => Math.abs(v * 10000 - Math.round(v * 10000)) > 1e-7)) return null;
  if (i.side === "buy" ? i.stop >= i.entry : i.stop <= i.entry) return null;
  const budget = i.balance * i.riskPercent / 100;
  const riskPerLot = Math.abs(i.entry - i.stop) * i.contractSize * i.quoteToUsd + i.costPerLot;
  if (!Number.isFinite(budget) || !Number.isFinite(riskPerLot) || riskPerLot <= 0) return null;
  // Lot steps are measured from zero. Round downward and recheck budget to
  // avoid a floating-point increment ever exceeding the risk limit.
  let steps = Math.floor(Math.min(budget / riskPerLot, i.maxLot) / i.lotStep + 1e-10);
  let suggestedLot = Number((steps * i.lotStep).toFixed(8));
  while (steps > 0 && suggestedLot * riskPerLot > budget + 1e-9) {
    steps--; suggestedLot = Number((steps * i.lotStep).toFixed(8));
  }
  const affordable = suggestedLot + 1e-9 >= i.minLot;
  return { budget, riskPerLot, suggestedLot: affordable ? suggestedLot : 0, estimatedRisk: i.lot * riskPerLot, affordable };
}
