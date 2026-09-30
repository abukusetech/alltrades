"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ScanSearch,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  ShieldCheck,
  ArrowUpRight,
  Settings,
  LogOut,
  X,
  ClipboardList,
  Calculator,
  Layers,
  ScrollText,
  Sunrise,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WORKSPACE: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/daily-analysis", label: "Daily Analysis", icon: Sunrise },
  { href: "/trade-check", label: "Trade Check", icon: ClipboardList },
  { href: "/position-calculator", label: "Position Calculator", icon: Calculator },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/analysis", label: "Analysis", icon: ScanSearch },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/weekly-review", label: "Weekly Review", icon: ClipboardCheck },
];

const ACCOUNT: NavItem[] = [
  { href: "/consistency", label: "Consistency", icon: ShieldCheck },
  { href: "/rules", label: "Rules", icon: ScrollText },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { href: "/portfolio", label: "Portfolio", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => void | Promise<void>;
  userEmail?: string | null;
}

export function Sidebar({ open, onClose, onSignOut, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-700 text-white transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Primary navigation"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link
            href="/dashboard"
            prefetch
            className="flex items-center gap-2.5 text-white"
            onClick={onClose}
          >
            <AlltradesMark className="h-7 w-7" />
            <span className="text-sm font-semibold tracking-wide">
              ALLTRADES
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto pb-4">
          <SidebarSection
            title="Workspace"
            items={WORKSPACE}
            pathname={pathname}
            onNavigate={onClose}
          />
          <SidebarSection
            title="Account"
            items={ACCOUNT}
            pathname={pathname}
            onNavigate={onClose}
          />
        </nav>

        <div className="border-t border-white/10 p-3">
          {userEmail && (
            <div
              className="mb-2 truncate px-2 text-3xs text-white/60"
              title={userEmail}
            >
              {userEmail}
            </div>
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <div className="sidebar-section-title">{title}</div>
      <ul className="space-y-0.5 px-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AlltradesMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <rect width="32" height="32" rx="7" fill="currentColor" opacity="0.15" />
      <path
        d="M6 26 L13 8 L16.5 8 L23.5 26 L20 26 L15 12.5 L10 26 Z"
        fill="currentColor"
      />
      <rect x="11" y="19" width="9" height="2.5" fill="currentColor" />
      <path
        d="M8 23 L22 13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 13 L22 13 L22 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
