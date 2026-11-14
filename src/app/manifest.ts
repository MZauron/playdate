import type { MetadataRoute } from "next";
import { enCA } from "@/lib/i18n/en-CA";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: enCA.app.name,
    short_name: enCA.app.name,
    description: enCA.app.description,
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6F8",
    theme_color: "#0B6B66",
    // Placeholder icon; real PNG icons come with T20 (Home Screen install).
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
