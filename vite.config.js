/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: { port: 3000, open: true },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.js"],
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    pool: "forks",
    testTimeout: 15000,
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{js,jsx}"],
      exclude: ["src/__tests__/**", "src/main.jsx"],
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase — split into firestore (largest) vs everything else
          if (id.includes("node_modules/@firebase/firestore") || id.includes("node_modules/firebase/firestore"))
            return "firebase-firestore";
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase"))
            return "firebase";
          if (id.includes("node_modules/motion") || id.includes("node_modules/motion-dom"))
            return "motion";
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler")
          ) return "react-vendor";
          if (id.includes("node_modules/lucide-react")) return "lucide";
          // xlsx is dynamically imported — let Vite auto-split it
          if (id.includes("node_modules/xlsx") || id.includes("node_modules/codepage"))
            return "xlsx";
          if (id.includes("node_modules/date-fns")) return "date-fns";
          if (id.includes("node_modules/@capacitor")) return "capacitor";
          if (id.includes("node_modules/@tauri-apps")) return "tauri";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
});
