"use client";

import { useState } from "react";
import { QuickLog } from "@/components/QuickLog";
import { DaySummary } from "@/components/DaySummary";
import { DateScroller } from "@/components/DateScroller";
import { useSettings } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { todayKey } from "@/lib/dates";

export default function TodayPage() {
  const user = useCurrentUser();
  const { settings } = useSettings();
  const [date, setDate] = useState(todayKey());
  const firstName =
    settings?.displayName?.split(" ")[0] ?? user.name.split(" ")[0];

  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
          Hey {firstName} <span className="inline-block animate-wiggle">👋</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-stone-500">
          Let&apos;s track your day
        </p>
      </header>

      <DateScroller selected={date} onChange={setDate} />
      <QuickLog settings={settings} date={date} />
      <DaySummary date={date} />
    </div>
  );
}
