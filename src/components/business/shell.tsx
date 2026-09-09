"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Users,
  LayoutDashboard,
  TrendingUp,
  Menu,
  Search,
  Plus,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/client";
const links = [
  ["/studio", "Today", LayoutDashboard],
  ["/studio/calendar", "Calendar", CalendarDays],
  ["/studio/clients", "Clients", Users],
  ["/studio/growth", "Growth", TrendingUp],
  ["/studio/more", "More", Menu],
] as const;
export function BusinessNav({
  contexts,
}: {
  contexts: { value: string; label: string }[];
}) {
  const path = usePathname(),
    router = useRouter();
  const query = useSearchParams();
  const context =
    query.get("context") ??
    (contexts.length === 1 ? contexts[0].value : "collective");
  return (
    <>
      <nav className="os-nav" aria-label="Business OS">
        <Link href="/studio" className="os-wordmark">
          <span>FIX IT COLLECTIVE</span>
          <strong>BUSINESS OS</strong>
        </Link>
        <div className="os-primary">
          {links.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={`${href}?context=${context}`}
              aria-current={path === href ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <Link
          href={`/studio/search?context=${context}`}
          className="os-search-link"
        >
          <Search size={18} />
          <span>Search Fix It</span>
          <kbd>⌘ K</kbd>
        </Link>
        <button
          aria-label="Sign out"
          className="icon-button"
          onClick={async () => {
            await api("/api/auth", { action: "logout" });
            router.push("/signin");
            router.refresh();
          }}
        >
          <LogOut size={17} />
        </button>
      </nav>
      <div className="os-context">
        <span>YOUR WORKSPACE</span>
        {contexts.map((c) => (
          <Link
            key={c.value}
            href={`/studio?context=${c.value}`}
            aria-current={context === c.value ? "true" : undefined}
          >
            {c.label}
          </Link>
        ))}
      </div>
      <Link className="os-quick" href="/studio/more#quick">
        <Plus size={20} />
        <span>Quick action</span>
      </Link>
      <SearchShortcut context={context} />
    </>
  );
}
import { useEffect } from "react";
function SearchShortcut({ context }: { context: string }) {
  const router = useRouter();
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        router.push(`/studio/search?context=${context}`);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [router, context]);
  return null;
}
