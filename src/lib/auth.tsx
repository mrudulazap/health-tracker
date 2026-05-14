"use client";

import { createContext, useContext } from "react";

export interface CurrentUser {
  id: string;
  name: string;
}

const UserContext = createContext<CurrentUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useCurrentUser(): CurrentUser {
  const u = useContext(UserContext);
  if (!u) throw new Error("useCurrentUser must be called inside a UserProvider");
  return u;
}

// Reserved PINs that can't be claimed by new users
export const RESERVED_PINS = new Set(["1106", "0000", "2308", "1709"]);

// Hardcoded PIN → user mapping. Other PINs get looked up in /pins/{pin}
export const HARDCODED_USERS: Record<string, CurrentUser> = {
  "1106": { id: "mk", name: "Mrudula" },
  "2308": { id: "himaja", name: "Himaja" },
  "1709": { id: "durgesh", name: "Durgesh" },
};

// localStorage keys
export const SESSION_USER_KEY = "ht_user";
export const LEGACY_UNLOCK_KEY = "ht_unlocked"; // old single-user flag — clean up if present
