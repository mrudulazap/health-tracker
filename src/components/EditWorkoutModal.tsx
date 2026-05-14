"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { updateWorkout, useSettings } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { kcalBurned } from "@/lib/met";
import { WorkoutEntry, WorkoutKind } from "@/lib/types";

const kinds: { value: WorkoutKind; label: string; emoji: string }[] = [
  { value: "walking", label: "Walk", emoji: "🚶‍♀️" },
  { value: "running", label: "Run", emoji: "🏃‍♀️" },
  { value: "cycling", label: "Cycle", emoji: "🚴‍♀️" },
  { value: "yoga", label: "Yoga", emoji: "🧘‍♀️" },
  { value: "strength", label: "Strength", emoji: "🏋️‍♀️" },
  { value: "hiit", label: "HIIT", emoji: "🔥" },
  { value: "other", label: "Other", emoji: "💪" },
];

export function EditWorkoutModal({
  workout,
  onClose,
}: {
  workout: WorkoutEntry;
  onClose: () => void;
}) {
  const { id: uid } = useCurrentUser();
  const { settings } = useSettings();
  const weight = settings?.weightKg ?? 60;

  const [kind, setKind] = useState<WorkoutKind>(workout.kind);
  const [description, setDescription] = useState(workout.description);
  const [durationMin, setDurationMin] = useState(workout.durationMin);
  const [kcal, setKcal] = useState(workout.kcalBurned);
  const [kcalManuallySet, setKcalManuallySet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-recompute kcal when kind/duration changes — unless user manually overrode
  useEffect(() => {
    if (kcalManuallySet) return;
    setKcal(kcalBurned(kind, durationMin, weight));
  }, [kind, durationMin, weight, kcalManuallySet]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateWorkout(uid, workout.id, {
        kind,
        description,
        durationMin,
        kcalBurned: kcal,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl border-2 border-stone-900/10 bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="text-base font-bold text-stone-900">Edit workout</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-4">
          {/* Kind */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Activity
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {kinds.map((k) => (
                <button
                  key={k.value}
                  onClick={() => setKind(k.value)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition ${
                    kind === k.value
                      ? "bg-emerald-100 ring-2 ring-emerald-400"
                      : "bg-stone-50 hover:bg-stone-100"
                  }`}
                >
                  <span className="text-base">{k.emoji}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      kind === k.value ? "text-emerald-700" : "text-stone-600"
                    }`}
                  >
                    {k.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 0)}
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
            />
          </div>

          {/* Kcal */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Calories burned
              {!kcalManuallySet && (
                <span className="ml-1 font-normal normal-case tracking-normal text-stone-400">
                  (auto-calculated)
                </span>
              )}
            </label>
            <input
              type="number"
              min={0}
              value={kcal}
              onChange={(e) => {
                setKcal(Number(e.target.value) || 0);
                setKcalManuallySet(true);
              }}
              className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
            />
            {kcalManuallySet && (
              <button
                onClick={() => {
                  setKcalManuallySet(false);
                  setKcal(kcalBurned(kind, durationMin, weight));
                }}
                className="mt-1 text-xs font-semibold text-stone-500 underline hover:text-stone-900"
              >
                Reset to auto-calculated
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-stone-100 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border-2 border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
