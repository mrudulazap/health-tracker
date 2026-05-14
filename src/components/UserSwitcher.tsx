"use client";

import { useState } from "react";
import { ChevronDown, Eye, User, Check } from "lucide-react";
import { useCurrentUser, useViewingUser } from "@/lib/auth";

export function UserSwitcher() {
  const current = useCurrentUser();
  const { viewing, setViewing, isReadOnly, knownUsers } = useViewingUser();
  const [open, setOpen] = useState(false);

  if (!current.isAdmin) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
          isReadOnly
            ? "border-amber-400 bg-amber-50 text-amber-800"
            : "border-stone-900/10 bg-white text-stone-700 hover:bg-stone-50"
        }`}
      >
        {isReadOnly ? <Eye size={12} /> : <User size={12} />}
        <span>Viewing: {viewing.name}</span>
        <ChevronDown size={12} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-2xl border-2 border-stone-900/10 bg-white shadow-xl">
            <div className="border-b border-stone-100 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Admin · view as
              </div>
            </div>
            {knownUsers.map((u) => {
              const isSelected = u.id === viewing.id;
              const isSelf = u.id === current.id;
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    setViewing(u);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-sm transition hover:bg-stone-50 ${
                    isSelected ? "bg-stone-50 font-semibold" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{u.name}</span>
                    {isSelf && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                        you
                      </span>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="text-stone-900" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function ReadOnlyBanner() {
  const { viewing, isReadOnly, setViewing } = useViewingUser();
  const current = useCurrentUser();

  if (!isReadOnly) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <Eye size={16} className="text-amber-700" />
        <span className="font-semibold text-amber-900">
          Viewing {viewing.name}&apos;s data — read only
        </span>
      </div>
      <button
        onClick={() => setViewing(current)}
        className="rounded-full bg-amber-900 px-3 py-1 text-xs font-bold text-white hover:bg-amber-800"
      >
        Back to mine
      </button>
    </div>
  );
}
