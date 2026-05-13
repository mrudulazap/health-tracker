import { WorkoutKind } from "./types";

const MET: Record<WorkoutKind, number> = {
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
  yoga: 3.0,
  strength: 5.0,
  hiit: 8.0,
  other: 4.5,
};

export const kcalBurned = (kind: WorkoutKind, durationMin: number, weightKg: number): number => {
  const met = MET[kind] ?? 4.5;
  return Math.round((met * 3.5 * weightKg * durationMin) / 200);
};
