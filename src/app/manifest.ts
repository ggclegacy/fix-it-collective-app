import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fix It Collective",
    short_name: "FIX IT",
    description: "Your visits. Your routine. Your collective.",
    start_url: "/account",
    display: "standalone",
    background_color: "#081520",
    theme_color: "#061a2c",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
