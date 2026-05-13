"use client";

import { format, addDays, isToday, isYesterday } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { dateKey } from "@/lib/dates";

export function DateScroller({
  selected,
  onChange,
}: {
  selected: string;
  onChange: (date: string) => void;
}) {
  const selectedDate = new Date(selected + "T00:00:00");
  const today = dateKey(new Date());
  const isOnToday = selected === today;

  const label = isToday(selectedDate)
    ? "Today"
    : isYesterday(selectedDate)
      ? "Yesterday"
      : format(selectedDate, "EEE, MMM d");

  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-stone-900/10 bg-white p-2 shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
      <button
        onClick={() => onChange(dateKey(addDays(selectedDate, -1)))}
        className="rounded-xl p-2 text-stone-700 hover:bg-stone-100 active:scale-95"
        aria-label="Previous day"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="relative flex-1 text-center">
        <div className="text-base font-semibold text-stone-900">{label}</div>
        <div className="text-xs text-stone-500">{format(selectedDate, "MMMM d, yyyy")}</div>
        <input
          type="date"
          value={selected}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>

      <button
        onClick={() => onChange(dateKey(addDays(selectedDate, 1)))}
        disabled={isOnToday}
        className="rounded-xl p-2 text-stone-700 hover:bg-stone-100 active:scale-95 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next day"
      >
        <ChevronRight size={20} />
      </button>

      {!isOnToday && (
        <button
          onClick={() => onChange(today)}
          className="flex items-center gap-1 rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600 active:scale-95"
        >
          <Calendar size={12} />
          Today
        </button>
      )}
    </div>
  );
}
