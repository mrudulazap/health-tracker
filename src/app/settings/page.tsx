"use client";

import { useEffect, useState } from "react";
import { Save, Lock } from "lucide-react";
import { saveSettings, useSettings } from "@/lib/store";
import { useViewingUser, SESSION_USER_KEY } from "@/lib/auth";
import { UserSettings } from "@/lib/types";
import { UserSwitcher, ReadOnlyBanner } from "@/components/UserSwitcher";

const defaultSettings: UserSettings = {
  displayName: "Mrudula",
  weightKg: 60,
  heightCm: 165,
  age: 28,
  sex: "female",
  activityLevel: "moderate",
  goal: "maintain",
  dailyKcalTarget: 2000,
  dailyProteinTargetG: 80,
  avgCycleLengthDays: 28,
  avgPeriodLengthDays: 5,
};

export default function SettingsPage() {
  const { viewing, isReadOnly } = useViewingUser();
  const uid = viewing.id;
  const userName = viewing.name;
  const { settings, loading } = useSettings();
  const [draft, setDraft] = useState<UserSettings>({ ...defaultSettings, displayName: userName });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft({ ...defaultSettings, ...settings });
    }
  }, [settings, loading]);

  async function handleSave() {
    const bmr = calculateBMR(draft);
    const tdee = bmr * activityMultiplier(draft.activityLevel);
    const target =
      draft.goal === "cut" ? tdee - 500 : draft.goal === "bulk" ? tdee + 300 : tdee;

    const final: UserSettings = {
      ...draft,
      dailyKcalTarget: Math.round(target),
      dailyProteinTargetG: Math.round(draft.weightKg * 1.6),
    };
    setDraft(final);
    await saveSettings(uid, final);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLock() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_USER_KEY);
      localStorage.removeItem("ht_unlocked");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
            Settings <span className="inline-block">⚙️</span>
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500">
            {isReadOnly ? `${userName}'s profile (read-only)` : "Profile & goals"}
          </p>
        </div>
        <UserSwitcher />
      </header>

      <ReadOnlyBanner />

      <Section title="Profile">
        <Field label="Display name">
          <Input
            value={draft.displayName}
            onChange={(v) => setDraft({ ...draft, displayName: v })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Weight (kg)">
            <Input
              type="number"
              value={String(draft.weightKg)}
              onChange={(v) => setDraft({ ...draft, weightKg: Number(v) || 0 })}
            />
          </Field>
          <Field label="Height (cm)">
            <Input
              type="number"
              value={String(draft.heightCm)}
              onChange={(v) => setDraft({ ...draft, heightCm: Number(v) || 0 })}
            />
          </Field>
          <Field label="Age">
            <Input
              type="number"
              value={String(draft.age)}
              onChange={(v) => setDraft({ ...draft, age: Number(v) || 0 })}
            />
          </Field>
        </div>
        <Field label="Sex">
          <Select
            value={draft.sex}
            onChange={(v) => setDraft({ ...draft, sex: v as UserSettings["sex"] })}
            options={[
              { value: "female", label: "Female" },
              { value: "male", label: "Male" },
              { value: "other", label: "Other" },
            ]}
          />
        </Field>
      </Section>

      <Section title="Activity & Goals">
        <Field label="Activity level">
          <Select
            value={draft.activityLevel}
            onChange={(v) => setDraft({ ...draft, activityLevel: v as UserSettings["activityLevel"] })}
            options={[
              { value: "sedentary", label: "Sedentary (desk job)" },
              { value: "light", label: "Light (1-3 workouts/week)" },
              { value: "moderate", label: "Moderate (3-5 workouts/week)" },
              { value: "very-active", label: "Very active (6-7 workouts/week)" },
            ]}
          />
        </Field>
        <Field label="Goal">
          <Select
            value={draft.goal}
            onChange={(v) => setDraft({ ...draft, goal: v as UserSettings["goal"] })}
            options={[
              { value: "cut", label: "Lose weight (cut)" },
              { value: "maintain", label: "Maintain" },
              { value: "bulk", label: "Gain weight (bulk)" },
            ]}
          />
        </Field>
        <Field label="Daily calorie target (auto-calculated, override here)">
          <Input
            type="number"
            value={String(draft.dailyKcalTarget)}
            onChange={(v) => setDraft({ ...draft, dailyKcalTarget: Number(v) || 0 })}
          />
        </Field>
      </Section>

      <Section title="Cycle">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Avg cycle length (days)">
            <Input
              type="number"
              value={String(draft.avgCycleLengthDays)}
              onChange={(v) => setDraft({ ...draft, avgCycleLengthDays: Number(v) || 28 })}
            />
          </Field>
          <Field label="Avg period length (days)">
            <Input
              type="number"
              value={String(draft.avgPeriodLengthDays)}
              onChange={(v) => setDraft({ ...draft, avgPeriodLengthDays: Number(v) || 5 })}
            />
          </Field>
        </div>
      </Section>

      <button
        onClick={handleSave}
        disabled={isReadOnly}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save size={16} />
        {isReadOnly ? "View-only mode" : saved ? "✨ Saved!" : "Save settings"}
      </button>

      <button
        onClick={handleLock}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-stone-900/10 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
      >
        <Lock size={16} />
        Lock app
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-stone-900/10 bg-white p-5 shadow-[0_8px_0_-2px_rgba(0,0,0,0.08)] space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-300"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// Mifflin-St Jeor BMR
function calculateBMR(s: UserSettings): number {
  const base = 10 * s.weightKg + 6.25 * s.heightCm - 5 * s.age;
  return s.sex === "male" ? base + 5 : base - 161;
}

function activityMultiplier(level: UserSettings["activityLevel"]): number {
  switch (level) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "very-active":
      return 1.725;
  }
}
