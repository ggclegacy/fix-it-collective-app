import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fix It Collective",
    short_name: "FIX IT",
    description: "Your visits. Your routine. Your collective.",
    start_url: "/account",
    display: "standalone",
    background_color: "#f5f6f7",
    theme_color: "#102b46",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
