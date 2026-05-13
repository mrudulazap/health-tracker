"use client";

import { useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from "firebase/firestore";
import { Delete, ArrowLeft } from "lucide-react";
import { auth, db, firebaseReady } from "@/lib/firebase";
import {
  CurrentUser,
  HARDCODED_USERS,
  RESERVED_PINS,
  SESSION_USER_KEY,
  LEGACY_UNLOCK_KEY,
  UserProvider,
} from "@/lib/auth";

const ATTEMPTS_KEY = "ht_pin_attempts";
const LOCKOUT_KEY = "ht_pin_lockout_until";
const MIGRATION_KEY = "ht_migrated_owner_to_mk";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

type Screen = "pin" | "create-name" | "create-pin";

function readNum(key: string): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(key);
  return v ? Number(v) : 0;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "user"
  );
}

async function lookupPin(pin: string): Promise<CurrentUser | null> {
  if (HARDCODED_USERS[pin]) return HARDCODED_USERS[pin];
  try {
    const snap = await getDoc(doc(db, "pins", pin));
    if (!snap.exists()) return null;
    const data = snap.data();
    return { id: data.userId, name: data.name };
  } catch {
    return null;
  }
}

async function pinExists(pin: string): Promise<boolean> {
  if (RESERVED_PINS.has(pin)) return true;
  if (HARDCODED_USERS[pin]) return true;
  const snap = await getDoc(doc(db, "pins", pin));
  return snap.exists();
}

async function userIdExists(userId: string): Promise<boolean> {
  if (userId === "mk" || userId === "owner") return true;
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists();
}

