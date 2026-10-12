// ALLTRADES — Domain types (mirror the Supabase schema)

export type Direction = "Buy" | "Sell";
export type TradeResult = "Win" | "Loss" | "Breakeven";

export type AnalysisOutcome =
  | "Still Pending"
  | "Correct"
  | "Partially Correct"
  | "Incorrect";

export type WithdrawalStatus = "Recorded" | "Pending" | "Approved" | "Paid";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  starting_capital: number;
  notes: string | null;
  is_active: boolean;

  max_weekly_trades: number;
  withdrawal_target_percent: number;
  max_consistency_percent: number;
  max_daily_drawdown_percent: number;
  max_total_drawdown_percent: number;
  max_floating_loss_percent: number;
  allowed_instrument: string | null;
  min_sl_pips: number | null;
  max_sl_pips: number | null;
  min_rr: number | null;
  max_daily_trades: number | null;
  max_monthly_trades: number | null;
  forbid_high_impact_news: boolean | null;
  no_risk_increase_after_loss: boolean | null;

  created_at: string;
  updated_at: string;
  // ---- Phase 17A: account types & rules ----
  account_type: AccountType;
  broker: string | null;
  account_currency: string;
  account_status: AccountStatus;
  account_identifier: string | null;
  current_equity: number | null;
  floating_pnl: number | null;
  funding_source: string | null;

  personal_risk_percent: number | null;
  personal_daily_loss_percent: number | null;
  personal_max_drawdown_percent: number | null;

  maven_rules: MavenRules | null;
  rules_effective_from: string | null;
  rules_effective_to: string | null;

  // ---- Phase 18A: Maven tracking ----
  maven_rule_version_id: string | null;
  daily_reference_balance: number | null;
  daily_reference_set_at: string | null;
  highest_equity_watermark: number | null;
  current_balance: number | null;
  kyc_status: 'Not started' | 'Required' | 'In progress' | 'Verified' | 'Action required';
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;

  trade_date: string;
  trade_time: string | null;

  instrument: string;
  direction: Direction;
  result: TradeResult;

  lot_size: number | null;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  risk_amount: number | null;

  profit_loss: number;
  risk_reward: string | null;
  pips: number | null;
  commission: number | null;
  swap: number | null;
  spread: number | null;
  holding_time: string | null;

  strategy: string | null;
  setup_type: string | null;
  timeframe: string | null;
  session: string | null;
  market_bias: string | null;
  entry_model: string | null;
  liquidity_taken: string | null;
  news_event: string | null;

  entry_reason: string | null;
  exit_reason: string | null;
  management: string | null;
  mistakes: string | null;
  emotions: string | null;
  notes: string | null;
  what_went_well: string | null;
  market_observation: string | null;
  lesson: string | null;
  mistake_tags: string[] | null;
  daily_analysis_id: string | null;
  trade_plan_id: string | null;
  entry_tags: string[] | null;
  exit_tags: string[] | null;
  management_tags: string[] | null;
  well_tags: string[] | null;
  emotion_before_tags: string[] | null;
  emotion_after_tags: string[] | null;
  market_tags: string[] | null;
  lesson_tags: string[] | null;
  rule_compliance: RuleCheck[] | null;
  rule_pass_count: number | null;
  rule_total_count: number | null;
  rule_pass: boolean | null;

  created_at: string;
  updated_at: string;
}

export interface TradeScreenshot {
  id: string;
  user_id: string;
  trade_id: string;
  storage_path: string;
  label: "Analysis" | "Before Trade" | "After Trade";
  created_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  account_id: string;

  analysis_date: string;
  analysis_time: string | null;

  instrument: string;
  timeframe: string | null;
  session: string | null;
  market_bias: string | null;
  market_structure: string | null;

  prev_week_high: number | null;
  prev_week_low: number | null;
  prev_day_high: number | null;
  prev_day_low: number | null;
  liquidity_focus: string | null;
  support_resistance: string | null;

  fair_value_gap: string | null;
  order_blocks: string | null;
  bos_choch: string | null;
  setup: string | null;

  prediction: string;
  entry_zone: string | null;
  invalidation: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  expected_rr: string | null;
  confidence: string | null;

