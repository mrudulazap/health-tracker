"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Heart, Settings } from "lucide-react";

const links = [
  { href: "/", label: "Today", icon: Home, color: "rose" },
  { href: "/charts", label: "Charts", icon: BarChart3, color: "amber" },
  { href: "/cycle", label: "Cycle", icon: Heart, color: "pink" },
  { href: "/settings", label: "Settings", icon: Settings, color: "stone" },
] as const;

const activeStyles: Record<string, string> = {
  rose: "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30",
  amber: "bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30",
  pink: "bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30",
  stone: "bg-stone-900 text-white shadow-lg shadow-stone-900/30",
};

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t-2 border-stone-900/5 bg-white/90 backdrop-blur-lg sm:relative sm:border-b-2 sm:border-t-0">
      <div className="mx-auto flex max-w-3xl items-center justify-around gap-1 px-3 py-2 sm:gap-2 sm:py-3">
        {links.map(({ href, label, icon: Icon, color }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 transition active:scale-95 sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 ${
                active
                  ? activeStyles[color]
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[11px] font-bold sm:text-sm">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
