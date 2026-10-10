import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RUTINA - Jadwal Pribadi dan Bersama",
    short_name: "RUTINA",
    description: "Jadwal pribadi dan bersama, rapi di satu tempat.",
    start_url: "/beranda",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#073693",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
