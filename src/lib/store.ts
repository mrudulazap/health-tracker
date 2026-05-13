"use client";

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, OWNER_ID } from "./firebase";
import {
  MealEntry,
  WorkoutEntry,
  CycleEntry,
  UserSettings,
  DailySummary,
} from "./types";

const userDoc = () => doc(db, "users", OWNER_ID);
const mealsCol = () => collection(db, "users", OWNER_ID, "meals");
const workoutsCol = () => collection(db, "users", OWNER_ID, "workouts");
const cycleCol = () => collection(db, "users", OWNER_ID, "cycle");

function useAuthReady() {
  const [user] = useAuthState(auth);
  return !!user;
}

export function useMeals(date?: string) {
  const ready = useAuthReady();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = date
      ? query(mealsCol(), where("date", "==", date))
      : query(mealsCol(), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMeals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MealEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready, date]);

  return { meals, loading };
}

export function useWorkouts(date?: string) {
  const ready = useAuthReady();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = date
      ? query(workoutsCol(), where("date", "==", date))
      : query(workoutsCol(), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setWorkouts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready, date]);

  return { workouts, loading };
}

export function useCycle() {
  const ready = useAuthReady();
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = query(cycleCol(), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CycleEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready]);

  return { entries, loading };
}

export function useSettings() {
  const ready = useAuthReady();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const unsub = onSnapshot(userDoc(), (snap) => {
      setSettings(snap.exists() ? (snap.data() as UserSettings) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [ready]);

  return { settings, loading };
}

export async function saveSettings(settings: UserSettings) {
  await setDoc(userDoc(), settings, { merge: true });
}

export async function addMeal(meal: Omit<MealEntry, "id">) {
  await addDoc(mealsCol(), { ...meal, createdAt: Date.now() });
}

export async function deleteMeal(id: string) {
  await deleteDoc(doc(db, "users", OWNER_ID, "meals", id));
}

export async function addWorkout(workout: Omit<WorkoutEntry, "id">) {
  await addDoc(workoutsCol(), { ...workout, createdAt: Date.now() });
}

export async function deleteWorkout(id: string) {
  await deleteDoc(doc(db, "users", OWNER_ID, "workouts", id));
}

export async function addCycleEntry(entry: Omit<CycleEntry, "id">) {
  await addDoc(cycleCol(), { ...entry, createdAt: Date.now() });
}

export async function deleteCycleEntry(id: string) {
  await deleteDoc(doc(db, "users", OWNER_ID, "cycle", id));
}

export function summarize(meals: MealEntry[], workouts: WorkoutEntry[], date: string): DailySummary {
  const dayMeals = meals.filter((m) => m.date === date);
  const dayWork = workouts.filter((w) => w.date === date);
  const kcalIn = dayMeals.reduce((s, m) => s + m.totalKcal, 0);
  const kcalOut = dayWork.reduce((s, w) => s + w.kcalBurned, 0);
  return {
    date,
    kcalIn,
    kcalOut,
    proteinG: dayMeals.reduce((s, m) => s + m.totalProtein, 0),
    carbsG: dayMeals.reduce((s, m) => s + m.totalCarbs, 0),
    fatG: dayMeals.reduce((s, m) => s + m.totalFat, 0),
    fiberG: dayMeals.reduce((s, m) => s + m.totalFiber, 0),
    net: kcalIn - kcalOut,
  };
}
