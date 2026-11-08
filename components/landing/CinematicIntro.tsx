"use client";

import * as React from "react";
import { AlltradesMark } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";

interface CinematicIntroProps {
  onComplete: () => void;
}

export function CinematicIntro({ onComplete }: CinematicIntroProps) {
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    // Respect user's motion preference — skip intro entirely
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      onComplete();
      return;
    }

    // Sequence: 1=logo, 2=brand, 3=tagline, 4=hold, 5=fade out
    const timers = [
      window.setTimeout(() => setStage(1), 100),
      window.setTimeout(() => setStage(2), 700),
      window.setTimeout(() => setStage(3), 1200),
      window.setTimeout(() => setStage(4), 1900),
      window.setTimeout(() => {
        setStage(5);
        window.setTimeout(onComplete, 400);
      }, 2400),
    ];

    return () => timers.forEach((t) => clearTimeout(t));
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-ink-950 transition-opacity duration-500",
        stage === 5 ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      role="dialog"
      aria-label="Welcome to AllTrades"
    >
      {/* Ambient radial glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background: "radial-gradient(ellipse at center, rgba(37, 99, 235, 0.15) 0%, transparent 60%)",
          opacity: stage >= 1 ? 1 : 0,
        }}
      />

      {/* Skip button (always accessible) */}
      <button
        type="button"
        onClick={() => {
          setStage(5);
          window.setTimeout(onComplete, 300);
        }}
        className="absolute right-6 top-6 rounded border border-white/20 px-3 py-1.5 text-3xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
      >
        Skip Intro
      </button>

      {/* Logo */}
      <div
        className={cn(
          "relative transition-all duration-700 ease-out",
          stage >= 1 ? "scale-100 opacity-100" : "scale-75 opacity-0"
        )}
      >
        <AlltradesMark className="h-20 w-20 text-brand-500" />
        {/* Light sweep effect */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-1000",
            stage >= 2 ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="absolute inset-0 -translate-x-full animate-[sweep_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>

      {/* Brand name */}
      <div
        className={cn(
          "mt-6 transition-all duration-700 ease-out",
          stage >= 2 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <span className="text-2xl font-semibold tracking-[0.2em] text-white">
          ALLTRADES
        </span>
      </div>

      {/* Tagline */}
      <div
        className={cn(
          "mt-3 transition-all duration-700 ease-out",
          stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        )}
      >
        <span className="text-xs font-medium tracking-wider text-ink-400">
          Trade With Precision. Build With Discipline.
        </span>
      </div>
    </div>
  );
}
