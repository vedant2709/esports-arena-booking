import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, forward /api/* to the backend so the browser sees everything as
    // same-origin (localhost:5173) → cookies + no CORS hassle.
    proxy: {
      "/api": "http://localhost:5001",
    },
  },
});
