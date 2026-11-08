"use client";

import * as React from "react";
import { CinematicIntro } from "./CinematicIntro";

export function LandingWrapper({ children }: { children: React.ReactNode }) {
  const [showIntro, setShowIntro] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Show intro only once per browser session
    const seen = sessionStorage.getItem("alltrades.introSeen");
    if (!seen) {
      setShowIntro(true);
    }
  }, []);

  function handleComplete() {
    sessionStorage.setItem("alltrades.introSeen", "1");
    setShowIntro(false);
  }

  // Prevent flash of content before we know whether to show intro
  if (!mounted) {
    return <div className="min-h-screen bg-ink-950" />;
  }

  return (
    <>
      {showIntro && <CinematicIntro onComplete={handleComplete} />}
      <div className={showIntro ? "opacity-0" : "opacity-100 transition-opacity duration-500"}>
        {children}
      </div>
    </>
  );
}
