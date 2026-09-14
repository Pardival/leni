import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leni",
    short_name: "Leni",
    description: "Capture. Laisse Leni ranger.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#b7502a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
