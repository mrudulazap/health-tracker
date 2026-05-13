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
import { auth, db } from "./firebase";
import { useCurrentUser } from "./auth";
import {
  MealEntry,
  WorkoutEntry,
  CycleEntry,
  UserSettings,
  DailySummary,
} from "./types";

const userDoc = (uid: string) => doc(db, "users", uid);
const mealsCol = (uid: string) => collection(db, "users", uid, "meals");
const workoutsCol = (uid: string) => collection(db, "users", uid, "workouts");
const cycleCol = (uid: string) => collection(db, "users", uid, "cycle");

function useFbAuthReady() {
  const [user] = useAuthState(auth);
  return !!user;
}

export function useMeals(date?: string) {
  const ready = useFbAuthReady();
  const { id: uid } = useCurrentUser();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = date
      ? query(mealsCol(uid), where("date", "==", date))
      : query(mealsCol(uid), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMeals(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MealEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready, date, uid]);

  return { meals, loading };
}

export function useWorkouts(date?: string) {
  const ready = useFbAuthReady();
  const { id: uid } = useCurrentUser();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = date
      ? query(workoutsCol(uid), where("date", "==", date))
      : query(workoutsCol(uid), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setWorkouts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WorkoutEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready, date, uid]);

  return { workouts, loading };
}

export function useCycle() {
  const ready = useFbAuthReady();
  const { id: uid } = useCurrentUser();
  const [entries, setEntries] = useState<CycleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const q = query(cycleCol(uid), orderBy("date", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CycleEntry, "id">) })));
      setLoading(false);
    });
    return () => unsub();
  }, [ready, uid]);

  return { entries, loading };
}

export function useSettings() {
  const ready = useFbAuthReady();
  const { id: uid } = useCurrentUser();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const unsub = onSnapshot(userDoc(uid), (snap) => {
      setSettings(snap.exists() ? (snap.data() as UserSettings) : null);
      setLoading(false);
    });
    return () => unsub();
  }, [ready, uid]);

  return { settings, loading };
}

export async function saveSettings(uid: string, settings: UserSettings) {
  await setDoc(userDoc(uid), settings, { merge: true });
}

export async function addMeal(uid: string, meal: Omit<MealEntry, "id">) {
  await addDoc(mealsCol(uid), { ...meal, createdAt: Date.now() });
}

export async function deleteMeal(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "meals", id));
}

export async function addWorkout(uid: string, workout: Omit<WorkoutEntry, "id">) {
  await addDoc(workoutsCol(uid), { ...workout, createdAt: Date.now() });
}

export async function deleteWorkout(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "workouts", id));
}

export async function addCycleEntry(uid: string, entry: Omit<CycleEntry, "id">) {
  await addDoc(cycleCol(uid), { ...entry, createdAt: Date.now() });
}

export async function deleteCycleEntry(uid: string, id: string) {
  await deleteDoc(doc(db, "users", uid, "cycle", id));
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
