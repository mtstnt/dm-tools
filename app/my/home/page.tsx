"use client";

import { ThisWeekWidget } from "@/components/calendar-widget";
import { InstallAppBanner } from "@/components/install-app-banner";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Home</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to DM Tools.
        </p>
      </div>

      <InstallAppBanner />

      <ThisWeekWidget />
    </div>
  );
}