  outcome: AnalysisOutcome;
  actual_move: string | null;
  lessons: string | null;
  notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface AnalysisScreenshot {
  id: string;
  user_id: string;
  analysis_id: string;
  storage_path: string;
  created_at: string;
}

export interface Withdrawal {
  id: string;
  user_id: string;
  account_id: string;
  withdrawal_date: string;
  amount: number;
  status: WithdrawalStatus;
  notes: string | null;
  created_at: string;

  // ---- Phase 17D ----
  account_type: AccountType | null;
}

export interface WeeklyReview {
  id: string;
  user_id: string;
  account_id: string;
  week_start: string;
  week_end: string;
  went_well: string | null;
  went_wrong: string | null;
  to_improve: string | null;
  key_lesson: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountDailySnapshot {
  id: string;
  user_id: string;
  account_id: string;
  snapshot_date: string;
  balance: number;
  equity: number | null;
  highest_watermark: number | null;
  daily_pnl: number;
  notes: string | null;
  created_at: string;
}


// ============================================================
// Daily Analysis (added in Phase 8)
// ============================================================

export type DailyAnalysisStatus =
  | "ANALYSIS_CREATED"
  | "WAITING_FOR_CONFIRMATION"
  | "SETUP_CONFIRMED"
  | "INVALIDATED"
  | "NO_TRADE"
  | "TRADE_TAKEN";

export type BiasOption = "Bullish" | "Bearish" | "Neutral";
export type StructureOption = "Bullish" | "Bearish" | "Ranging" | "Unclear";
export type DirectionOption = "BUY" | "SELL" | "WAIT";
export type ConfidenceOption = "High" | "Medium" | "Low";

export interface KeyLevel {
  id: string;
  name: string;
  price: string;
  type: string;
  notes?: string;
}

export interface LiquidityPlan {
  buySidePrice?: string;
  buySideNotes?: string;
  sellSidePrice?: string;
  sellSideNotes?: string;
  expectedEvent?:
    | "Sweep Buy-side"
    | "Sweep Sell-side"
    | "No clear liquidity"
    | "Wait"
    | "";
}

export interface Scenario {
  id: string;
  label: string;
  ifText: string;
  thenText: string;
  slText?: string;
  tpText?: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

export interface TimeframeAnalysis {
  trend?: string;
  structure?: string;
  keyLevels?: string;
  liquidity?: string;
  zone?: string;
  entryArea?: string;
  confirmation?: string;
  trigger?: string;
  slArea?: string;
  tpArea?: string;
  notes?: string;
  collapsed?: boolean;
}

export interface EndOfDayReview {
  followedPlan?: string;
  marketAsExpected?: string;
  tookTrade?: string;
  tradeConfirmed?: string;
  riskRespected?: string;
  slRespected?: string;
  tpRespected?: string;
  rrFollowed?: string;
  madeMistakes?: string;
  whatLearned?: string;
}

export interface DailyAnalysis {
  id: string;
  user_id: string;
  account_id: string;
  analysis_date: string;

  instrument: string;
  higher_timeframe_bias: BiasOption | null;
  market_structure: StructureOption | null;
  primary_direction: DirectionOption | null;
  confidence: ConfidenceOption | null;
  analysis_notes: string | null;
  bias_tags: string[] | null;
  structure_tags: string[] | null;
  liquidity_tags: string[] | null;
  setup_tags: string[] | null;
  session_tags: string[] | null;
  news_tags: string[] | null;
  readiness_percent: number | null;
  active_plan_id: string | null;

  tf_4h: TimeframeAnalysis | null;
  tf_1h: TimeframeAnalysis | null;
  tf_15m: TimeframeAnalysis | null;
  tf_5m: TimeframeAnalysis | null;

  key_levels: KeyLevel[] | null;
  liquidity: LiquidityPlan | null;

  expected_move: string | null;
  invalidation: string | null;
  scenarios: Scenario[] | null;

  news_major: boolean;
  news_time: string | null;
  news_currency: string | null;
  news_notes: string | null;

  confirmation_checklist: ChecklistItem[] | null;

  planned_direction: DirectionOption | null;
  planned_entry: number | null;
  planned_stop_loss: number | null;
  planned_take_profit: number | null;
  planned_sl_pips: number | null;
  planned_risk_percent: number | null;
  planned_risk_amount: number | null;
  planned_rr: number | null;
  planned_expected_profit: number | null;

