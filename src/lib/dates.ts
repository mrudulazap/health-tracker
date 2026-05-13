import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, addDays, differenceInDays } from "date-fns";

export const todayKey = (d: Date = new Date()): string => format(startOfDay(d), "yyyy-MM-dd");

export const dateKey = (d: Date): string => format(d, "yyyy-MM-dd");

export const rangeKeys = (start: Date, days: number): string[] => {
  const out: string[] = [];
  for (let i = 0; i < days; i++) out.push(dateKey(addDays(start, i)));
  return out;
};

export const periodRanges = {
  daily: () => ({ start: startOfDay(new Date()), days: 1 }),
  weekly: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), days: 7 }),
  monthly: () => ({ start: startOfMonth(new Date()), days: differenceInDays(addDays(startOfMonth(new Date()), 31), startOfMonth(new Date())) }),
  yearly: () => ({ start: startOfYear(new Date()), days: 365 }),
};

export const prettyDate = (key: string): string => format(new Date(key), "EEE, MMM d");
