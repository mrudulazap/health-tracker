"use client";

import { useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { Delete } from "lucide-react";
import { auth, firebaseReady } from "@/lib/firebase";

const PIN = "1106";
const UNLOCK_KEY = "ht_unlocked";
const ATTEMPTS_KEY = "ht_pin_attempts";
const LOCKOUT_KEY = "ht_pin_lockout_until";
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

function readNum(key: string): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(key);
  return v ? Number(v) : 0;
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setUnlocked(typeof window !== "undefined" && localStorage.getItem(UNLOCK_KEY) === "yes");
    const usedAttempts = readNum(ATTEMPTS_KEY);
    setAttemptsLeft(Math.max(0, MAX_ATTEMPTS - usedAttempts));
    setLockedUntil(readNum(LOCKOUT_KEY));
  }, []);

  // Tick every second while locked, to update countdown UI
  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth).catch((e) => setAuthError(e.message));
    });
    return () => unsub();
  }, []);

  const isLocked = lockedUntil > now;

  useEffect(() => {
    if (pin.length !== 4 || isLocked) return;

    if (pin === PIN) {
      localStorage.setItem(UNLOCK_KEY, "yes");
      localStorage.setItem(ATTEMPTS_KEY, "0");
      localStorage.setItem(LOCKOUT_KEY, "0");
      setUnlocked(true);
      setError(false);
      return;
    }

    // Wrong PIN
    const usedAttempts = readNum(ATTEMPTS_KEY) + 1;
    localStorage.setItem(ATTEMPTS_KEY, String(usedAttempts));
    const remaining = Math.max(0, MAX_ATTEMPTS - usedAttempts);
    setAttemptsLeft(remaining);
    setError(true);

    if (remaining === 0) {
      const lockUntil = Date.now() + LOCKOUT_MS;
      localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
      setLockedUntil(lockUntil);
    }

    setTimeout(() => {
      setPin("");
      setError(false);
    }, 800);
  }, [pin, isLocked]);

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

  if (!unlocked) {
    const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="mb-3 inline-block text-6xl animate-bounce-slow">🥗</div>
            <h1 className="bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
              Health Tracker
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-stone-500">
              Mrudula&apos;s personal lab
            </p>
          </div>

          <div className="rounded-3xl border-2 border-stone-900/10 bg-white p-6 shadow-[0_12px_0_-3px_rgba(0,0,0,0.08)]">
            {isLocked ? (
              <div className="py-8 text-center">
                <div className="mb-3 text-4xl">🔒</div>
                <p className="mb-1 text-sm font-bold text-stone-900">Too many wrong attempts</p>
                <p className="mb-4 text-xs text-stone-500">Try again in</p>
                <div className="text-3xl font-extrabold tabular-nums text-rose-600">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </div>
              </div>
            ) : (
              <>
                <p className="mb-4 text-center text-sm font-semibold text-stone-700">
                  Enter your PIN
                </p>

                <div className="mb-5 flex justify-center gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-full transition-all duration-200 ${
                        error
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
                        if (k === "del") setPin((p) => p.slice(0, -1));
                        else if (pin.length < 4) setPin((p) => p + k);
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
                    ❌ Wrong PIN — {attemptsLeft} {attemptsLeft === 1 ? "try" : "tries"} left
                  </p>
                )}
              </>
            )}
          </div>
        </div>
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

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
