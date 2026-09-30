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

  created_at: string;
  updated_at: string;
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
