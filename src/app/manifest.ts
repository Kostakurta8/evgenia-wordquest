import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WordQuest: Задругата на думите",
    short_name: "WordQuest",
    description:
      "Научи 1177 думи от „Задругата на пръстена“ — пътешествие през Средната земя на английския език.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "bg",
    background_color: "#F4E9D0",
    theme_color: "#F4E9D0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
