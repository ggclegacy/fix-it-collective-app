import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fix It Collective",
    short_name: "FIX IT",
    description: "Your visits. Your routine. Your collective.",
    start_url: "/account",
    display: "standalone",
    background_color: "#081520",
    theme_color: "#122a3c",
    icons: [], // Approved emblem required before installing a brand icon.
  };
}
