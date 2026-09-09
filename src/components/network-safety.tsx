"use client";
import { useEffect } from "react";
import { LogOut } from "lucide-react";
export function NetworkSafety() {
  useEffect(() => {
    const exit = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        window.location.replace("https://www.weather.gov/");
      }
    };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, []);
  return (
    <aside className="network-safety" aria-label="Safety and quick exit">
      <div>
        <strong>Your pace. Your choices.</strong>
        <span>
          Quick Exit opens a weather site. It does not erase history or stop
          device monitoring.
        </span>
      </div>
      <a
        className="button gold quick-exit"
        href="https://www.weather.gov/"
        rel="noreferrer"
        onClick={(event) => {
          event.preventDefault();
          window.location.replace("https://www.weather.gov/");
        }}
      >
        <LogOut size={18} /> Quick Exit <span className="exit-key">Esc</span>
      </a>
    </aside>
  );
}
