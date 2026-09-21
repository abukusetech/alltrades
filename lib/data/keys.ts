export const swrKeys = {
  trades: (accountId: string | null) =>
    accountId ? (["trades", accountId] as const) : null,
  withdrawals: (accountId: string | null) =>
    accountId ? (["withdrawals", accountId] as const) : null,
  analyses: (accountId: string | null) =>
    accountId ? (["analyses", accountId] as const) : null,
  accounts: (userId: string | null) =>
    userId ? (["accounts", userId] as const) : null,
  weeklyReview: (accountId: string | null, weekStart: string) =>
    accountId ? (["weeklyReview", accountId, weekStart] as const) : null,
};
