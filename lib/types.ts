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