async function migrateOwnerToMk() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_KEY) === "yes") return;

  try {
    // Check if mk already has data
    const mkMealsSnap = await getDocs(collection(db, "users", "mk", "meals"));
    if (!mkMealsSnap.empty) {
      localStorage.setItem(MIGRATION_KEY, "yes");
      return;
    }
    // Check if owner has data
    const ownerSettingsSnap = await getDoc(doc(db, "users", "owner"));
    const ownerMealsSnap = await getDocs(collection(db, "users", "owner", "meals"));
    const ownerWorkoutsSnap = await getDocs(collection(db, "users", "owner", "workouts"));
    const ownerCycleSnap = await getDocs(collection(db, "users", "owner", "cycle"));

    const hasAnyData =
      ownerSettingsSnap.exists() ||
      !ownerMealsSnap.empty ||
      !ownerWorkoutsSnap.empty ||
      !ownerCycleSnap.empty;
    if (!hasAnyData) {
      localStorage.setItem(MIGRATION_KEY, "yes");
      return;
    }

    const batch = writeBatch(db);
    if (ownerSettingsSnap.exists()) {
      batch.set(doc(db, "users", "mk"), ownerSettingsSnap.data());
    }
    ownerMealsSnap.docs.forEach((d) => {
      batch.set(doc(db, "users", "mk", "meals", d.id), d.data());
    });
    ownerWorkoutsSnap.docs.forEach((d) => {
      batch.set(doc(db, "users", "mk", "workouts", d.id), d.data());
    });
    ownerCycleSnap.docs.forEach((d) => {
      batch.set(doc(db, "users", "mk", "cycle", d.id), d.data());
    });
    await batch.commit();
    localStorage.setItem(MIGRATION_KEY, "yes");
  } catch (e) {
    console.error("Migration failed:", e);
  }
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [screen, setScreen] = useState<Screen>("pin");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  // create-account state
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  // Firebase auth
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Rate-limit
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Restore session from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Clean up legacy single-user flag
    if (localStorage.getItem(LEGACY_UNLOCK_KEY)) {
      localStorage.removeItem(LEGACY_UNLOCK_KEY);
    }
    const stored = localStorage.getItem(SESSION_USER_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored) as CurrentUser;
        if (u && u.id && u.name) setCurrentUser(u);
      } catch {
        // ignore bad data
      }
    }
    setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - readNum(ATTEMPTS_KEY)));
    setLockedUntil(readNum(LOCKOUT_KEY));
  }, []);

  // Lockout tick
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Anonymous Firebase auth (silent)
  useEffect(() => {
    if (!firebaseReady) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setFbUser(u);
      else signInAnonymously(auth).catch((e) => setAuthError(e.message));
    });
    return () => unsub();
  }, []);

  const isLocked = lockedUntil > now;

  function flashError(msg: string) {
    setError(msg);
    setPulse(true);
    setTimeout(() => {
      setPin("");
      setPulse(false);
    }, 800);
    setTimeout(() => setError(null), 2500);
  }

  function recordWrongAttempt() {
    const used = readNum(ATTEMPTS_KEY) + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(used));
    const remaining = Math.max(0, MAX_ATTEMPTS - used);
    setAttemptsLeft(remaining);
    if (remaining === 0) {
      const until = Date.now() + LOCKOUT_MS;
      localStorage.setItem(LOCKOUT_KEY, String(until));
      setLockedUntil(until);
    }
  }

  function resetAttempts() {
    localStorage.setItem(ATTEMPTS_KEY, "0");
    localStorage.setItem(LOCKOUT_KEY, "0");
    setAttemptsLeft(MAX_ATTEMPTS);
    setLockedUntil(0);
  }

  function authenticateAs(user: CurrentUser) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
    resetAttempts();
    setCurrentUser(user);
    setError(null);
    setPin("");
    setNewName("");
    setNewPin("");
    setScreen("pin");
    // Background migration for mk
    if (user.id === "mk" && fbUser) {
      migrateOwnerToMk();
    }
  }

  // Handle PIN entry
  useEffect(() => {
    if (pin.length !== 4 || isLocked || !fbUser || screen !== "pin") return;
    (async () => {
      if (pin === "0000") {
        setScreen("create-name");
        setPin("");
        return;
      }
      const user = await lookupPin(pin);
      if (user) {
        authenticateAs(user);
      } else {
        recordWrongAttempt();
        flashError("Wrong PIN");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, isLocked, fbUser, screen]);

  // Handle new PIN entry during create-pin
  useEffect(() => {
    if (newPin.length !== 4 || screen !== "create-pin" || busy) return;
    (async () => {
      setBusy(true);
      try {
        if (RESERVED_PINS.has(newPin)) {
          setError("That PIN is reserved. Pick another.");
          setNewPin("");
          setBusy(false);
          return;
        }
        if (await pinExists(newPin)) {
          setError("That PIN is taken. Pick another.");
          setNewPin("");
          setBusy(false);
          return;
        }

        // Generate unique userId
        let userId = slugify(newName);
        let suffix = 0;
        while (await userIdExists(userId)) {
          suffix++;
          userId = `${slugify(newName)}-${suffix}`;
          if (suffix > 20) {
            userId = `${slugify(newName)}-${Math.random().toString(36).slice(2, 6)}`;
            break;
          }
        }

        await setDoc(doc(db, "pins", newPin), {
          userId,
          name: newName,
          createdAt: Date.now(),
        });
        await setDoc(doc(db, "users", userId), {
          displayName: newName,
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
        });

        authenticateAs({ id: userId, name: newName });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create user");
        setNewPin("");
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPin, screen, busy, newName]);

  if (!firebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <div className="max-w-sm">
          <h1 className="mb-2 text-xl font-semibold">Setup needed</h1>
          <p className="text-sm text-stone-600">
            Add Firebase config to <code className="rounded bg-stone-100 px-1">.env.local</code> and restart.
          </p>
        </div>
      </div>
    );
  }

  // Authenticated — render children
  if (currentUser) {
    return <UserProvider user={currentUser}>{children}</UserProvider>;
  }

  // Waiting on Firebase anonymous auth before allowing PIN entry
  if (!fbUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="text-sm text-red-500">Connection error: {authError}</p>
      </div>
    );
  }

  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-3 inline-block text-6xl animate-bounce-slow">🥗</div>
          <h1 className="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            Mealtrackology
          </h1>
          <p className="mt-1 text-xs font-medium uppercase tracking-widest text-stone-500">
            {screen === "pin" && "Enter your PIN"}
            {screen === "create-name" && "What should I call you?"}
            {screen === "create-pin" && "Pick a PIN"}
          </p>
        </div>

        <div className="rounded-3xl border-2 border-stone-900/10 bg-white p-6 shadow-[0_12px_0_-3px_rgba(0,0,0,0.08)]">
          {isLocked && screen === "pin" ? (
            <div className="py-8 text-center">
              <div className="mb-3 text-4xl">🔒</div>
              <p className="mb-1 text-sm font-bold text-stone-900">Too many wrong attempts</p>
              <p className="mb-4 text-xs text-stone-500">Try again in</p>
              <div className="text-3xl font-extrabold tabular-nums text-rose-600">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
            </div>
          ) : screen === "pin" ? (
            <PinPad
              pin={pin}
              setPin={setPin}
              pulse={pulse}
              error={error}
              attemptsLeft={attemptsLeft}
              footer={
                <p className="mt-4 text-center text-[11px] text-stone-400">
                  Enter <span className="font-mono font-bold">0000</span> to create a new account
                </p>
              }
            />
          ) : screen === "create-name" ? (
            <NameInput
              value={newName}
              onChange={setNewName}
              onBack={() => {
                setScreen("pin");
                setNewName("");
                setError(null);
              }}
              onNext={() => {
                if (!newName.trim()) {
                  setError("Name can't be empty");
                  return;
                }
                setError(null);
                setScreen("create-pin");
              }}
              error={error}
            />
          ) : (
            <PinPad
              pin={newPin}
              setPin={setNewPin}
              pulse={false}
              error={error}
              attemptsLeft={null}
              header={
                <button
                  onClick={() => {
                    setScreen("create-name");
                    setNewPin("");
                    setError(null);
                  }}
                  className="mb-3 flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              }
              footer={
                <p className="mt-3 text-center text-[11px] text-stone-400">
                  Hi <span className="font-semibold text-stone-700">{newName}</span> — pick a 4-digit PIN you&apos;ll remember
                  {busy && <span className="ml-1">⏳</span>}
                </p>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PinPad({
  pin,
  setPin,
  pulse,
  error,
  attemptsLeft,
  header,
  footer,
}: {
  pin: string;
  setPin: (v: string) => void;
  pulse: boolean;
  error: string | null;
  attemptsLeft: number | null;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <>
      {header}
      <div className="mb-5 flex justify-center gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-3 w-3 rounded-full transition-all duration-200 ${
              pulse
                ? "scale-125 bg-red-500"
                : pin.length > i
                  ? "scale-110 bg-stone-900"
                  : "bg-stone-200"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) => (
          <button
            key={i}
            onClick={() => {
              if (k === "") return;
              if (k === "del") setPin(pin.slice(0, -1));
              else if (pin.length < 4) setPin(pin + k);
            }}
            disabled={k === ""}
            className={`flex h-14 items-center justify-center rounded-2xl text-xl font-bold transition active:scale-95 ${
              k === ""
                ? "invisible"
                : k === "del"
                  ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  : "bg-gradient-to-br from-stone-50 to-stone-100 text-stone-900 hover:from-stone-100 hover:to-stone-200"
            }`}
          >
            {k === "del" ? <Delete size={20} /> : k}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 text-center text-xs font-bold text-red-500">
          ❌ {error}
          {attemptsLeft !== null && (
            <> — {attemptsLeft} {attemptsLeft === 1 ? "try" : "tries"} left</>
          )}
        </p>
      )}

      {footer}
    </>
  );
}

function NameInput({
  value,
  onChange,
  onBack,
  onNext,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
  error: string | null;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-900"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-stone-500">
        Your name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onNext();
        }}
        autoFocus
        placeholder="e.g. Alice"
        className="w-full rounded-2xl border-2 border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-900 focus:bg-white"
      />

      {error && <p className="mt-2 text-xs font-bold text-red-500">❌ {error}</p>}

      <button
        onClick={onNext}
        disabled={!value.trim()}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}
