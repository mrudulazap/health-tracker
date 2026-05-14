"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  format,
  startOfWeek,
  startOfMonth,
  startOfYear,
  eachDayOfInterval,
  addDays,
  eachMonthOfInterval,
  endOfYear,
  differenceInDays,
} from "date-fns";
import { Flame, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useMeals, useWorkouts, useSettings } from "@/lib/store";
import { UserSwitcher, ReadOnlyBanner } from "@/components/UserSwitcher";
import { useViewingUser } from "@/lib/auth";
import { dateKey } from "@/lib/dates";

type Period = "daily" | "weekly" | "monthly" | "yearly";
type Metric = "eaten" | "burned" | "net";

const metrics: Record<
  Metric,
  { label: string; emoji: string; color: string; light: string; ring: string }
> = {
  eaten: {
    label: "Eaten",
    emoji: "🍴",
    color: "#fb7185", // rose-400
    light: "#fff1f2", // rose-50
    ring: "ring-rose-400",
  },
  burned: {
    label: "Burned",
    emoji: "🔥",
    color: "#34d399", // emerald-400
    light: "#ecfdf5", // emerald-50
    ring: "ring-emerald-400",
  },
  net: {
    label: "Net",
    emoji: "⚖️",
    color: "#6366f1", // indigo-500
    light: "#eef2ff", // indigo-50
    ring: "ring-indigo-400",
  },
};

interface Bucket {
  key: string;
  label: string;
  short: string;
  start: Date;
  end: Date;
}

function buildBuckets(period: Period, anchor: Date): Bucket[] {
  if (period === "daily") {
    return Array.from({ length: 24 }, (_, h) => {
      const start = new Date(anchor);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start);
      end.setHours(h + 1);
      return {
        key: `${dateKey(anchor)}-${h}`,
        label: `${h}:00`,
        short: h % 6 === 0 ? `${h}` : "",
        start,
        end,
      };
    });
  }
  if (period === "weekly") {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) }).map((d) => ({
      key: dateKey(d),
      label: format(d, "EEE, MMM d"),
      short: format(d, "EEEEE"),
      start: d,
      end: addDays(d, 1),
    }));
  }
  if (period === "monthly") {
    const monthStart = startOfMonth(anchor);
    const days = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = addDays(monthStart, i);
      return {
        key: dateKey(d),
        label: format(d, "MMM d"),
        short: (i + 1) % 5 === 0 || i === 0 ? `${i + 1}` : "",
        start: d,
        end: addDays(d, 1),
      };
    });
  }
  const yearStart = startOfYear(anchor);
  return eachMonthOfInterval({ start: yearStart, end: endOfYear(anchor) }).map((d) => {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      key: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
      short: format(d, "MMM"),
      start: d,
      end: next,
    };
  });
}

