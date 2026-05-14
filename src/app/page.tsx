"use client";

import { useState } from "react";
import { QuickLog } from "@/components/QuickLog";
import { DaySummary } from "@/components/DaySummary";
import { DateScroller } from "@/components/DateScroller";
import { UserSwitcher, ReadOnlyBanner } from "@/components/UserSwitcher";
import { useSettings } from "@/lib/store";
import { useViewingUser } from "@/lib/auth";
import { todayKey } from "@/lib/dates";

export default function TodayPage() {
  const { viewing, isReadOnly } = useViewingUser();
  const { settings } = useSettings();
  const [date, setDate] = useState(todayKey());
  const firstName =
    settings?.displayName?.split(" ")[0] ?? viewing.name.split(" ")[0];

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            {isReadOnly ? `${firstName}'s day` : `Hey ${firstName}`}{" "}
            <span className="inline-block animate-wiggle">
              {isReadOnly ? "👁️" : "👋"}
            </span>
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500">
            {isReadOnly ? "Read-only view" : "Let's track your day"}
          </p>
        </div>
        <UserSwitcher />
      </header>

      <ReadOnlyBanner />
      <DateScroller selected={date} onChange={setDate} />
      <QuickLog settings={settings} date={date} />
      <DaySummary date={date} />
    </div>
  );
}
