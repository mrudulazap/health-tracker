"use client";

import { useState } from "react";
import { Trash2, Flame, Activity, Pencil } from "lucide-react";
import { deleteMeal, deleteWorkout, summarize, useMeals, useWorkouts, useSettings } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { MealEntry, MealSlot, WorkoutEntry } from "@/lib/types";
import { EditMealModal } from "./EditMealModal";
import { EditWorkoutModal } from "./EditWorkoutModal";

const slotLabels: Record<MealSlot, { label: string; emoji: string }> = {
  breakfast: { label: "Breakfast", emoji: "🌅" },
  lunch: { label: "Lunch", emoji: "🍱" },
  dinner: { label: "Dinner", emoji: "🌙" },
  snack: { label: "Snack", emoji: "🥨" },
};

export function DaySummary({ date }: { date: string }) {
  const { id: uid } = useCurrentUser();
  const { meals } = useMeals(date);
  const { workouts } = useWorkouts(date);
  const { settings } = useSettings();
  const summary = summarize(meals, workouts, date);
  const target = settings?.dailyKcalTarget ?? 2000;
  const proteinTarget = settings?.dailyProteinTargetG ?? 80;

  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutEntry | null>(null);

  const ringPct = Math.min(100, Math.round((summary.kcalIn / target) * 100));
  const remaining = Math.max(0, target - summary.net);
  const over = summary.net > target;

  const radius = 70;
  const stroke = 14;
  const c = 2 * Math.PI * radius;
  const dashOffset = c - (Math.min(summary.kcalIn, target) / target) * c;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border-2 border-stone-900/10 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 p-6 shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg width={radius * 2 + stroke} height={radius * 2 + stroke} className="-rotate-90">
              <circle
                cx={radius + stroke / 2}
                cy={radius + stroke / 2}
                r={radius}
                stroke="#fde2d1"
                strokeWidth={stroke}
                fill="none"
              />
              <circle
                cx={radius + stroke / 2}
                cy={radius + stroke / 2}
                r={radius}
                stroke={over ? "#dc2626" : "url(#calGrad)"}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={c}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <defs>
                <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-extrabold text-stone-900">{summary.kcalIn}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                / {target} kcal
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 backdrop-blur">
              <Flame size={16} className="text-rose-500" />
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Eaten
                </div>
                <div className="text-base font-bold text-rose-600">{summary.kcalIn} kcal</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 backdrop-blur">
              <Activity size={16} className="text-emerald-500" />
              <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Burned
                </div>
                <div className="text-base font-bold text-emerald-600">{summary.kcalOut} kcal</div>
              </div>
            </div>
            <div className="rounded-xl bg-stone-900 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                {over ? "Over by" : "Remaining"}
              </div>
              <div className="text-base font-bold text-white">
                {over ? summary.net - target : remaining} kcal
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          <Macro label="Protein" value={summary.proteinG} unit="g" target={proteinTarget} color="bg-purple-500" />
          <Macro label="Carbs" value={summary.carbsG} unit="g" color="bg-amber-500" />
          <Macro label="Fat" value={summary.fatG} unit="g" color="bg-rose-500" />
          <Macro label="Fiber" value={summary.fiberG} unit="g" color="bg-emerald-500" />
        </div>
      </div>

      {meals.length > 0 && (
        <Section title="Meals" emoji="🍴">
          {meals
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((m) => {
              const slot = slotLabels[m.slot];
              return (
                <Row
                  key={m.id}
                  emoji={slot.emoji}
                  title={slot.label}
                  subtitle={m.items.map((i) => `${i.quantity} ${i.name}`).join(", ")}
                  trailing={`${m.totalKcal}`}
                  trailingUnit="kcal"
                  trailingColor="text-rose-600"
                  onEdit={() => setEditingMeal(m)}
                  onDelete={() => deleteMeal(uid, m.id)}
                />
              );
            })}
        </Section>
      )}

      {workouts.length > 0 && (
        <Section title="Workouts" emoji="💪">
          {workouts
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((w) => (
              <Row
                key={w.id}
                emoji={workoutEmoji(w.kind)}
                title={w.description}
                subtitle={`${w.durationMin} min`}
                trailing={`-${w.kcalBurned}`}
                trailingUnit="kcal"
                trailingColor="text-emerald-600"
                onEdit={() => setEditingWorkout(w)}
                onDelete={() => deleteWorkout(uid, w.id)}
              />
            ))}
        </Section>
      )}

      {meals.length === 0 && workouts.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-stone-300 bg-white/50 p-10 text-center">
          <div className="mb-2 text-4xl">📝</div>
          <p className="text-sm font-medium text-stone-600">Nothing logged yet for this day</p>
          <p className="mt-1 text-xs text-stone-400">
            Type a meal or workout above to get started
          </p>
        </div>
      )}

      {editingMeal && (
        <EditMealModal meal={editingMeal} onClose={() => setEditingMeal(null)} />
      )}
      {editingWorkout && (
        <EditWorkoutModal workout={editingWorkout} onClose={() => setEditingWorkout(null)} />
      )}
    </div>
  );
}

function workoutEmoji(kind: string): string {
  switch (kind) {
    case "walking":
      return "🚶‍♀️";
    case "running":
      return "🏃‍♀️";
    case "cycling":
      return "🚴‍♀️";
    case "yoga":
      return "🧘‍♀️";
    case "strength":
      return "🏋️‍♀️";
    case "hiit":
      return "🔥";
    default:
      return "💪";
  }
}

function Macro({
  label,
  value,
  unit,
  target,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  target?: number;
  color: string;
}) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="rounded-xl bg-white/80 p-2 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-stone-500">{label}</div>
      <div className="text-sm font-bold text-stone-900">
        {Math.round(value * 10) / 10}
        <span className="text-[10px] font-medium text-stone-500">{unit}</span>
      </div>
      {target && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-stone-200">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-stone-900/10 bg-white shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 border-b border-stone-100 px-4 py-3">
        <span className="text-lg">{emoji}</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">{title}</h3>
      </div>
      <div className="divide-y divide-stone-100">{children}</div>
    </div>
  );
}

function Row({
  emoji,
  title,
  subtitle,
  trailing,
  trailingUnit,
  trailingColor,
  onEdit,
  onDelete,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  trailing: string;
  trailingUnit: string;
  trailingColor: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-xl">
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-stone-900">{title}</div>
        <div className="truncate text-xs text-stone-500">{subtitle}</div>
      </div>
      <div className="text-right">
        <div className={`text-base font-bold ${trailingColor}`}>{trailing}</div>
        <div className="text-[10px] font-medium text-stone-400">{trailingUnit}</div>
      </div>
      <div className="flex flex-col gap-1 sm:flex-row">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          aria-label="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
