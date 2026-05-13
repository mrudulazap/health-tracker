"use client";

import { useState } from "react";
import { Sparkles, UtensilsCrossed, Dumbbell, Loader2 } from "lucide-react";
import { addMeal, addWorkout } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { kcalBurned } from "@/lib/met";
import { MealSlot, WorkoutKind, FoodItem, UserSettings } from "@/lib/types";

const slots: { value: MealSlot; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "lunch", label: "Lunch", emoji: "🍱" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
  { value: "snack", label: "Snack", emoji: "🥨" },
];

type Mode = "meal" | "workout";

export function QuickLog({
  settings,
  date,
}: {
  settings: UserSettings | null;
  date: string;
}) {
  const { id: uid } = useCurrentUser();
  const [mode, setMode] = useState<Mode>("meal");
  const [slot, setSlot] = useState<MealSlot>("lunch");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      if (mode === "meal") {
        const res = await fetch("/api/parse-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawInput: trimmed }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "parse failed");
        const data = (await res.json()) as { items: FoodItem[] };
        if (!data.items?.length) throw new Error("No food items detected");

        const totals = data.items.reduce(
          (s, it) => ({
            kcal: s.kcal + it.kcal,
            protein: s.protein + it.protein,
            carbs: s.carbs + it.carbs,
            fat: s.fat + it.fat,
            fiber: s.fiber + it.fiber,
          }),
          { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        );

        await addMeal(uid, {
          date,
          slot,
          rawInput: trimmed,
          items: data.items,
          totalKcal: Math.round(totals.kcal),
          totalProtein: Math.round(totals.protein * 10) / 10,
          totalCarbs: Math.round(totals.carbs * 10) / 10,
          totalFat: Math.round(totals.fat * 10) / 10,
          totalFiber: Math.round(totals.fiber * 10) / 10,
          createdAt: Date.now(),
        });
      } else {
        const res = await fetch("/api/parse-workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawInput: trimmed }),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "parse failed");
        const data = (await res.json()) as {
          activities: { kind: WorkoutKind; description: string; durationMin: number }[];
        };
        if (!data.activities?.length) throw new Error("No activities detected");
        const weight = settings?.weightKg ?? 60;
        for (const a of data.activities) {
          await addWorkout(uid, {
            date,
            kind: a.kind,
            description: a.description,
            durationMin: a.durationMin,
            kcalBurned: kcalBurned(a.kind, a.durationMin, weight),
            createdAt: Date.now(),
          });
        }
      }
      setInput("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const accent =
    mode === "meal"
      ? "from-rose-500 to-orange-500"
      : "from-emerald-500 to-teal-500";

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-stone-900/10 bg-white shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]">
      {/* Mode toggle */}
      <div className="flex gap-2 p-3">
        <button
          onClick={() => setMode("meal")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
            mode === "meal"
              ? "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <UtensilsCrossed size={18} />
          Meal
        </button>
        <button
          onClick={() => setMode("workout")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
            mode === "workout"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <Dumbbell size={18} />
          Workout
        </button>
      </div>

      {mode === "meal" && (
        <div className="grid grid-cols-4 gap-1.5 px-3 pb-2">
          {slots.map((s) => (
            <button
              key={s.value}
              onClick={() => setSlot(s.value)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition ${
                slot === s.value
                  ? "bg-rose-100 ring-2 ring-rose-400"
                  : "bg-stone-50 hover:bg-stone-100"
              }`}
            >
              <span className="text-base">{s.emoji}</span>
              <span
                className={`text-[10px] font-semibold ${
                  slot === s.value ? "text-rose-700" : "text-stone-600"
                }`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="p-3 pt-1">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
          }}
          placeholder={
            mode === "meal"
              ? "Tell me what you ate ✨\ne.g. 2 chapatis, dal, salad, 1 banana"
              : "Tell me how you moved 💪\ne.g. 30 min brisk walk, 20 min yoga"
          }
          rows={3}
          className="w-full resize-none rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:bg-white"
        />

        {error && (
          <div className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r ${accent} px-4 py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Reading your mind...
            </>
          ) : success ? (
            <>✨ Logged!</>
          ) : (
            <>
              <Sparkles size={18} /> Log {mode === "meal" ? "meal" : "workout"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
