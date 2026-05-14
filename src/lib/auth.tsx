"use client";

import { createContext, useContext, useState } from "react";

export interface CurrentUser {
  id: string;
  name: string;
  isAdmin?: boolean;
}

const UserContext = createContext<CurrentUser | null>(null);

interface ViewingState {
  viewing: CurrentUser;
  setViewing: (u: CurrentUser) => void;
  isReadOnly: boolean;
  knownUsers: CurrentUser[];
}

const ViewingContext = createContext<ViewingState | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const [viewing, setViewing] = useState<CurrentUser>(user);

  // Admins can see all hardcoded users; non-admins can only see themselves
  const knownUsers = user.isAdmin ? Object.values(HARDCODED_USERS) : [user];

  return (
    <UserContext.Provider value={user}>
      <ViewingContext.Provider
        value={{
          viewing,
          setViewing,
          isReadOnly: viewing.id !== user.id,
          knownUsers,
        }}
      >
        {children}
      </ViewingContext.Provider>
    </UserContext.Provider>
  );
}

/** The user who actually authenticated via PIN. Stable for the session. */
export function useCurrentUser(): CurrentUser {
  const u = useContext(UserContext);
  if (!u) throw new Error("useCurrentUser must be called inside a UserProvider");
  return u;
}

/** The user whose data is being displayed. May differ from currentUser for admins. */
export function useViewingUser(): ViewingState {
  const v = useContext(ViewingContext);
  if (!v) throw new Error("useViewingUser must be called inside a UserProvider");
  return v;
}

// Reserved PINs that can't be claimed by new users
export const RESERVED_PINS = new Set(["1106", "0000", "2308", "1709"]);

// Hardcoded PIN → user mapping. Other PINs get looked up in /pins/{pin}
export const HARDCODED_USERS: Record<string, CurrentUser> = {
  "1106": { id: "mk", name: "Mrudula", isAdmin: true },
  "2308": { id: "himaja", name: "Himaja" },
  "1709": { id: "durgesh", name: "Durgesh" },
};

// localStorage keys
export const SESSION_USER_KEY = "ht_user";
export const LEGACY_UNLOCK_KEY = "ht_unlocked";
