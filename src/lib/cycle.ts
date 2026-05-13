import { CycleEntry } from "./types";
import { addDays, differenceInDays } from "date-fns";

export interface CyclePrediction {
  lastPeriodStart: Date | null;
  cycleLength: number;
  periodLength: number;
  nextPeriodStart: Date | null;
  fertileWindowStart: Date | null;
  fertileWindowEnd: Date | null;
  ovulationDay: Date | null;
  currentDayOfCycle: number | null;
  isOnPeriod: boolean;
}

export function predictCycle(
  entries: CycleEntry[],
  avgCycleLength: number = 28,
  avgPeriodLength: number = 5,
): CyclePrediction {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const starts = sorted.filter((e) => e.isPeriodStart);

  if (starts.length === 0) {
    return {
      lastPeriodStart: null,
      cycleLength: avgCycleLength,
      periodLength: avgPeriodLength,
      nextPeriodStart: null,
      fertileWindowStart: null,
      fertileWindowEnd: null,
      ovulationDay: null,
      currentDayOfCycle: null,
      isOnPeriod: false,
    };
  }

  const lastStart = new Date(starts[starts.length - 1].date + "T00:00:00");

  let cycleLength = avgCycleLength;
  if (starts.length >= 2) {
    const diffs: number[] = [];
    for (let i = 1; i < starts.length; i++) {
      const prev = new Date(starts[i - 1].date + "T00:00:00");
      const curr = new Date(starts[i].date + "T00:00:00");
      diffs.push(differenceInDays(curr, prev));
    }
    cycleLength = Math.round(diffs.reduce((s, d) => s + d, 0) / diffs.length);
  }

  let periodLength = avgPeriodLength;
  const lastStartDateStr = starts[starts.length - 1].date;
  const lastEnd = sorted
    .filter((e) => e.isPeriodEnd && e.date >= lastStartDateStr)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (lastEnd) {
    const endDate = new Date(lastEnd.date + "T00:00:00");
    periodLength = Math.max(1, differenceInDays(endDate, lastStart) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLast = differenceInDays(today, lastStart);
  const currentDayOfCycle = daysSinceLast >= 0 ? (daysSinceLast % cycleLength) + 1 : null;
  const isOnPeriod = !lastEnd && daysSinceLast >= 0 && daysSinceLast < periodLength;

  const nextPeriodStart = addDays(lastStart, cycleLength);
  const ovulationDay = addDays(nextPeriodStart, -14);
  const fertileWindowStart = addDays(ovulationDay, -5);
  const fertileWindowEnd = addDays(ovulationDay, 1);

  return {
    lastPeriodStart: lastStart,
    cycleLength,
    periodLength,
    nextPeriodStart,
    fertileWindowStart,
    fertileWindowEnd,
    ovulationDay,
    currentDayOfCycle,
    isOnPeriod,
  };
}
