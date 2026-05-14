"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2 } from "lucide-react";
import { updateMeal } from "@/lib/store";
import { useCurrentUser } from "@/lib/auth";
import { MealEntry, MealSlot, FoodItem } from "@/lib/types";

const slots: { value: MealSlot; label: string; emoji: string }[] = [
  { value: "breakfast", label: "Breakfast", emoji: "🌅" },
  { value: "lunch", label: "Lunch", emoji: "🍱" },
  { value: "dinner", label: "Dinner", emoji: "🌙" },
  { value: "snack", label: "Snack", emoji: "🥨" },
];

export function EditMealModal({
  meal,
  onClose,
}: {
  meal: MealEntry;
  onClose: () => void;
}) {
  const { id: uid } = useCurrentUser();
  const [slot, setSlot] = useState<MealSlot>(meal.slot);
  const [rawInput, setRawInput] = useState(meal.rawInput);
  const [kcal, setKcal] = useState(meal.totalKcal);
  const [protein, setProtein] = useState(meal.totalProtein);
  const [carbs, setCarbs] = useState(meal.totalCarbs);
  const [fat, setFat] = useState(meal.totalFat);
  const [fiber, setFiber] = useState(meal.totalFiber);
  const [items, setItems] = useState<FoodItem[]>(meal.items);
  const [saving, setSaving] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleReparse() {
    setReparsing(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput: rawInput.trim() }),
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
      setItems(data.items);
      setKcal(Math.round(totals.kcal));
      setProtein(Math.round(totals.protein * 10) / 10);
      setCarbs(Math.round(totals.carbs * 10) / 10);
      setFat(Math.round(totals.fat * 10) / 10);
      setFiber(Math.round(totals.fiber * 10) / 10);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-parse failed");
    } finally {
      setReparsing(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateMeal(uid, meal.id, {
        slot,
        rawInput,
        items,
        totalKcal: kcal,
        totalProtein: protein,
        totalCarbs: carbs,
        totalFat: fat,
        totalFiber: fiber,
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
          <h2 className="text-base font-bold text-stone-900">Edit meal</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-5 space-y-4">
          {/* Slot */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Slot
            </label>
            <div className="grid grid-cols-4 gap-1.5">
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
          </div>

          {/* Raw text + reparse */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              What you ate
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-2xl border-2 border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:bg-white"
            />
            <button
              onClick={handleReparse}
              disabled={reparsing || !rawInput.trim()}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-40"
            >
              {reparsing ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Re-parsing…
                </>
              ) : (
                <>
                  <Sparkles size={12} /> Re-parse with AI
                </>
              )}
            </button>
          </div>

          {/* Macros — directly editable */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
              Totals (edit if you disagree with the AI)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Calories" value={kcal} onChange={setKcal} unit="kcal" />
              <NumField label="Protein" value={protein} onChange={setProtein} unit="g" step={0.1} />
              <NumField label="Carbs" value={carbs} onChange={setCarbs} unit="g" step={0.1} />
              <NumField label="Fat" value={fat} onChange={setFat} unit="g" step={0.1} />
              <NumField label="Fiber" value={fiber} onChange={setFiber} unit="g" step={0.1} />
            </div>
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
            className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/30 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NumField({
  label,
  value,
  onChange,
  unit,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {label} ({unit})
      </span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-xl border-2 border-stone-200 bg-stone-50 px-3 py-2 text-sm font-semibold text-stone-900 outline-none focus:border-stone-900 focus:bg-white"
      />
    </label>
  );
}
