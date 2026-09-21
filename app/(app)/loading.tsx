export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Page header skeleton */}
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-ink-100" />
          <div className="h-3 w-64 animate-pulse rounded bg-ink-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded bg-ink-100" />
      </div>

      {/* Account header skeleton */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-soft px-5 py-4">
        <div className="space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
          <div className="h-4 w-40 animate-pulse rounded bg-ink-100" />
        </div>
        <div className="space-y-2 text-right">
          <div className="ml-auto h-3 w-24 animate-pulse rounded bg-ink-100" />
          <div className="ml-auto h-5 w-28 animate-pulse rounded bg-ink-100" />
        </div>
      </div>

      {/* Metric row skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-white p-5 shadow-card"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-ink-100" />
            <div className="mt-3 h-6 w-32 animate-pulse rounded bg-ink-100" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-ink-100" />
          </div>
        ))}
      </div>

      {/* Body skeleton */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 animate-pulse rounded-lg border border-border bg-white shadow-card" />
          <div className="h-56 animate-pulse rounded-lg border border-border bg-white shadow-card" />
        </div>
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-lg border border-border bg-white shadow-card" />
          <div className="h-40 animate-pulse rounded-lg border border-border bg-white shadow-card" />
        </div>
      </div>
    </div>
  );
}
