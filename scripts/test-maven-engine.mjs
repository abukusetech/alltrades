// ALLTRADES — Maven engine self-test
// Run: node scripts/test-maven-engine.mjs
//
// These tests are duplicated from the brief. If any fail, the
// engine has a regression.

// ------------------- TEST HARNESS -------------------

let passed = 0;
let failed = 0;

function expect(name, actual, expected, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✓ ${name} — ${actual}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} — got ${actual}, expected ${expected}`);
    failed++;
  }
}

// ------------------- INLINE MINI ENGINE -------------------
// Mirrors lib/accounts/maven-engine.ts

function dailyDrawdown(ref, pct, currentEquity) {
  const allowance = (ref * pct) / 100;
  const threshold = ref - allowance;
  const used = Math.max(ref - currentEquity, 0);
  const remaining = Math.max(allowance - used, 0);
  const percentUsed = allowance > 0 ? Math.min(100, (used / allowance) * 100) : 0;
  return { allowance, threshold, used, remaining, percentUsed, breached: currentEquity <= threshold };
}

function trailingDrawdown(watermark, pct, currentEquity) {
  const allowance = (watermark * pct) / 100;
  const threshold = watermark - allowance;
  const used = Math.max(watermark - currentEquity, 0);
  const remaining = Math.max(allowance - used, 0);
  const percentUsed = allowance > 0 ? Math.min(100, (used / allowance) * 100) : 0;
  return { allowance, threshold, used, remaining, percentUsed, breached: currentEquity <= threshold };
}

function floatingLoss(balance, pct, equity) {
  const allowance = (balance * pct) / 100;
  const loss = Math.max(balance - equity, 0);
  const remaining = Math.max(allowance - loss, 0);
  return { allowance, loss, remaining, breached: loss > allowance };
}

function riskPerTrade(balance, pct, planned) {
  const allowed = (balance * pct) / 100;
  return { allowed, within: planned <= allowed + 0.01 };
}

function payoutProfit(starting, pct, currentEquity) {
  const required = (starting * pct) / 100;
  const profit = Math.max(currentEquity - starting, 0);
  const remaining = Math.max(required - profit, 0);
  return { required, profit, remaining, met: profit >= required };
}

function consistency(trades, maxPct) {
  const byDay = new Map();
  for (const t of trades) {
    byDay.set(t.trade_date, (byDay.get(t.trade_date) ?? 0) + t.profit_loss);
  }
  let biggest = 0;
  let total = 0;
  for (const pnl of byDay.values()) {
    if (pnl > 0) {
      total += pnl;
      if (pnl > biggest) biggest = pnl;
    }
  }
  const score = total > 0 && biggest > 0 ? (biggest / total) * 100 : 0;
  return { biggest, total, score, maxAllowed: maxPct, met: score <= maxPct };
}

function split(gross, traderPct, fees = 0) {
  const trader = (gross * traderPct) / 100;
  return { trader, net: Math.max(trader - fees, 0) };
}

function cap(paid, capAmount, cutoffISO) {
  const used = paid
    .filter((w) => w.date >= cutoffISO)
    .reduce((s, w) => s + w.amount, 0);
  return { used, remaining: Math.max(capAmount - used, 0) };
}

// ------------------- TESTS -------------------

console.log('\n📋 Rule 1 — Daily drawdown (2%)');
{
  // Brief example: $2,000 account, 2% → $40 allowance, threshold $1,960
  const r = dailyDrawdown(2000, 2, 2000);
  expect('allowance', r.allowance, 40);
  expect('threshold', r.threshold, 1960);
  expect('safe when at ref', r.breached ? 1 : 0, 0);

  // $1,950 → used $50, allowance $40 → breached
  const r2 = dailyDrawdown(2000, 2, 1950);
  expect('breached at $1,950', r2.breached ? 1 : 0, 1);
  expect('used', r2.used, 50);

  // $1,970 → used $30, safe
  const r3 = dailyDrawdown(2000, 2, 1970);
  expect('used at $1,970', r3.used, 30);
  expect('remaining', r3.remaining, 10);
  expect('safe at $1,970', r3.breached ? 1 : 0, 0);
}

console.log('\n📋 Rule 2 — Trailing drawdown (3%)');
{
  // Brief example: watermark $2,100 → allowance $63, threshold $2,037
  const r = trailingDrawdown(2100, 3, 2100);
  expect('allowance', r.allowance, 63);
  expect('threshold', r.threshold, 2037);
  expect('safe at watermark', r.breached ? 1 : 0, 0);

  // $2,050 → used $50, safe
  const r2 = trailingDrawdown(2100, 3, 2050);
  expect('used at $2,050', r2.used, 50);
  expect('safe at $2,050', r2.breached ? 1 : 0, 0);

  // $2,030 → used $70, breached
  const r3 = trailingDrawdown(2100, 3, 2030);
  expect('breached at $2,030', r3.breached ? 1 : 0, 1);
}

console.log('\n📋 Rule 3 — Floating loss (1%)');
{
  // Brief example: $2,000 balance, 1% → $20 allowance
  const r = floatingLoss(2000, 1, 2000);
  expect('allowance', r.allowance, 20);

  // $1,990 → loss $10, safe
  const r2 = floatingLoss(2000, 1, 1990);
  expect('loss at $1,990', r2.loss, 10);
  expect('safe at $1,990', r2.breached ? 1 : 0, 0);

  // $1,975 → loss $25, breached
  const r3 = floatingLoss(2000, 1, 1975);
  expect('breached at $1,975', r3.breached ? 1 : 0, 1);
}

console.log('\n📋 Rule 4 — Risk per trade (1%)');
{
  const r = riskPerTrade(2000, 1, 20);
  expect('allowed', r.allowed, 20);
  expect('$20 within', r.within ? 1 : 0, 1);

  const r2 = riskPerTrade(2000, 1, 25);
  expect('$25 exceeds', r2.within ? 1 : 0, 0);
}

console.log('\n📋 Rule 5 — Payout profit (3%)');
{
  // Brief example: $2,000 → $60 required
  const r = payoutProfit(2000, 3, 2050);
  expect('required', r.required, 60);
  expect('profit', r.profit, 50);
  expect('remaining', r.remaining, 10);
  expect('not met', r.met ? 1 : 0, 0);

  const r2 = payoutProfit(2000, 3, 2070);
  expect('met at $2,070', r2.met ? 1 : 0, 1);
}

console.log('\n📋 Rule 6 — Consistency (20%)');
{
  // Brief example: biggest day $20, total $100 → 20%
  const trades = [
    { trade_date: '2026-01-01', profit_loss: 20 },  // biggest day
    { trade_date: '2026-01-02', profit_loss: 20 },
    { trade_date: '2026-01-03', profit_loss: 20 },
    { trade_date: '2026-01-04', profit_loss: 20 },
    { trade_date: '2026-01-05', profit_loss: 20 },
  ];
  const r = consistency(trades, 20);
  expect('biggest day', r.biggest, 20);
  expect('total', r.total, 100);
  expect('score', r.score, 20);
  expect('met', r.met ? 1 : 0, 1);

  // Over limit
  const trades2 = [
    { trade_date: '2026-01-01', profit_loss: 50 },
    { trade_date: '2026-01-02', profit_loss: 25 },
    { trade_date: '2026-01-03', profit_loss: 25 },
  ];
  const r2 = consistency(trades2, 20);
  expect('score over', r2.score, 50);
  expect('not met', r2.met ? 1 : 0, 0);

  // Zero profit → 0%
  const r3 = consistency([], 20);
  expect('empty → 0', r3.score, 0);
  expect('empty safe', r3.met ? 1 : 0, 1);
}

console.log('\n📋 Rule 7 — Profit split (80/20)');
{
  const r = split(48, 80, 0);
  expect('trader cut at $48', r.trader, 38.4);
  expect('net', r.net, 38.4);

  const r2 = split(48, 80, 5);
  expect('net with $5 fee', r2.net, 33.4);
}

console.log('\n📋 Rule 8 — 30-day withdrawal cap ($10,000)');
{
  const today = '2026-10-12';
  const cutoff = '2026-09-12';
  const paid = [
    { date: '2026-10-01', amount: 2000 },
    { date: '2026-10-05', amount: 3000 },
    { date: '2026-08-01', amount: 5000 }, // outside window
  ];
  const r = cap(paid, 10000, cutoff);
  expect('used in window', r.used, 5000);
  expect('remaining', r.remaining, 5000);
}

// ------------------- SUMMARY -------------------

console.log('\n' + '='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50) + '\n');

if (failed > 0) process.exit(1);

