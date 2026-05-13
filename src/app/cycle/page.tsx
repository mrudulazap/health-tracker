"use client";

import { useState, useMemo } from "react";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, Droplet, Trash2 } from "lucide-react";
import { addCycleEntry, deleteCycleEntry, useCycle, useSettings } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { dateKey } from "@/lib/dates";
import { predictCycle } from "@/lib/cycle";
import { CycleFlow, CycleSymptom } from "@/lib/types";

const flows: { value: CycleFlow; label: string; color: string }[] = [
  { value: "spotting", label: "Spotting", color: "bg-pink-200" },
  { value: "light", label: "Light", color: "bg-rose-300" },
  { value: "medium", label: "Medium", color: "bg-rose-500" },
  { value: "heavy", label: "Heavy", color: "bg-rose-700" },
];

const symptoms: { value: CycleSymptom; label: string }[] = [
  { value: "cramps", label: "Cramps" },
  { value: "headache", label: "Headache" },
  { value: "bloating", label: "Bloating" },
  { value: "mood-swings", label: "Mood swings" },
  { value: "fatigue", label: "Fatigue" },
  { value: "acne", label: "Acne" },
  { value: "back-pain", label: "Back pain" },
  { value: "tender-breasts", label: "Tender breasts" },
];

export default function CyclePage() {
  const { entries } = useCycle();
  const { settings } = useSettings();
  const prediction = useMemo(
    () =>
      predictCycle(
        entries,
        settings?.avgCycleLengthDays ?? 28,
        settings?.avgPeriodLengthDays ?? 5,
      ),
    [entries, settings],
  );

  const [viewMonth, setViewMonth] = useState(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const entryFor = (d: Date) => entries.find((e) => e.date === dateKey(d));

  const isPredictedPeriod = (d: Date) => {
    if (!prediction.nextPeriodStart) return false;
    const days = differenceInDays(d, prediction.nextPeriodStart);
    return days >= 0 && days < prediction.periodLength;
  };

  const isFertile = (d: Date) =>
    prediction.fertileWindowStart &&
    prediction.fertileWindowEnd &&
    d >= prediction.fertileWindowStart &&
    d <= prediction.fertileWindowEnd;

  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
          Cycle <span className="inline-block">🌸</span>
        </h1>
        <p className="mt-1 text-sm font-medium text-stone-500">
          Period tracking & predictions
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <PredictCard
          label="Next period"
          value={
            prediction.nextPeriodStart
              ? format(prediction.nextPeriodStart, "MMM d")
              : "—"
          }
          sub={
            prediction.nextPeriodStart
              ? `in ${differenceInDays(prediction.nextPeriodStart, new Date())} days`
              : "Log your first period"
          }
        />
        <PredictCard
          label={prediction.isOnPeriod ? "On period" : "Cycle day"}
          value={prediction.currentDayOfCycle ? `Day ${prediction.currentDayOfCycle}` : "—"}
          sub={`${prediction.cycleLength}-day cycle`}
        />
      </div>

      <div className="rounded-3xl border-2 border-stone-900/10 bg-white p-4 shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setViewMonth(addDays(startOfMonth(viewMonth), -1))}
            className="rounded p-1 hover:bg-stone-100"
          >
            <ChevronLeft size={18} />
          </button>
          <h2 className="text-sm font-medium">{format(viewMonth, "MMMM yyyy")}</h2>
          <button
            onClick={() => setViewMonth(addDays(endOfMonth(viewMonth), 1))}
            className="rounded p-1 hover:bg-stone-100"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-400">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((d) => {
            const entry = entryFor(d);
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isSelected = isSameDay(d, selected);
            const isPredicted = isPredictedPeriod(d);
            const fertile = isFertile(d);
            const flow = entry?.flow;

            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelected(d)}
                className={`relative aspect-square rounded-lg text-sm transition ${
                  !inMonth ? "text-stone-300" : "text-stone-700"
                } ${
                  isSelected ? "ring-2 ring-stone-900" : "hover:bg-stone-50"
                }`}
              >
                <span className="relative z-10">{d.getDate()}</span>
                {flow && (
                  <span
                    className={`absolute inset-1 rounded-md opacity-80 ${
                      flows.find((f) => f.value === flow)?.color ?? "bg-rose-400"
                    }`}
                  />
                )}
                {!flow && isPredicted && (
                  <span className="absolute inset-1 rounded-md border-2 border-dashed border-rose-300" />
                )}
                {!flow && !isPredicted && fertile && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-500">
          <Legend color="bg-rose-500" label="Logged period" />
          <Legend color="border-2 border-dashed border-rose-300" label="Predicted" />
          <Legend dot label="Fertile window" />
        </div>
      </div>

      <DayEntryForm date={selected} entry={entryFor(selected)} />
    </div>
  );
}

function PredictCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border-2 border-stone-900/10 bg-white p-4 text-center shadow-[0_4px_0_-1px_rgba(0,0,0,0.08)]">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-stone-900">{value}</div>
      <div className="text-xs text-stone-400">{sub}</div>
    </div>
  );
}

function Legend({ color, label, dot }: { color?: string; label: string; dot?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      ) : (
        <span className={`h-3 w-3 rounded ${color}`} />
      )}
      <span>{label}</span>
    </div>
  );
}

function DayEntryForm({
  date,
  entry,
}: {
  date: Date;
  entry?: ReturnType<typeof useCycle>["entries"][number];
}) {
  const { id: uid } = useCurrentUser();
  const [flow, setFlow] = useState<CycleFlow | null>(entry?.flow ?? null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<CycleSymptom[]>(entry?.symptoms ?? []);
  const [isPeriodStart, setIsPeriodStart] = useState(entry?.isPeriodStart ?? false);
  const [isPeriodEnd, setIsPeriodEnd] = useState(entry?.isPeriodEnd ?? false);

  // Reset when date changes
  useMemo(() => {
    setFlow(entry?.flow ?? null);
    setSelectedSymptoms(entry?.symptoms ?? []);
    setIsPeriodStart(entry?.isPeriodStart ?? false);
    setIsPeriodEnd(entry?.isPeriodEnd ?? false);
  }, [entry, date]);

  async function save() {
    if (entry) await deleteCycleEntry(uid, entry.id);
    await addCycleEntry(uid, {
      date: dateKey(date),
      isPeriodStart,
      isPeriodEnd,
      flow: flow ?? undefined,
      symptoms: selectedSymptoms,
      createdAt: Date.now(),
    });
  }

  function toggleSymptom(s: CycleSymptom) {
    setSelectedSymptoms((prev) =>
      prev.includes(s) ? prev.filter((p) => p !== s) : [...prev, s],
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium">{format(date, "EEEE, MMM d")}</h3>
        {entry && (
          <button
            onClick={async () => {
              if (entry) await deleteCycleEntry(uid, entry.id);
            }}
            className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setIsPeriodStart(!isPeriodStart)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            isPeriodStart
              ? "bg-rose-500 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          <Droplet size={12} className="inline mr-1" />
          Period started
        </button>
        <button
          onClick={() => setIsPeriodEnd(!isPeriodEnd)}
          className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition ${
            isPeriodEnd
              ? "bg-stone-700 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          Period ended
        </button>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-stone-500">Flow</div>
        <div className="grid grid-cols-4 gap-2">
          {flows.map((f) => (
            <button
              key={f.value}
              onClick={() => setFlow(flow === f.value ? null : f.value)}
              className={`rounded-lg px-2 py-2 text-xs transition ${
                flow === f.value ? `${f.color} text-white` : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-stone-500">Symptoms</div>
        <div className="flex flex-wrap gap-1.5">
          {symptoms.map((s) => (
            <button
              key={s.value}
              onClick={() => toggleSymptom(s.value)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                selectedSymptoms.includes(s.value)
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        className="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
      >
        Save entry
      </button>
    </div>
  );
}
