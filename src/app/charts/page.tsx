"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { format, startOfWeek, startOfMonth, startOfYear, eachDayOfInterval, addDays, eachMonthOfInterval, endOfYear } from "date-fns";
import { useMeals, useWorkouts, useSettings } from "@/lib/store";
import { dateKey } from "@/lib/dates";

type Period = "daily" | "weekly" | "monthly" | "yearly";

export default function ChartsPage() {
  const [period, setPeriod] = useState<Period>("weekly");
  const { meals } = useMeals();
  const { workouts } = useWorkouts();
  const { settings } = useSettings();
  const target = settings?.dailyKcalTarget ?? 2000;

  const data = useMemo(() => {
    const today = new Date();
    let buckets: { key: string; label: string; start: Date; end: Date }[] = [];

    if (period === "daily") {
      buckets = Array.from({ length: 24 }, (_, h) => {
        const start = new Date(today);
        start.setHours(h, 0, 0, 0);
        const end = new Date(start);
        end.setHours(h + 1);
        return { key: String(h), label: `${h}:00`, start, end };
      });
    } else if (period === "weekly") {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      buckets = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((d) => ({
        key: dateKey(d),
        label: format(d, "EEE"),
        start: d,
        end: addDays(d, 1),
      }));
    } else if (period === "monthly") {
      const monthStart = startOfMonth(today);
      const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      buckets = Array.from({ length: days }, (_, i) => {
        const d = addDays(monthStart, i);
        return {
          key: dateKey(d),
          label: format(d, "d"),
          start: d,
          end: addDays(d, 1),
        };
      });
    } else {
      const yearStart = startOfYear(today);
      buckets = eachMonthOfInterval({ start: yearStart, end: endOfYear(today) }).map((d) => {
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        return { key: format(d, "yyyy-MM"), label: format(d, "MMM"), start: d, end: next };
      });
    }

    return buckets.map((b) => {
      const inMeals = meals.filter((m) => {
        const d = new Date(m.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const inWork = workouts.filter((w) => {
        const d = new Date(w.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const kcalIn = inMeals.reduce((s, m) => s + m.totalKcal, 0);
      const kcalOut = inWork.reduce((s, w) => s + w.kcalBurned, 0);
      const days = Math.max(
        1,
        Math.round((b.end.getTime() - b.start.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        label: b.label,
        kcalIn,
        kcalOut,
        net: kcalIn - kcalOut,
        target: target * (period === "yearly" ? days : 1),
      };
    });
  }, [meals, workouts, period, target]);

  const totals = data.reduce(
    (s, d) => ({
      kcalIn: s.kcalIn + d.kcalIn,
      kcalOut: s.kcalOut + d.kcalOut,
    }),
    { kcalIn: 0, kcalOut: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
          Trends <span className="inline-block">📈</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-stone-500">How you&apos;re tracking</p>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize transition ${
              period === p
                ? "bg-stone-900 text-white shadow-lg shadow-stone-900/30"
                : "bg-white text-stone-700 border-2 border-stone-900/10 hover:bg-stone-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border-2 border-stone-900/10 bg-white p-4 text-center shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-stone-500">Total eaten</div>
          <div className="mt-1 text-xl font-semibold text-rose-600">{totals.kcalIn}</div>
          <div className="text-xs text-stone-400">kcal</div>
        </div>
        <div className="rounded-2xl border-2 border-stone-900/10 bg-white p-4 text-center shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
          <div className="text-xs text-stone-500">Total burned</div>
          <div className="mt-1 text-xl font-semibold text-emerald-600">{totals.kcalOut}</div>
          <div className="text-xs text-stone-400">kcal</div>
        </div>
      </div>

      <div className="rounded-3xl border-2 border-stone-900/10 bg-white p-4 shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-stone-700">Calories: in vs out</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -10, right: 0, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e7e5e4", fontSize: 12 }}
              />
              <ReferenceLine y={target} stroke="#a8a29e" strokeDasharray="3 3" />
              <Bar dataKey="kcalIn" fill="#fb7185" radius={[4, 4, 0, 0]} name="Eaten" />
              <Bar dataKey="kcalOut" fill="#34d399" radius={[4, 4, 0, 0]} name="Burned" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
