"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Users,
  ChartNoAxesCombined,
  SlidersHorizontal,
  LayoutDashboard,
  UserRound,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/client";
export function WorkspaceNav({ staff = false }: { staff?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const links = staff
    ? ([
        ["/studio", "Today", LayoutDashboard],
        ["/studio/calendar", "Calendar", CalendarDays],
        ["/studio/clients", "Clients", Users],
        ["/studio/insights", "Insights", ChartNoAxesCombined],
        ["/studio/settings", "Availability", SlidersHorizontal],
      ] as const)
    : ([
        ["/account", "My visits", CalendarDays],
        ["/account/profile", "My profile", UserRound],
      ] as const);
  return (
    <nav
      className="workspace-nav"
      aria-label={staff ? "Studio navigation" : "Account navigation"}
    >
      <span className="workspace-label">
        {staff ? "THE STUDIO" : "YOUR SPACE"}
      </span>
      {links.map(([href, label, Icon]) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          className={path === href ? "active" : ""}
        >
          <Icon size={18} />
          {label}
        </Link>
      ))}
      <button
        onClick={async () => {
          await api("/api/auth", { action: "logout" });
          router.push("/signin");
          router.refresh();
        }}
        className="signout"
        aria-label="Sign out"
      >
        <LogOut size={17} />
        <span>Sign out</span>
      </button>
    </nav>
  );
}