export default function ChartsPage() {
  const { viewing } = useViewingUser();
  const [period, setPeriod] = useState<Period>("weekly");
  const [metric, setMetric] = useState<Metric>("eaten");
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);
  const { meals } = useMeals();
  const { workouts } = useWorkouts();
  const { settings } = useSettings();
  const target = settings?.dailyKcalTarget ?? 2000;

  const today = new Date();
  const buckets = useMemo(() => buildBuckets(period, today), [period, today]);

  const data = useMemo(() => {
    return buckets.map((b) => {
      const inMeals = meals.filter((m) => {
        const d = new Date(m.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const inWork = workouts.filter((w) => {
        const d = new Date(w.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const eaten = inMeals.reduce((s, m) => s + m.totalKcal, 0);
      const burned = inWork.reduce((s, w) => s + w.kcalBurned, 0);
      return {
        key: b.key,
        label: b.label,
        short: b.short,
        eaten,
        burned,
        net: eaten - burned,
      };
    });
  }, [meals, workouts, buckets]);

  const activeData = data.map((d) => ({
    ...d,
    value: d[metric],
  }));

  const nonZero = activeData.filter((d) => d.value !== 0);
  const total = activeData.reduce((s, d) => s + d.value, 0);
  const avg = nonZero.length ? Math.round(total / nonZero.length) : 0;

  // vs last period comparison
  const lastPeriodAnchor = useMemo(() => {
    if (period === "daily") return addDays(today, -1);
    if (period === "weekly") return addDays(today, -7);
    if (period === "monthly") {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      return d;
    }
    const d = new Date(today);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }, [period, today]);

  const lastBuckets = useMemo(
    () => buildBuckets(period, lastPeriodAnchor),
    [period, lastPeriodAnchor],
  );
  const lastTotal = useMemo(() => {
    return lastBuckets.reduce((sum, b) => {
      const inMeals = meals.filter((m) => {
        const d = new Date(m.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const inWork = workouts.filter((w) => {
        const d = new Date(w.date + "T00:00:00");
        return d >= b.start && d < b.end;
      });
      const eaten = inMeals.reduce((s, m) => s + m.totalKcal, 0);
      const burned = inWork.reduce((s, w) => s + w.kcalBurned, 0);
      const value = metric === "eaten" ? eaten : metric === "burned" ? burned : eaten - burned;
      return sum + value;
    }, 0);
  }, [lastBuckets, meals, workouts, metric]);

  const deltaPct =
    lastTotal === 0 ? null : Math.round(((total - lastTotal) / Math.abs(lastTotal)) * 100);

  const selected = selectedBucketKey
    ? activeData.find((d) => d.key === selectedBucketKey)
    : null;

  const periodLabel: Record<Period, string> = {
    daily: "Today",
    weekly: "This week",
    monthly: "This month",
    yearly: "This year",
  };

  const m = metrics[metric];

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Trends 📈
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500">
            {viewing.name}&apos;s activity
          </p>
        </div>
        <UserSwitcher />
      </header>

      <ReadOnlyBanner />

      {/* Period tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border-2 border-stone-900/10 bg-white p-1.5 shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
        {(["daily", "weekly", "monthly", "yearly"] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              setSelectedBucketKey(null);
            }}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
              period === p
                ? "bg-stone-900 text-white"
                : "text-stone-500 hover:bg-stone-50"
            }`}
          >
            {p.charAt(0)}
          </button>
        ))}
      </div>

      {/* Metric switcher — chips */}
      <div className="flex gap-2 overflow-x-auto">
        {(["eaten", "burned", "net"] as Metric[]).map((mk) => {
          const mm = metrics[mk];
          const active = metric === mk;
          return (
            <button
              key={mk}
              onClick={() => {
                setMetric(mk);
                setSelectedBucketKey(null);
              }}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition active:scale-95 ${
                active
                  ? "bg-stone-900 text-white shadow-lg shadow-stone-900/30"
                  : "bg-white text-stone-700 border-2 border-stone-900/10 hover:bg-stone-50"
              }`}
            >
              <span>{mm.emoji}</span>
              <span>{mm.label}</span>
            </button>
          );
        })}
      </div>

      {/* Hero card */}
      <div
        className="overflow-hidden rounded-3xl border-2 border-stone-900/10 p-6 shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]"
        style={{ backgroundColor: m.light }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {periodLabel[period]} · {m.label}
            </p>
            <h2 className="mt-1 flex items-baseline gap-1">
              <span
                className="text-5xl font-extrabold tracking-tight tabular-nums"
                style={{ color: m.color }}
              >
                {selected ? selected.value : total}
              </span>
              <span className="text-base font-semibold text-stone-500">kcal</span>
            </h2>
            {selected ? (
              <p className="mt-1 text-xs font-medium text-stone-500">
                {selected.label}
              </p>
            ) : (
              <p className="mt-1 text-xs font-medium text-stone-500">
                Avg{" "}
                <span className="font-bold tabular-nums text-stone-700">
                  {avg}
                </span>
                {nonZero.length > 0 && ` · ${nonZero.length} day${nonZero.length === 1 ? "" : "s"}`}
              </p>
            )}
          </div>

          {deltaPct !== null && !selected && (
            <DeltaPill pct={deltaPct} period={period} />
          )}
        </div>

        {/* Bar chart */}
        <div className="mt-4 -mx-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={(d: unknown) => {
                const payload = (d as { activePayload?: { payload?: { key?: string } }[] })
                  ?.activePayload?.[0]?.payload;
                const k = payload?.key;
                if (k) setSelectedBucketKey(k === selectedBucketKey ? null : k);
              }}
            >
              <XAxis
                dataKey="short"
                tick={{ fontSize: 11, fill: "#a8a29e", fontWeight: 600 }}
                stroke="transparent"
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
                labelStyle={{ fontWeight: 700 }}
                formatter={(value) => [`${value} kcal`, m.label]}
                labelFormatter={(_, payload) => {
                  const item = payload?.[0]?.payload as { label?: string } | undefined;
                  return item?.label ?? "";
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {activeData.map((d) => (
                  <Cell
                    key={d.key}
                    fill={
                      selectedBucketKey && d.key !== selectedBucketKey
                        ? `${m.color}40`
                        : m.color
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-2">
        <SmallStat
          icon={<Flame size={14} className="text-rose-500" />}
          label="In"
          value={Math.round(data.reduce((s, d) => s + d.eaten, 0))}
        />
        <SmallStat
          icon={<Activity size={14} className="text-emerald-500" />}
          label="Out"
          value={Math.round(data.reduce((s, d) => s + d.burned, 0))}
        />
        <SmallStat
          icon={<span className="text-xs">⚖️</span>}
          label="Net"
          value={Math.round(data.reduce((s, d) => s + d.net, 0))}
        />
      </div>

      {/* Target hint */}
      {period === "weekly" && (
        <div className="rounded-2xl border-2 border-stone-900/10 bg-white px-4 py-3 shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
          <div className="text-xs font-medium text-stone-500">Weekly target</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold tabular-nums text-stone-900">
              {Math.round(data.reduce((s, d) => s + d.eaten, 0))} / {target * 7}
            </span>
            <span className="text-xs font-bold text-stone-500">
              {Math.round((data.reduce((s, d) => s + d.eaten, 0) / (target * 7)) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full bg-stone-900"
              style={{
                width: `${Math.min(
                  100,
                  (data.reduce((s, d) => s + d.eaten, 0) / (target * 7)) * 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DeltaPill({ pct, period }: { pct: number; period: Period }) {
  const isPositive = pct >= 0;
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const lastLabel = {
    daily: "yesterday",
    weekly: "last week",
    monthly: "last month",
    yearly: "last year",
  }[period];
  return (
    <div
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${
        isPositive ? "bg-stone-900 text-white" : "bg-white text-stone-900"
      }`}
    >
      <Icon size={12} />
      <span className="tabular-nums">
        {isPositive ? "+" : ""}
        {pct}%
      </span>
      <span className="font-medium opacity-70">vs {lastLabel}</span>
    </div>
  );
}

function SmallStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-stone-900/10 bg-white p-3 text-center shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
      <div className="mb-1 flex items-center justify-center gap-1">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
          {label}
        </span>
      </div>
      <div className="text-lg font-extrabold tabular-nums text-stone-900">{value}</div>
      <div className="text-[10px] font-medium text-stone-400">kcal</div>
    </div>
  );
}
