import Link from "next/link";
import { AlltradesMark } from "@/components/layout/Sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-soft">
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <AlltradesMark className="h-7 w-7 text-brand-600" />
            <span className="text-sm font-semibold tracking-wide text-ink-900">
              ALLTRADES
            </span>
          </Link>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div className="border-t border-border bg-white py-4 text-center text-3xs text-ink-500">
        ALLTRADES — Trading journal and account discipline system.
      </div>
    </div>
  );
}
