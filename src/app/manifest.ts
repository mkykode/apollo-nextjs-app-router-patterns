import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest and linked from <head> automatically (file convention). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catstronauts: Apollo Client on the Next.js App Router",
    short_name: "Catstronauts",
    description: "Apollo Client 4 data-fetching patterns on the Next.js App Router",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      { src: "/logo192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