  status: DailyAnalysisStatus;

  actual_high: number | null;
  actual_low: number | null;
  actual_direction: string | null;
  actual_entry: number | null;
  actual_movement: string | null;
  market_outcome: string | null;
  followed_analysis: string | null;
  analysis_result: string | null;
  analysis_accuracy: number | null;
  analysis_review_notes: string | null;

  mistakes: string[] | null;
  lesson: string | null;

  end_of_day_review: EndOfDayReview | null;

  created_at: string;
  updated_at: string;
}

export interface DailyAnalysisScreenshot {
  id: string;
  user_id: string;
  daily_analysis_id: string;
  storage_path: string;
  timeframe: string;
  label: string | null;
  created_at: string;
}


// ============================================================
// Phase 9 — Connected workflow types
// ============================================================

export interface TradePlan {
  id: string;
  user_id: string;
  account_id: string;
  daily_analysis_id: string | null;

  plan_code: string | null;
  plan_date: string;

  direction: string | null;
  instrument: string;

  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  sl_pips: number | null;
  tp_pips: number | null;
  risk_percent: number | null;
  risk_amount: number | null;
  rr: number | null;
  expected_profit: number | null;

  session: string | null;
  setup_tags: string[] | null;
  bias_tags: string[] | null;
  structure_tags: string[] | null;
  liquidity_tags: string[] | null;
  news_tags: string[] | null;

  confirmation_state: ChecklistItem[] | null;
  confirmation_score: number | null;
  readiness_percent: number | null;

  plan_status:
    | "DRAFT"
    | "READY"
    | "WAITING"
    | "CONFIRMED"
    | "INVALIDATED"
    | "EXECUTED"
    | "CANCELLED";

