export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  name: string;
  quantity: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealEntry {
  id: string;
  date: string;
  slot: MealSlot;
  rawInput: string;
  items: FoodItem[];
  totalKcal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  createdAt: number;
}

export type WorkoutKind = "walking" | "running" | "cycling" | "yoga" | "strength" | "hiit" | "other";

export interface WorkoutEntry {
  id: string;
  date: string;
  kind: WorkoutKind;
  description: string;
  durationMin: number;
  kcalBurned: number;
  createdAt: number;
}

export type CycleFlow = "spotting" | "light" | "medium" | "heavy";
export type CycleSymptom =
  | "cramps"
  | "headache"
  | "bloating"
  | "mood-swings"
  | "fatigue"
  | "acne"
  | "back-pain"
  | "tender-breasts";

export interface CycleEntry {
  id: string;
  date: string;
  isPeriodStart: boolean;
  isPeriodEnd: boolean;
  flow?: CycleFlow;
  symptoms: CycleSymptom[];
  notes?: string;
  createdAt: number;
}

export interface UserSettings {
  displayName: string;
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "female" | "male" | "other";
  activityLevel: "sedentary" | "light" | "moderate" | "very-active";
  goal: "cut" | "maintain" | "bulk";
  dailyKcalTarget: number;
  dailyProteinTargetG: number;
  avgCycleLengthDays: number;
  avgPeriodLengthDays: number;
  cyclePinHash?: string;
}

export interface DailySummary {
  date: string;
  kcalIn: number;
  kcalOut: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  net: number;
}
