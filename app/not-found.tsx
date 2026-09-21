import Link from "next/link";
import { AlltradesMark } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16">
      <div className="flex items-center gap-2.5">
        <AlltradesMark className="h-8 w-8 text-brand-600" />
        <span className="text-sm font-semibold tracking-wide text-ink-900">
          ALLTRADES
        </span>
      </div>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink-900">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-center text-xs text-ink-500">
        The page you were looking for doesn&apos;t exist or has moved.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Link href="/dashboard">
          <Button>Go to Dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}