  rule_compliance: RuleCheck[] | null;
  rule_pass: boolean | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleCheck {
  key: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface AnalysisSnapshot {
  id: string;
  user_id: string;
  trade_id: string;
  daily_analysis_id: string | null;
  trade_plan_id: string | null;
  snapshot: Record<string, unknown>;
  created_at: string;
}

export interface TagGroup {
  key: string;
  label: string;
  options: string[];
}


// ============================================================
// Phase 11A — Accounting & Fund Management types
// ============================================================

export type AccountingFundKey =
  | "personal_broker_cash"
  | "business_cash"
  | "account_fund"
  | "personal_savings"
  | "emergency_fund"
  | "business_operating"
  | "personal_spending"
  | "trading_fees"
  | "trading_income"
  | "other_income"
  | "business_expenses"
  | "personal_expenses";

export type AccountingFundKind =
  | "asset"
  | "income"
  | "expense"
  | "liability"
  | "equity";

export interface AccountingFund {
  id: string;
  user_id: string;
  key: AccountingFundKey;
  label: string;
  kind: AccountingFundKind;
  sort_order: number;
  is_system: boolean;
  created_at: string;
}

export type AccountingTransactionKind =
  | "withdrawal_received"
  | "allocation"
  | "account_purchase"
  | "transfer"
  | "expense"
  | "income"
  | "savings_deposit"
  | "refund"
  | "correction";

export interface AccountingTransaction {
  id: string;
  user_id: string;
  occurred_on: string;
  kind: AccountingTransactionKind;
  description: string;
  amount: number;
  currency: string;
  exchange_rate_to_usd: number;
  amount_usd: number;
  reference: string | null;
  notes: string | null;
  linked_withdrawal_id: string | null;
  linked_purchase_id: string | null;
  reversed_by: string | null;
  reverses: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingLedgerEntry {
  id: string;
  user_id: string;
  transaction_id: string;
  fund_key: AccountingFundKey;
  direction: "debit" | "credit";
  amount: number;
  created_at: string;
}

export type AccountingWithdrawalStatus =
  | "draft"
  | "requested"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled";

export interface AccountingWithdrawal {
  id: string;
  user_id: string;
  prop_firm: string;
  account_size: number | null;
  request_date: string;
  gross_profit_eligible: number | null;
  gross_requested: number;
  trader_share_percent: number;
  firm_share_percent: number;
  expected_net_payout: number | null;
  fee_amount: number;
  actual_net_received: number | null;
  received_date: string | null;
  status: AccountingWithdrawalStatus;
  reference: string | null;
  notes: string | null;
  currency: string;
  exchange_rate_to_usd: number;
  created_at: string;
  updated_at: string;

  // ---- Phase 17D/18E ----
  account_id: string | null;
  // ---- Phase 18E ----
  account_type: AccountType | null;
}

export interface AccountingAllocation {
  id: string;
  user_id: string;
  withdrawal_id: string;
  created_on: string;
  total_amount: number;
  account_fund_percent: number;
  savings_percent: number;
  business_percent: number;
  account_fund_amount: number;
  savings_amount: number;
  business_amount: number;
  confirmed: boolean;
  created_at: string;
}

export type AccountingPurchaseStatus =
  | "planned"
  | "purchased"
  | "active"
  | "payout_eligible"
  | "completed"
  | "lost"
  | "archived";

export interface AccountingPurchase {
  id: string;
  user_id: string;
  size: number;
  price: number;
  purchased_on: string | null;
  status: AccountingPurchaseStatus;
  linked_account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountingGoalStatus =
  | "active"
  | "achieved"
  | "paused"
  | "cancelled";

export interface AccountingGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  currency: string;
  exchange_rate_to_usd: number;
  target_amount_usd: number;
  linked_fund_key: AccountingFundKey;
  target_date: string | null;
  priority: number;
  status: AccountingGoalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountingSettings {
  user_id: string;
  base_currency: string;
  default_prop_firm: string;
  default_trader_share_percent: number;
  account_fund_percent: number;
  savings_percent: number;
  business_percent: number;
  minimum_cash_reserve: number;
  usd_kes_rate: number;
  account_prices: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface FundBalance {
  fund_key: AccountingFundKey;
  label: string;
  kind: AccountingFundKind;
  balance: number;
}

export interface AccountingSnapshot {
  total_withdrawals_received: number;
  total_profit_after_split: number;
  total_allocated_to_accounts: number;
  total_personal_savings: number;
  business_cash_balance: number;
  total_expenses: number;
  total_personal_transfers: number;
  total_account_purchase_cost: number;
  emergency_reserve: number;
  net_cash_flow: number;
  balances: FundBalance[];
}


// ============================================================
// Phase 17A — Account types (Maven / Personal / Unclassified)
// ============================================================

export type AccountType = "MAVEN" | "PERSONAL" | "UNCLASSIFIED";

export type AccountStatus =
  | "active"
  | "breached"
  | "suspended"
  | "closed"
  | "pending"
  | "archived";

/**
 * Maven rule shape. Stored as JSONB so any firm's rules fit
 * without a schema change. All fields optional — "Not configured"
 * is a first-class answer.
 */
export interface MavenRules {
  program?: "Instant Funding" | "Evaluation" | "Express" | "Other";
  daily_loss_percent?: number | null;
  max_drawdown_percent?: number | null;
  drawdown_method?: "trailing" | "static" | "balance_based" | "equity_based" | null;
  reset_time_utc?: string | null;
  max_risk_per_trade_percent?: number | null;
  consistency_required?: boolean | null;
  max_consistency_percent?: number | null;
  min_payout_amount?: number | null;
  profit_split_percent?: number | null;
  min_trading_days?: number | null;
  max_weekly_trades?: number | null;
  max_monthly_trades?: number | null;
  trading_restrictions?: string | null;
  notes?: string | null;
}

/**
 * Personal account rules. These are the user's own configurable
 * preferences and are never mixed with Maven rules.
 */
export interface PersonalRules {
  risk_percent_per_trade?: number | null;
  daily_loss_percent?: number | null;
  max_drawdown_percent?: number | null;
  notes?: string | null;
}

/**
 * Rule change event.
 */
export interface AccountRuleHistoryEntry {
  id: string;
  user_id: string;
  account_id: string;
  changed_at: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  reason: string | null;
}




// ============================================================
// Phase 18A — Maven rule versions + Personal Trading Plan
// ============================================================

export interface MavenRulesV2 {
  daily_drawdown_percent: number;
  daily_reset_time_utc: string;
  daily_reference: "higher_of_balance_or_equity" | "balance" | "equity";
  max_trailing_drawdown_percent: number;
  trailing_reference: "highest_equity_watermark" | "highest_balance_watermark";
  max_floating_loss_percent: number;
  max_risk_per_trade_percent: number;
  min_payout_profit_percent: number;
  consistency_max_percent: number;
  trader_profit_share_percent: number;
  firm_profit_share_percent: number;
  max_withdrawal_per_30d: number;
  payout_processing_days: number;
  account_resets_after_payout: boolean;
  require_kyc: boolean;
  inactivity_warning_days: number;
  excessive_scalping_threshold_seconds: number;
  excessive_scalping_percent: number;
  support_account_sizes: number[];
}

export interface MavenRuleVersion {
  id: string;
  user_id: string;
  version_label: string;
  program: string;
  effective_from: string;
  effective_to: string | null;
  verified_on: string | null;
  source_url: string | null;
  notes: string | null;
  rules: MavenRulesV2;
  created_at: string;
}

export type PersonalRiskBasis = "balance" | "equity" | "starting_balance";
export type PersonalApprovalMode = "informational" | "warning" | "block";
export type PersonalSlUnit = "pips" | "points" | "price";
export type PersonalTpMethod = "rr" | "pips" | "price" | "atr" | "other";

export interface PersonalTradingPlan {
  id: string;
  user_id: string;
  account_id: string;
  version_label: string;
  effective_from: string;
  is_active: boolean;

  // Capital
  currency: string;
  risk_basis: PersonalRiskBasis;
  funding_source: string | null;

  // Risk Management
  default_risk_percent: number | null;
  default_fixed_risk: number | null;
  max_risk_percent: number | null;
  high_quality_risk_percent: number | null;
  low_quality_risk_percent: number | null;
  max_daily_loss_percent: number | null;
  max_weekly_loss_percent: number | null;
  max_monthly_loss_percent: number | null;
  max_drawdown_percent: number | null;
  max_open_trades: number | null;
  max_trades_per_day: number | null;
  max_trades_per_week: number | null;
  max_trades_per_month: number | null;
  max_aggregate_open_risk_percent: number | null;
  max_consecutive_losses: number | null;
  cooldown_hours_after_loss: number | null;
  limits_enabled: Record<string, boolean>;

  // Profit Targets
  daily_target_percent: number | null;
  weekly_target_percent: number | null;
  monthly_target_percent: number | null;
  daily_target_amount: number | null;
  weekly_target_amount: number | null;
  monthly_target_amount: number | null;
  min_rr: number | null;
  preferred_rr: number | null;
  stop_after_daily_target: boolean;
  stop_after_weekly_target: boolean;
  stop_after_monthly_target: boolean;
  targets_enabled: Record<string, boolean>;

  // Stop Loss / Take Profit
  default_sl_pips: number | null;
  sl_unit: PersonalSlUnit;
  min_sl_pips: number | null;
  max_sl_pips: number | null;
  default_tp_pips: number | null;
  preferred_rr_tp: number | null;
  tp_method: PersonalTpMethod | null;
  min_expected_reward: number | null;
  preferred_exit_method: string | null;
  max_lot_size: number | null;
  min_lot_size: number | null;
  lot_increment: number | null;
  breakeven_enabled: boolean;
  breakeven_at_rr: number | null;
  partial_close_enabled: boolean;
  partial_close_at_rr: number | null;
  partial_close_percent: number | null;
  trailing_stop_enabled: boolean;
  sl_tp_by_instrument: Record<string, unknown>;

  // Strategy & Discipline
  preferred_instruments: string[] | null;
  preferred_sessions: string[] | null;
  preferred_trading_days: string[] | null;
  require_htf_confirmation: boolean;
  require_market_structure: boolean;
  require_liquidity_conditions: boolean;
  require_entry_confirmation: boolean;
  permitted_setups: string[] | null;
  min_setup_quality: "Low" | "Medium" | "High" | null;
  confidence_requirement: "Low" | "Medium" | "High" | null;
  news_restrictions: string | null;
  max_low_quality_risk_percent: number | null;
  approval_mode: PersonalApprovalMode;

  // Trading Schedule
  active_from: string | null;
  active_to: string | null;
  active_timezone: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanHistoryEntry {
  id: string;
  user_id: string;
  account_id: string;
  plan_kind: "MAVEN" | "PERSONAL";
  changed_at: string;
  changed_by: string | null;
  summary: string | null;
  diff: Record<string, unknown> | null;
  version_label: string | null;
}
